/**
 * BookingHistoryReport Component (T206)
 * 
 * Displays booking trends over time and popular assets.
 */

import { useState } from 'react';
import { Paper, Title, Group, Button, Stack, Text, Loader, SimpleGrid } from '@mantine/core';
import DateRangeCalendar from '../common/DateRangeCalendar'
import { DataTable } from 'mantine-datatable';
import { IconDownload } from '@tabler/icons-react';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAssets } from '../../hooks/useAssets';
import { useBookings } from '../../hooks/useBookings';
import { aggregateBookingHistory } from '../../utils/reportCalculations';
import { exportBookingHistoryToCSV } from '../../utils/exportCSV';

/**
 * Booking statistics summary
 */
function BookingStats({ data }: { data: ReturnType<typeof aggregateBookingHistory> }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center">{data.totalBookings}</Text>
        <Text ta="center" c="dimmed" size="sm">Total bookings</Text>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center" c="blue">{data.activeBookings}</Text>
        <Text ta="center" c="dimmed" size="sm">Active</Text>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center" c="green">{data.completedBookings}</Text>
        <Text ta="center" c="dimmed" size="sm">Completed</Text>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center" c="red">{data.cancelledBookings}</Text>
        <Text ta="center" c="dimmed" size="sm">Cancelled</Text>
      </Paper>
    </SimpleGrid>
  );
}

/**
 * BookingHistoryReport Component
 */
export function BookingHistoryReport() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    startOfMonth(subMonths(new Date(), 6)),
    endOfMonth(new Date()),
  ]);

  const { data: assets, isLoading: assetsLoading, error: assetsError } = useAssets();
  const { data: bookings, isLoading: bookingsLoading, error: bookingsError } = useBookings();

  if (assetsLoading || bookingsLoading) return <Loader />;
  if (assetsError) return <Text c="red">Failed to load assets</Text>;
  if (bookingsError) return <Text c="red">Failed to load bookings</Text>;
  if (!assets || !bookings) return null;

  const historyData = aggregateBookingHistory(
    bookings,
    assets,
    dateRange[0] || new Date(),
    dateRange[1] || new Date()
  );

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Booking history</Title>
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={() => exportBookingHistoryToCSV(historyData)}
        >
          Export
        </Button>
      </Group>

      <Paper p="md" withBorder>
        <Group>
          <Text fw={500}>Date range:</Text>
          <div style={{ flex: 1, maxWidth: 400 }}>
            <DateRangeCalendar
              value={{ start: dateRange[0] ? dateRange[0].toISOString().split('T')[0] : undefined, end: dateRange[1] ? dateRange[1].toISOString().split('T')[0] : undefined }}
              onChange={(r) => {
                if (!r || !r.start || !r.end) {
                  setDateRange([null, null])
                  return
                }
                setDateRange([new Date(r.start), new Date(r.end)])
              }}
            />
          </div>
        </Group>
      </Paper>

      <BookingStats data={historyData} />

      <Title order={3} mt="md">Most booked assets</Title>

      <DataTable
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
        records={historyData.mostBookedAssets}
        idAccessor="assetId"
        columns={[
          {
            accessor: 'assetNumber',
            title: 'Asset number',
            width: 150,
          },
          {
            accessor: 'assetName',
            title: 'Name',
            width: 250,
          },
          {
            accessor: 'bookingCount',
            title: 'Booking count',
            width: 180,
            textAlign: 'right',
          },
        ]}
      />

      <Title order={3} mt="md">Bookings per month</Title>

      <DataTable
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
        records={historyData.bookingsByMonth}
        idAccessor="month"
        columns={[
          {
            accessor: 'month',
            title: 'Month',
            width: 150,
            render: (row) => {
              const parts = row.month.split('-');
              const year = parts[0] || '';
              const month = parts[1] || '';
              const date = new Date(parseInt(year), parseInt(month) - 1);
              return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            },
          },
          {
            accessor: 'count',
            title: 'Booking count',
            width: 180,
            textAlign: 'right',
          },
        ]}
      />
    </Stack>
  );
}
