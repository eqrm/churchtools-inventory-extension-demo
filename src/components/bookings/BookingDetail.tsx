/**
 * Booking Detail Component - Shows full booking information
 */

import { useParams } from 'react-router-dom'
import { Stack, Title, Text, Group, Paper, Skeleton } from '@mantine/core'
import { useBooking } from '../../hooks/useBookings'
import { BookingStatusBadge } from './BookingStatusBadge'
import { bookingStrings } from '../../i18n/bookingStrings'
import { BookingDetailsTabs } from './BookingDetailsTabs'

interface BookingDetailProps {
  bookingId?: string
  onEdit?: () => void
  onCheckOut?: () => void
  onCheckIn?: () => void
  onCancel?: () => void
}

function BookingDetailSkeleton() {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Skeleton height={32} width={200} />
        <Skeleton height={28} width={100} />
      </Group>
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Skeleton height={20} width={150} />
          <Skeleton height={20} width="100%" />
          <Skeleton height={20} width={180} />
          <Skeleton height={20} width="100%" />
          <Skeleton height={20} width={160} />
          <Skeleton height={20} width="100%" />
        </Stack>
      </Paper>
    </Stack>
  );
}

export function BookingDetail({ bookingId: propId, onEdit, onCheckOut, onCheckIn, onCancel }: BookingDetailProps) {
  const { id: paramId } = useParams<{ id: string }>()
  const bookingId = propId || paramId || ''
  const { data: booking, isLoading } = useBooking(bookingId)

  if (isLoading) return <BookingDetailSkeleton />;
  if (!booking) return <Text c="red">{bookingStrings.messages.bookingNotFound}</Text>

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>{bookingStrings.labels.bookingDetails}</Title>
        <BookingStatusBadge status={booking.status} />
      </Group>

      <BookingDetailsTabs
        booking={booking}
        onEdit={onEdit}
        onCheckOut={onCheckOut}
        onCheckIn={onCheckIn}
        onCancel={onCancel}
      />
    </Stack>
  )
}
