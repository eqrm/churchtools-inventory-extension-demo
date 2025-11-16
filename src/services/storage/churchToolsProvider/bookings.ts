import type { ChurchToolsAPIClient } from '../../api/ChurchToolsAPIClient';
import type {
  Asset,
  AssetType,
  AssetGroup,
  AssetUpdate,
  Booking,
  BookingCreate,
  BookingFilters,
  BookingUpdate,
  ChangeHistoryEntry,
  ConditionAssessment,
  PersonInfo,
} from '../../../types/entities';
import type { GroupBookingCreate, GroupBookingResult } from '../../../types/storage';
import { CURRENT_SCHEMA_VERSION } from '../../migrations/constants';

export interface BookingDependencies {
  moduleId: string;
  apiClient: ChurchToolsAPIClient;
  getAllAssetTypesIncludingHistory(): Promise<AssetType[]>;
  mapToAssetType(data: unknown): AssetType;
  recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'changedAt'>): Promise<void>;
  valuesAreEqual(a: unknown, b: unknown): boolean;
  formatFieldValue(value: unknown): string;
  getAsset(id: string): Promise<Asset>;
  updateAsset(id: string, data: AssetUpdate): Promise<Asset>;
  getAssetGroup(id: string): Promise<AssetGroup | null>;
  getPersonInfo(personId: string): Promise<PersonInfo>;
}

export async function getBookings(
  deps: BookingDependencies,
  filters?: BookingFilters,
): Promise<Booking[]> {
  const assetType = await getBookingAssetType(deps);
  const values = await deps.apiClient.getDataValues(deps.moduleId, assetType.id);
  let bookings = values.map((value: unknown) => mapToBooking(value));

  if (!filters) {
    return bookings;
  }

  if (filters.assetId) {
    bookings = bookings.filter((booking) => booking.asset?.id === filters.assetId);
  }

  if (filters.kitId) {
    bookings = bookings.filter((booking) => booking.kit?.id === filters.kitId);
  }

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    bookings = bookings.filter((booking) => statuses.includes(booking.status));
  }

  if (filters.requestedBy) {
    bookings = bookings.filter((booking) => booking.requestedBy === filters.requestedBy);
  }

  if (filters.dateRange) {
    const rangeStart = new Date(filters.dateRange.start);
    const rangeEnd = new Date(filters.dateRange.end);
    bookings = bookings.filter((booking) => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      return bookingStart <= rangeEnd && bookingEnd >= rangeStart;
    });
  }

  return bookings;
}

export async function getBooking(
  deps: BookingDependencies,
  id: string,
): Promise<Booking | null> {
  const bookings = await getBookings(deps);
  return bookings.find((booking) => booking.id === id) ?? null;
}

export async function getBookingsForAsset(
  deps: BookingDependencies,
  assetId: string,
  dateRange?: { start: string; end: string },
): Promise<Booking[]> {
  const filters: BookingFilters = { assetId };
  if (dateRange) {
    filters.dateRange = dateRange;
  }
  return getBookings(deps, filters);
}

export async function createBooking(
  deps: BookingDependencies,
  data: BookingCreate,
): Promise<Booking> {
  const user = await deps.apiClient.getCurrentUser();
  const assetType = await getBookingAssetType(deps);

  await validateBookingCreate(deps, data);
  const bookingData = await prepareBookingData(deps, data);

  const payload = {
    dataCategoryId: Number(assetType.id),
    value: JSON.stringify(bookingData),
  };

  try {
  const created = await deps.apiClient.createDataValue(deps.moduleId, assetType.id, payload);
    const booking = mapToBooking(created);

    await deps.recordChange({
      entityType: 'booking',
      entityId: booking.id,
      action: 'created',
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });

    return booking;
  } catch (error) {
    console.error('[ChurchToolsProvider] Failed to create booking:', error);
    console.error('[ChurchToolsProvider] Booking data that failed:', bookingData);
    throw error;
  }
}

export async function createGroupBooking(
  deps: BookingDependencies,
  request: GroupBookingCreate,
): Promise<GroupBookingResult> {
  const group = await deps.getAssetGroup(request.groupId);
  if (!group) {
    throw new Error(`Asset group ${request.groupId} not found`);
  }

  const uniqueAssetIds = Array.from(new Set(request.assetIds));
  const allowedMembers = new Set(group.memberAssetIds);
  const result: GroupBookingResult = { successes: [], failures: [] };

  for (const assetId of uniqueAssetIds) {
    if (!allowedMembers.has(assetId)) {
      result.failures.push({ assetId, error: 'Asset is not a member of this group' });
      if (request.stopOnError) {
        break;
      }
      continue;
    }

    const asset = await deps.getAsset(assetId);
    if (!asset) {
      result.failures.push({ assetId, error: 'Asset not found' });
      if (request.stopOnError) {
        break;
      }
      continue;
    }

    const bookingPayload: BookingCreate = {
      ...request.booking,
      asset: {
        id: asset.id,
        assetNumber: asset.assetNumber,
        name: asset.name,
      },
      kit: undefined,
      quantity: 1,
      allocatedChildAssets: undefined,
    };

    try {
      const booking = await createBooking(deps, bookingPayload);
      result.successes.push({ assetId, booking });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create booking';
      result.failures.push({ assetId, error: message });
      if (request.stopOnError) {
        break;
      }
    }
  }

  return result;
}

export async function updateBooking(
  deps: BookingDependencies,
  id: string,
  data: BookingUpdate,
): Promise<Booking> {
  const user = await deps.apiClient.getCurrentUser();
  const assetType = await getBookingAssetType(deps);
  const existing = await getBooking(deps, id);

  if (!existing) {
    throw new Error(`Booking with ID ${id} not found`);
  }

  const updatedData = {
    ...existing,
    ...data,
    lastModifiedAt: new Date().toISOString(),
    schemaVersion: data.schemaVersion ?? existing.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  };

  const payload = {
    id: Number(id),
    dataCategoryId: Number(assetType.id),
    value: JSON.stringify(updatedData),
  };

  const updated = await deps.apiClient.updateDataValue(deps.moduleId, assetType.id, id, payload);
  const booking = mapToBooking(updated);

  const changes: NonNullable<ChangeHistoryEntry['changes']> = [];
  for (const [field, newValue] of Object.entries(data)) {
    const oldValue = existing[field as keyof Booking];
    if (!deps.valuesAreEqual(oldValue, newValue)) {
      const formattedOld = deps.formatFieldValue(oldValue);
      const formattedNew = deps.formatFieldValue(newValue);
      if (formattedOld !== formattedNew) {
        changes.push({
          field,
          oldValue: formattedOld,
          newValue: formattedNew,
        });
      }
    }
  }

  if (changes.length > 0) {
    await deps.recordChange({
      entityType: 'booking',
      entityId: id,
      action: 'updated',
      changes,
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });
  }

  return booking;
}

export async function deleteBooking(
  deps: BookingDependencies,
  id: string,
): Promise<void> {
  const booking = await getBooking(deps, id);
  if (!booking) {
    return;
  }

  const assetType = await getBookingAssetType(deps);
  const user = await deps.apiClient.getCurrentUser();

  try {
    await deps.apiClient.deleteDataValue(deps.moduleId, assetType.id, id);
  } catch (error) {
    console.error('[ChurchToolsProvider] Failed to delete booking:', error);
    throw error;
  }

  if (booking.asset?.id) {
    try {
      await deps.updateAsset(booking.asset.id, {
        status: 'available',
        inUseBy: undefined,
      });
    } catch (assetError) {
      console.warn('[ChurchToolsProvider] Failed to reset asset after booking deletion:', assetError);
    }
  }

  await deps.recordChange({
    entityType: 'booking',
    entityId: id,
    action: 'deleted',
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

export async function cancelBooking(
  deps: BookingDependencies,
  id: string,
  reason?: string,
): Promise<void> {
  const booking = await getBooking(deps, id);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === 'completed') {
    throw new Error('Completed bookings cannot be cancelled');
  }

  if (booking.status === 'cancelled') {
    throw new Error('Booking is already cancelled');
  }

  if (booking.status === 'active' && booking.asset) {
    await deps.updateAsset(booking.asset.id, {
      status: 'available',
      inUseBy: undefined,
    });
  }

  const user = await deps.apiClient.getCurrentUser();
  await updateBooking(deps, id, { status: 'cancelled' });

  const changes: NonNullable<ChangeHistoryEntry['changes']> = [
    {
      field: 'status',
      oldValue: booking.status,
      newValue: 'cancelled',
    },
  ];

  if (reason) {
    changes.push({
      field: 'cancellationReason',
      oldValue: '',
      newValue: reason,
    });
  }

  await deps.recordChange({
    entityType: 'booking',
    entityId: id,
    action: 'updated',
    changes,
    changedBy: user.id,
    changedByName: `${user.firstName} ${user.lastName}`,
  });
}

export async function isAssetAvailable(
  deps: BookingDependencies,
  assetId: string,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const bookings = await getBookingsForAsset(deps, assetId, { start: startDate, end: endDate });
  const conflicting = bookings.filter(
    (booking) => booking.status === 'approved' || booking.status === 'active',
  );
  return conflicting.length === 0;
}

export async function checkOut(
  deps: BookingDependencies,
  bookingId: string,
  conditionAssessment?: unknown,
): Promise<Booking> {
  const user = await deps.apiClient.getCurrentUser();
  const booking = await getBooking(deps, bookingId);

  if (!booking) {
    throw new Error(`Booking with ID ${bookingId} not found`);
  }

  if (booking.status !== 'approved') {
    throw new Error('Can only check out approved bookings');
  }

  const updated = await updateBooking(deps, bookingId, {
    status: 'active',
    checkedOutAt: new Date().toISOString(),
    checkedOutBy: user.id,
    checkedOutByName: `${user.firstName} ${user.lastName}`,
    conditionOnCheckOut: conditionAssessment as ConditionAssessment | undefined,
  });

  if (booking.asset) {
    await deps.updateAsset(booking.asset.id, {
      status: 'in-use',
      inUseBy: {
        personId: user.id,
        personName: `${user.firstName} ${user.lastName}`,
        since: new Date().toISOString(),
      },
    });
  }

  return updated;
}

export async function checkIn(
  deps: BookingDependencies,
  bookingId: string,
  conditionAssessment: unknown,
): Promise<Booking> {
  const user = await deps.apiClient.getCurrentUser();
  const booking = await getBooking(deps, bookingId);

  if (!booking) {
    throw new Error(`Booking with ID ${bookingId} not found`);
  }

  if (booking.status !== 'active') {
    throw new Error('Can only check in active bookings');
  }

  const condition = conditionAssessment as { rating: string; notes?: string; photos?: string[] };
  const damageReported = condition.rating === 'damaged' || condition.rating === 'poor';

  const updated = await updateBooking(deps, bookingId, {
    status: 'completed',
    checkedInAt: new Date().toISOString(),
    checkedInBy: user.id,
    checkedInByName: `${user.firstName} ${user.lastName}`,
    conditionOnCheckIn: conditionAssessment as ConditionAssessment,
    damageReported,
    damageNotes: damageReported ? condition.notes : undefined,
  });

  if (booking.asset) {
    await deps.updateAsset(booking.asset.id, {
      status: damageReported ? 'broken' : 'available',
      inUseBy: undefined,
    });
  }

  return updated;
}

async function getBookingAssetType(deps: BookingDependencies): Promise<AssetType> {
  const assetTypes = await deps.getAllAssetTypesIncludingHistory();
  let bookingAssetType = assetTypes.find((assetType) => assetType.name === '__Bookings__');

  if (!bookingAssetType) {
    const user = await deps.apiClient.getCurrentUser();
    const payload = {
      customModuleId: Number(deps.moduleId),
      name: '__Bookings__',
      shorty: 'bookings' + Date.now().toString().slice(-4),
      description: 'System category for equipment bookings',
      data: null,
    };

    const created = await deps.apiClient.createDataCategory(deps.moduleId, payload);
    bookingAssetType = deps.mapToAssetType(created);

    await deps.recordChange({
      entityType: 'category',
      entityId: bookingAssetType.id,
      action: 'created',
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName}`,
    });
  }

  return bookingAssetType;
}

function mapToBooking(value: unknown): Booking {
  const raw = value as Record<string, unknown>;
  const dataStr = (raw['value'] || raw['data']) as string | null;
  const data = dataStr ? (JSON.parse(dataStr) as Record<string, unknown>) : {};

  return {
    id: raw['id']?.toString() ?? '',
    asset: (data['asset'] as Booking['asset']) ?? { id: '', assetNumber: '', name: '' },
    kit: data['kit'] as Booking['kit'],
    startDate: (data['startDate'] as string) ?? '',
    endDate: (data['endDate'] as string) ?? '',
    purpose: (data['purpose'] as string) ?? '',
    notes: data['notes'] as string | undefined,
    status: (data['status'] as Booking['status']) ?? 'pending',
    bookedById: (data['bookedById'] as string) ?? (data['requestedBy'] as string) ?? '',
    bookedByName: (data['bookedByName'] as string) ?? (data['requestedByName'] as string) ?? '',
    bookingForId: (data['bookingForId'] as string) ?? (data['requestedBy'] as string) ?? '',
    bookingForName: (data['bookingForName'] as string) ?? (data['requestedByName'] as string) ?? '',
    bookingMode: (data['bookingMode'] as Booking['bookingMode']) ?? 'date-range',
    date: data['date'] as string | undefined,
    startTime: data['startTime'] as string | undefined,
    endTime: data['endTime'] as string | undefined,
    requestedBy: (data['requestedBy'] as string) ?? (data['bookedById'] as string) ?? '',
    requestedByName: (data['requestedByName'] as string) ?? (data['bookedByName'] as string) ?? '',
    approvedBy: data['approvedBy'] as string | undefined,
    approvedByName: data['approvedByName'] as string | undefined,
    checkedOutAt: data['checkedOutAt'] as string | undefined,
    checkedOutBy: data['checkedOutBy'] as string | undefined,
    checkedOutByName: data['checkedOutByName'] as string | undefined,
    checkedInAt: data['checkedInAt'] as string | undefined,
    checkedInBy: data['checkedInBy'] as string | undefined,
    checkedInByName: data['checkedInByName'] as string | undefined,
    conditionOnCheckOut: data['conditionOnCheckOut'] as ConditionAssessment | undefined,
    conditionOnCheckIn: data['conditionOnCheckIn'] as ConditionAssessment | undefined,
    damageReported: data['damageReported'] as boolean | undefined,
    damageNotes: data['damageNotes'] as string | undefined,
    createdAt:
      (data['createdAt'] as string) ?? (raw['created_at'] as string) ?? new Date().toISOString(),
    lastModifiedAt:
      (data['lastModifiedAt'] as string) ?? (raw['modified_at'] as string) ?? new Date().toISOString(),
    schemaVersion: data['schemaVersion'] as string | undefined,
  };
}

async function validateBookingCreate(
  deps: BookingDependencies,
  data: BookingCreate,
): Promise<void> {
  if (!data.asset || !data.asset.id) {
    throw new Error('Asset reference is required');
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (data.bookingMode === 'date-range' && end <= start) {
    throw new Error('End date must be after the start date');
  }

  if (data.bookingMode === 'single-day' && end < start) {
    throw new Error('End date must be after the start date');
  }

  const asset = await deps.getAsset(data.asset.id);
  if (!asset) {
    throw new Error('Asset not found');
  }

  if (asset.status === 'broken' || asset.status === 'sold' || asset.status === 'destroyed') {
    throw new Error(`Asset cannot be booked (status: ${asset.status})`);
  }

  const available = await isAssetAvailable(deps, data.asset.id, data.startDate, data.endDate);
  if (!available) {
    throw new Error('Asset is not available for the selected timeframe');
  }
}

async function resolvePersonName(
  deps: BookingDependencies,
  personId: string | undefined,
  fallbackName: string,
): Promise<string> {
  if (!personId) {
    return fallbackName;
  }

  try {
    const person = await deps.getPersonInfo(personId);
    return `${person.firstName} ${person.lastName}`;
  } catch (error) {
    console.warn('Failed to fetch person info, using provided name:', error);
    return fallbackName;
  }
}

async function prepareBookingData(
  deps: BookingDependencies,
  data: BookingCreate,
): Promise<Record<string, unknown>> {
  if (!data.asset || !data.asset.id) {
    throw new Error('Asset is required');
  }

  const fallbackName = data.requestedByName || data.bookedByName || data.bookingForName || 'Unknown';
  const requestedById = data.requestedBy ?? data.bookedById ?? data.bookingForId;

  const requestedByName = await resolvePersonName(deps, requestedById, fallbackName);
  const bookedByName = data.bookedByName ?? requestedByName;
  const bookingForName = data.bookingForName ?? requestedByName;

  return {
    asset: {
      id: data.asset.id,
      assetNumber: data.asset.assetNumber || '',
      name: data.asset.name || '',
    },
    kit: data.kit
      ? {
          id: data.kit.id,
          name: data.kit.name,
        }
      : undefined,
    bookingMode: data.bookingMode ?? 'date-range',
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    startDate: data.startDate,
    endDate: data.endDate,
    purpose: data.purpose,
    notes: data.notes,
    status: data.status ?? 'pending',
    bookedById: data.bookedById ?? requestedById ?? '',
    bookedByName,
    bookingForId: data.bookingForId ?? requestedById ?? '',
    bookingForName,
    requestedBy: requestedById ?? data.requestedBy ?? '',
    requestedByName,
    schemaVersion: data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
  };
}
