import { Card, Stack, Text, Badge, Group, Center, Loader, useMantineTheme } from '@mantine/core';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import type { Asset, BookingStatus } from '../../types/entities';
import { useBookings } from '../../hooks/useBookings';

interface AssetCalendarViewProps {
  assets: Asset[];
}

export function AssetCalendarView({ assets }: AssetCalendarViewProps) {
  const theme = useMantineTheme();
  const { data: bookings, isLoading } = useBookings();

  const statusColors = useMemo<Record<BookingStatus, { bg: string; text: string }>>(
    () => ({
      pending: { bg: theme.colors.yellow[5], text: theme.black },
      approved: { bg: theme.colors.teal[6], text: theme.white },
      active: { bg: theme.colors.blue[6], text: theme.white },
      completed: { bg: theme.colors.gray[6], text: theme.white },
      overdue: { bg: theme.colors.red[7], text: theme.white },
      cancelled: { bg: theme.colors.gray[5], text: theme.white },
      declined: { bg: theme.colors.red[8] ?? theme.colors.red[6], text: theme.white },
      'maintenance-hold': { bg: theme.colors.orange[4], text: theme.black },
    }),
    [theme]
  );

  const fallbackColors = useMemo(
    () => ({
      bg: theme.colors.gray[5],
      text: theme.white,
    }),
    [theme]
  );

  const events = useMemo(() => {
    const entries = bookings ?? [];

    return entries.map((booking) => {
      const assetLabel = booking.asset
        ? booking.asset.assetNumber
          ? `${booking.asset.assetNumber} — ${booking.asset.name}`
          : booking.asset.name
        : booking.kit?.name ?? 'Unassigned';
      const titleParts = [assetLabel, booking.purpose].filter(Boolean);
      const title = titleParts.length > 0 ? titleParts.join(' • ') : 'Booking';

      const isAllDay = !booking.startTime && !booking.endTime;
      const baseStartDate = booking.bookingMode === 'single-day'
        ? booking.date ?? booking.startDate
        : booking.startDate;
      const baseEndDate = booking.bookingMode === 'single-day'
        ? booking.date ?? booking.endDate
        : booking.endDate;

      const combineDateTime = (date: string | undefined, time?: string) => {
        if (!date) return undefined;
        if (!time) return date;
        return `${date}T${time}`;
      };

      const start = combineDateTime(baseStartDate, booking.startTime) ?? booking.startDate;
      let end = combineDateTime(baseEndDate, booking.endTime) ?? combineDateTime(baseEndDate, booking.startTime);

      if (isAllDay) {
        end = format(addDays(parseISO(baseEndDate), 1), 'yyyy-MM-dd');
      }

      const colors = statusColors[booking.status as BookingStatus] ?? fallbackColors;

      return {
        id: booking.id,
        title,
        start,
        end,
        allDay: isAllDay,
        backgroundColor: colors.bg,
        borderColor: colors.bg,
        textColor: colors.text,
        extendedProps: {
          assetId: booking.asset?.id,
          assetName: booking.asset?.name ?? booking.kit?.name ?? 'Unassigned',
          assetNumber: booking.asset?.assetNumber,
          purpose: booking.purpose,
          status: booking.status,
          startDate: booking.startDate,
          endDate: booking.endDate,
        },
      };
    });
  }, [bookings, fallbackColors, statusColors]);

  const assetIdsWithBookings = useMemo(
    () =>
      new Set(
        (bookings ?? [])
          .filter((booking) =>
            booking.status === 'active' || booking.status === 'pending' || booking.status === 'approved'
          )
          .map((booking) => booking.asset?.id)
          .filter((id): id is string => Boolean(id))
      ),
    [bookings]
  );

  const statusLegend = useMemo(() => {
    const seenStatuses = new Set((bookings ?? []).map((booking) => booking.status));
    return (Object.entries(statusColors) as [BookingStatus, { bg: string; text: string }][]).filter(([status]) =>
      seenStatuses.has(status)
    );
  }, [bookings, statusColors]);

  const toSentenceCase = (value: string) =>
    value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Calendar view of upcoming and past asset bookings.
      </Text>

      <Card withBorder padding="md">
        <Stack gap="sm">
          {events.length === 0 ? (
            <Text c="dimmed" size="sm">
              No bookings found. Newly created bookings will appear here automatically.
            </Text>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                start: 'prev,next today',
                center: 'title',
                end: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              buttonText={{
                today: 'Today',
                month: 'Month',
                week: 'Week',
                day: 'Day',
              }}
              height="auto"
              events={events}
              eventDidMount={(info) => {
                const { assetName, purpose, status, startDate, endDate } = info.event
                  .extendedProps as {
                  assetName?: string;
                  purpose?: string;
                  status?: string;
                  startDate?: string;
                  endDate?: string;
                };
                const startLabel = info.event.start ? format(info.event.start, 'PP p') : startDate;
                const endLabel = info.event.end ? format(info.event.end, 'PP p') : endDate;
                const tooltip = [assetName, purpose, status ? `Status: ${toSentenceCase(status)}` : undefined]
                  .filter(Boolean)
                  .join('\n');
                info.el.setAttribute('title', tooltip);
                if (startLabel || endLabel) {
                  info.el.setAttribute('data-range', `${startLabel ?? ''} → ${endLabel ?? ''}`);
                }
              }}
              eventClick={(selection) => {
                const { assetId } = selection.event.extendedProps as { assetId?: string };
                if (assetId) {
                  window.open(`/assets/${assetId}`, '_blank', 'noopener');
                }
              }}
              dayMaxEvents={4}
              navLinks
              nowIndicator
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
            />
          )}

          {events.length > 0 && (
            <Group gap="xs" wrap="wrap">
              {statusLegend.map(([status, colors]) => (
                <Badge key={status} style={{ backgroundColor: colors.bg, color: colors.text }}>
                  {toSentenceCase(status)}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Card>

      <Card withBorder>
        <Stack gap="sm">
          <Text fw={600}>Assets with active bookings</Text>
          <Group gap="xs">
            {assets
              .filter((asset) => assetIdsWithBookings.has(asset.id))
              .map((asset) => (
                <Badge
                  key={asset.id}
                  component={Link}
                  to={`/assets/${asset.id}`}
                  variant="light"
                  style={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                  {asset.assetNumber}
                </Badge>
              ))}
            {assetIdsWithBookings.size === 0 && (
              <Text c="dimmed" size="sm">
                No assets are currently booked.
              </Text>
            )}
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
