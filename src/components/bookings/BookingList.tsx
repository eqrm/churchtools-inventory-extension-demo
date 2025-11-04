import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { Button, Card, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconCalendarEvent, IconFilter, IconPlus, IconSearch } from '@tabler/icons-react';
import type { DataTableColumn } from 'mantine-datatable';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '../../hooks/useBookings';
import { useDataViewState } from '../../hooks/useDataViewState';
import { DataViewLayout } from '../dataView/DataViewLayout';
import { DataViewTable } from '../dataView/DataViewTable';
import { ListLoadingSkeleton } from '../common/ListLoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { PersonAvatar } from '../common/PersonAvatar';
import { BookingStatusBadge } from './BookingStatusBadge';
import DateField from '../common/DateField';
import type { Booking, BookingFilters, BookingStatus } from '../../types/entities';
import { bookingStrings } from '../../i18n/bookingStrings';

const BOOKING_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const BOOKING_PAGE_SIZE_STORAGE_KEY = 'booking-list-page-size';
const DEFAULT_BOOKING_PAGE_SIZE = 20;

type BookingViewFilters = BookingFilters & {
  search?: string;
};

interface BookingListProps {
  onBookingClick?: (bookingId: string) => void;
  onCreateClick?: () => void;
  initialFilters?: BookingFilters;
}

interface BookingFilterPanelProps {
  filters: BookingViewFilters;
  onFiltersChange: (updater: SetStateAction<BookingViewFilters>) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  allBookings: Booking[];
}

function createPersonOptions(bookings: Booking[], type: 'bookedBy' | 'bookingFor') {
  const map = new Map<string, { value: string; label: string }>();

  for (const booking of bookings) {
    if (type === 'bookedBy' && booking.bookedById && booking.bookedByName) {
      map.set(booking.bookedById, {
        value: booking.bookedById,
        label: booking.bookedByName,
      });
    }

    if (type === 'bookingFor' && booking.bookingForId && booking.bookingForName) {
      map.set(booking.bookingForId, {
        value: booking.bookingForId,
        label: booking.bookingForName,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function getActiveBookingFilterCount(filters: BookingViewFilters): number {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.status && (Array.isArray(filters.status) ? filters.status.length > 0 : true)) count += 1;
  if (filters.bookedById) count += 1;
  if (filters.bookingForId) count += 1;
  if (filters.assetId) count += 1;
  if (filters.kitId) count += 1;
  if (filters.requestedBy) count += 1;
  if (filters.dateRange?.start && filters.dateRange?.end) count += 1;
  return count;
}

function BookingFilterPanel({
  filters,
  onFiltersChange,
  hasActiveFilters,
  onResetFilters,
  allBookings,
}: BookingFilterPanelProps) {
  const [localStart, setLocalStart] = useState(filters.dateRange?.start ?? '');
  const [localEnd, setLocalEnd] = useState(filters.dateRange?.end ?? '');

  useEffect(() => {
    setLocalStart(filters.dateRange?.start ?? '');
    setLocalEnd(filters.dateRange?.end ?? '');
  }, [filters.dateRange]);

  const bookingForOptions = useMemo(() => createPersonOptions(allBookings, 'bookingFor'), [allBookings]);
  const bookedByOptions = useMemo(() => createPersonOptions(allBookings, 'bookedBy'), [allBookings]);

  const statusOptions = useMemo(
    () =>
      Object.entries(bookingStrings.status).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const handleStartChange = (iso?: string) => {
    const nextStart = iso ?? '';
    setLocalStart(nextStart);

    onFiltersChange((previous) => {
      if (nextStart && localEnd) {
        return {
          ...previous,
          dateRange: { start: nextStart, end: localEnd },
        };
      }

      const { dateRange: _removed, ...rest } = previous;
      return rest;
    });
  };

  const handleEndChange = (iso?: string) => {
    const nextEnd = iso ?? '';
    setLocalEnd(nextEnd);

    onFiltersChange((previous) => {
      if (localStart && nextEnd) {
        return {
          ...previous,
          dateRange: { start: localStart, end: nextEnd },
        };
      }

      const { dateRange: _removed, ...rest } = previous;
      return rest;
    });
  };

  return (
    <Stack gap="md">
      <Group align="flex-end" gap="md" wrap="wrap">
        <TextInput
          label="Suche"
          placeholder="Search bookings"
          leftSection={<IconSearch size={16} />}
          value={filters.search ?? ''}
          onChange={(event) => {
            const value = event.currentTarget.value;
            onFiltersChange((previous) => ({
              ...previous,
              search: value ? value : undefined,
            }));
          }}
          style={{ flex: 1, minWidth: 220 }}
        />

        <Select
          label="Status"
          placeholder="All statuses"
          leftSection={<IconFilter size={16} />}
          data={statusOptions}
          value={Array.isArray(filters.status) ? filters.status[0] ?? null : filters.status ?? null}
          onChange={(value) => {
            onFiltersChange((previous) => ({
              ...previous,
              status: value ? (value as BookingStatus) : undefined,
            }));
          }}
          clearable
          searchable
        />

        <Select
          label="Booked By"
          placeholder="All users"
          leftSection={<IconFilter size={16} />}
          data={bookedByOptions}
          value={filters.bookedById ?? null}
          onChange={(value) => {
            onFiltersChange((previous) => ({
              ...previous,
              bookedById: value ?? undefined,
            }));
          }}
          clearable
          searchable
        />

        <Select
          label="Booked For"
          placeholder="All users"
          leftSection={<IconFilter size={16} />}
          data={bookingForOptions}
          value={filters.bookingForId ?? null}
          onChange={(value) => {
            onFiltersChange((previous) => ({
              ...previous,
              bookingForId: value ?? undefined,
            }));
          }}
          clearable
          searchable
        />
      </Group>

      <Group align="flex-end" gap="md" wrap="wrap">
        <DateField
          label="Start"
          placeholder="Start date"
          value={localStart}
          onChange={handleStartChange}
        />
        <DateField
          label="Ende"
          placeholder="End date"
          value={localEnd}
          onChange={handleEndChange}
        />

        {hasActiveFilters && (
          <Button variant="subtle" onClick={onResetFilters}>
            Filter zurücksetzen
          </Button>
        )}
      </Group>
    </Stack>
  );
}

export function BookingList({ onBookingClick, onCreateClick, initialFilters }: BookingListProps) {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(true);

  const initialViewFilters = useMemo<BookingViewFilters>(
    () => ({
      ...(initialFilters ?? {}),
    }),
    [initialFilters],
  );

  const {
    viewMode,
    setViewMode,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
  } = useDataViewState<BookingViewFilters>({
    storageKey: 'booking-data-view',
    initialFilters: initialViewFilters,
    initialFiltersKey: JSON.stringify(initialFilters ?? {}),
    defaultMode: 'table',
    defaultPageSize: DEFAULT_BOOKING_PAGE_SIZE,
    pageSizeOptions: BOOKING_PAGE_SIZE_OPTIONS,
    pageSizeStorageKey: BOOKING_PAGE_SIZE_STORAGE_KEY,
    getActiveFilterCount: getActiveBookingFilterCount,
  });

  const setFiltersAndResetPage = useCallback(
    (updater: React.SetStateAction<BookingViewFilters>) => {
      if (typeof updater === 'function') {
        setFilters((previous) => updater(previous));
      } else {
        setFilters(updater);
      }
      setPage(1);
    },
    [setFilters, setPage],
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setPage(1);
  }, [resetFilters, setPage]);

  const bookingQueryFilters = useMemo<BookingFilters>(() => {
    const { search: _search, ...rest } = filters;
    return rest;
  }, [filters]);

  const {
    data: bookings = [],
    isLoading,
    error,
  } = useBookings(bookingQueryFilters);

  const filteredBookings = useMemo(() => {
    const query = filters.search?.trim().toLowerCase();
    const statusFilter = filters.status;
    const statusValues = Array.isArray(statusFilter)
      ? statusFilter
      : statusFilter
        ? [statusFilter]
        : undefined;

    return bookings.filter((booking) => {
      if (statusValues && !statusValues.includes(booking.status)) {
        return false;
      }

      if (filters.bookedById && booking.bookedById !== filters.bookedById) {
        return false;
      }

      if (filters.bookingForId && booking.bookingForId !== filters.bookingForId) {
        return false;
      }

      if (filters.assetId && booking.asset?.id !== filters.assetId) {
        return false;
      }

      if (filters.kitId && booking.kit?.id !== filters.kitId) {
        return false;
      }

      if (filters.requestedBy && booking.requestedBy !== filters.requestedBy) {
        return false;
      }

      if (filters.dateRange?.start && filters.dateRange?.end) {
        const bookingStart = new Date(booking.startDate).getTime();
        const bookingEnd = new Date(booking.endDate).getTime();
        const filterStart = new Date(filters.dateRange.start).getTime();
        const filterEnd = new Date(filters.dateRange.end).getTime();
        if (Number.isFinite(bookingStart) && Number.isFinite(bookingEnd)) {
          const overlaps = bookingStart <= filterEnd && bookingEnd >= filterStart;
          if (!overlaps) {
            return false;
          }
        }
      }

      if (!query) {
        return true;
      }

      const haystack = [
        booking.asset?.name,
        booking.asset?.assetNumber,
        booking.purpose,
        booking.requestedByName,
        booking.bookingForName,
        booking.bookedByName,
      ];

      return haystack
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [bookings, filters]);

  const totalRecords = filteredBookings.length;

  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredBookings.slice(start, end);
  }, [filteredBookings, page, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, totalRecords, setPage]);

  const columns = useMemo<DataTableColumn<Booking>[]>(
    () => [
      { accessor: 'asset.assetNumber', title: 'Asset Number', sortable: true },
      { accessor: 'asset.name', title: 'Asset', sortable: true },
      {
        accessor: 'startDate',
        title: 'From',
        sortable: true,
        render: (booking) => new Date(booking.startDate).toLocaleDateString('en-US'),
      },
      {
        accessor: 'endDate',
        title: 'To',
        sortable: true,
        render: (booking) => new Date(booking.endDate).toLocaleDateString('en-US'),
      },
      { accessor: 'purpose', title: 'Purpose' },
      {
        accessor: 'bookedByName',
        title: 'Booked By',
        sortable: true,
        render: (booking) => (
          <PersonAvatar
            personId={booking.bookedById}
            name={booking.bookedByName || booking.requestedByName}
            size="xs"
            textSize="sm"
            maxWidth={160}
          />
        ),
      },
      {
        accessor: 'bookingForName',
        title: 'Booked For',
        sortable: true,
        render: (booking) => (
          <PersonAvatar
            personId={booking.bookingForId}
            name={booking.bookingForName || booking.requestedByName}
            size="xs"
            textSize="sm"
            maxWidth={160}
          />
        ),
      },
      {
        accessor: 'status',
        title: 'Status',
        sortable: true,
        render: (booking) => <BookingStatusBadge status={booking.status} />,
      },
    ],
    [],
  );

  const handleBookingRowClick = useCallback(
    (booking: Booking) => {
      if (onBookingClick) {
        onBookingClick(booking.id);
        return;
      }

      navigate(`/bookings/${booking.id}`);
    },
    [navigate, onBookingClick],
  );

  const primaryAction = onCreateClick
    ? {
        label: 'Neue Buchung',
        icon: <IconPlus size={16} />,
        onClick: onCreateClick,
      }
    : undefined;

  const filterContent = (
    <BookingFilterPanel
      filters={filters}
      onFiltersChange={setFiltersAndResetPage}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={handleResetFilters}
      allBookings={bookings}
    />
  );

  let tableViewContent: JSX.Element;

  if (error) {
    tableViewContent = (
      <Card withBorder>
        <Text c="red">Fehler beim Laden der Buchungen</Text>
      </Card>
    );
  } else if (isLoading) {
    tableViewContent = (
      <Card withBorder>
        <ListLoadingSkeleton rows={pageSize} height={60} />
      </Card>
    );
  } else if (totalRecords === 0) {
    tableViewContent = (
      <EmptyState
        title={bookingStrings.messages.noBookingsFound}
        message={hasActiveFilters ? bookingStrings.messages.noBookingsMatchFilters : bookingStrings.messages.createFirstBooking}
        icon={<IconCalendarEvent size={48} stroke={1.5} />}
        action={
          onCreateClick ? (
            <Button leftSection={<IconPlus size={16} />} onClick={onCreateClick}>
              {bookingStrings.messages.createFirstBookingButton}
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    tableViewContent = (
      <Card withBorder>
        <DataViewTable<Booking>
          records={paginatedBookings}
          columns={columns}
          totalRecords={totalRecords}
          recordsPerPage={pageSize}
          recordsPerPageOptions={pageSizeOptions}
          page={page}
          onPageChange={setPage}
          onRecordsPerPageChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
          onRowClick={({ record }) => handleBookingRowClick(record)}
          highlightOnHover
          rowStyle={() => ({ cursor: 'pointer' })}
          paginationText={({ from, to, totalRecords: total }) => `Showing ${from} to ${to} of ${total} bookings`}
          noRecordsText={hasActiveFilters ? bookingStrings.messages.noBookingsMatchFilters : bookingStrings.messages.noBookingsFound}
        />
      </Card>
    );
  }

  return (
    <DataViewLayout
      title="Buchungen"
      mode={viewMode}
      availableModes={['table']}
      onModeChange={setViewMode}
      filtersOpen={filtersOpen}
      onToggleFilters={() => setFiltersOpen((previous) => !previous)}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      primaryAction={primaryAction}
      filterContent={filterContent}
      tableView={tableViewContent}
    />
  );
}
