import type {
  Booking,
  BookingCreate,
  BookingFilters,
  BookingUpdate,
  ConditionAssessment,
} from '../../../types/entities'
import type { GroupBookingCreate, GroupBookingResult } from '../../../types/storage'
import {
  cancelBooking as cancelBookingHandler,
  checkIn as checkInHandler,
  checkOut as checkOutHandler,
  createBooking as createBookingHandler,
  createGroupBooking as createGroupBookingHandler,
  deleteBooking as deleteBookingHandler,
  getBooking as getBookingHandler,
  getBookings as getBookingsHandler,
  getBookingsForAsset as getBookingsForAssetHandler,
  isAssetAvailable as isAssetAvailableHandler,
  updateBooking as updateBookingHandler,
  type BookingDependencies,
} from './bookings'
import { ChurchToolsStorageProvider } from './core'

declare module './core' {
  interface ChurchToolsStorageProvider {
    getBookings(filters?: BookingFilters): Promise<Booking[]>
    getBooking(id: string): Promise<Booking | null>
    getBookingsForAsset(assetId: string, dateRange?: { start: string; end: string }): Promise<Booking[]>
    createBooking(data: BookingCreate): Promise<Booking>
    createGroupBooking(request: GroupBookingCreate): Promise<GroupBookingResult>
    updateBooking(id: string, data: BookingUpdate): Promise<Booking>
    deleteBooking(id: string): Promise<void>
    cancelBooking(id: string, reason?: string): Promise<void>
    isAssetAvailable(assetId: string, startDate: string, endDate: string): Promise<boolean>
    checkOut(bookingId: string, conditionAssessment?: ConditionAssessment): Promise<Booking>
    checkIn(bookingId: string, conditionAssessment: ConditionAssessment): Promise<Booking>
  }
}

type ProviderWithBookingSupport = ChurchToolsStorageProvider & {
  getAsset: (id: string) => Promise<import('../../../types/entities').Asset>
  updateAsset: (
    id: string,
    data: import('../../../types/entities').AssetUpdate,
  ) => Promise<import('../../../types/entities').Asset>
  getAssetGroup: (id: string) => Promise<import('../../../types/entities').AssetGroup | null>
  getPersonInfo: (personId: string) => Promise<import('../../../types/entities').PersonInfo>
}

function getBookingDependencies(provider: ProviderWithBookingSupport): BookingDependencies {
  return {
    moduleId: provider.moduleId,
    apiClient: provider.apiClient,
    getAllAssetTypesIncludingHistory: provider.getAllAssetTypesIncludingHistory.bind(provider),
    mapToAssetType: provider.mapToAssetType.bind(provider),
    recordChange: provider.recordChange.bind(provider),
    valuesAreEqual: provider.valuesAreEqual.bind(provider),
    formatFieldValue: provider.formatFieldValue.bind(provider),
    getAsset: provider.getAsset.bind(provider),
    updateAsset: provider.updateAsset.bind(provider),
    getAssetGroup: provider.getAssetGroup.bind(provider),
    getPersonInfo: provider.getPersonInfo.bind(provider),
  }
}

ChurchToolsStorageProvider.prototype.getBookings = async function getBookings(
  this: ProviderWithBookingSupport,
  filters?: BookingFilters,
): Promise<Booking[]> {
  return getBookingsHandler(getBookingDependencies(this), filters)
}

ChurchToolsStorageProvider.prototype.getBooking = async function getBooking(
  this: ProviderWithBookingSupport,
  id: string,
): Promise<Booking | null> {
  return getBookingHandler(getBookingDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.getBookingsForAsset = async function getBookingsForAsset(
  this: ProviderWithBookingSupport,
  assetId: string,
  dateRange?: { start: string; end: string },
): Promise<Booking[]> {
  return getBookingsForAssetHandler(getBookingDependencies(this), assetId, dateRange)
}

ChurchToolsStorageProvider.prototype.createBooking = async function createBooking(
  this: ProviderWithBookingSupport,
  data: BookingCreate,
): Promise<Booking> {
  return createBookingHandler(getBookingDependencies(this), data)
}

ChurchToolsStorageProvider.prototype.createGroupBooking = async function createGroupBooking(
  this: ProviderWithBookingSupport,
  request: GroupBookingCreate,
): Promise<GroupBookingResult> {
  return createGroupBookingHandler(getBookingDependencies(this), request)
}

ChurchToolsStorageProvider.prototype.updateBooking = async function updateBooking(
  this: ProviderWithBookingSupport,
  id: string,
  data: BookingUpdate,
): Promise<Booking> {
  return updateBookingHandler(getBookingDependencies(this), id, data)
}

ChurchToolsStorageProvider.prototype.deleteBooking = async function deleteBooking(
  this: ProviderWithBookingSupport,
  id: string,
): Promise<void> {
  await deleteBookingHandler(getBookingDependencies(this), id)
}

ChurchToolsStorageProvider.prototype.cancelBooking = async function cancelBooking(
  this: ProviderWithBookingSupport,
  id: string,
  reason?: string,
): Promise<void> {
  await cancelBookingHandler(getBookingDependencies(this), id, reason)
}

ChurchToolsStorageProvider.prototype.isAssetAvailable = async function isAssetAvailable(
  this: ProviderWithBookingSupport,
  assetId: string,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  return isAssetAvailableHandler(getBookingDependencies(this), assetId, startDate, endDate)
}

ChurchToolsStorageProvider.prototype.checkOut = async function checkOut(
  this: ProviderWithBookingSupport,
  bookingId: string,
  conditionAssessment?: ConditionAssessment,
): Promise<Booking> {
  return checkOutHandler(getBookingDependencies(this), bookingId, conditionAssessment)
}

ChurchToolsStorageProvider.prototype.checkIn = async function checkIn(
  this: ProviderWithBookingSupport,
  bookingId: string,
  conditionAssessment: ConditionAssessment,
): Promise<Booking> {
  return checkInHandler(getBookingDependencies(this), bookingId, conditionAssessment)
}
