/**
 * Asset Booking Indicator - Shows current/upcoming bookings for an asset (T125)
 */

import { Card, Stack, Text, Badge, Group, Button } from '@mantine/core'
import { IconCalendar } from '@tabler/icons-react'
import { useBookings } from '../../hooks/useBookings'
import { BookingStatusBadge } from '../bookings/BookingStatusBadge'
import { PersonDisplay } from '../common/PersonDisplay'
import type { UUID, Booking } from '../../types/entities'

interface AssetBookingIndicatorProps {
  assetId: UUID
  onBookAsset?: () => void
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function BookingItem({ booking }: { booking: Booking }) {
  return (
    <Group justify="space-between">
      <Stack gap={4} style={{ flex: 1 }}>
        <Group gap="xs">
          <BookingStatusBadge status={booking.status} />
          <PersonDisplay 
            personId={booking.requestedBy} 
            personName={booking.requestedByName} 
            size="xs" 
            textSize="sm" 
            textWeight={500}
          />
        </Group>
        <Text size="xs" c="dimmed">
          {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
        </Text>
        {booking.purpose && <Text size="xs">{booking.purpose}</Text>}
      </Stack>
    </Group>
  )
}

function EmptyState({ onBookAsset }: { onBookAsset?: () => void }) {
  return (
    <Card withBorder>
      <Group justify="space-between">
        <Group gap="xs">
          <IconCalendar size={20} />
          <Text size="sm" fw={500}>Bookings</Text>
        </Group>
        <Badge color="green">Available</Badge>
      </Group>
      {onBookAsset && (
        <Button fullWidth mt="sm" onClick={onBookAsset}>
          Book asset
        </Button>
      )}
    </Card>
  )
}

export function AssetBookingIndicator({ assetId, onBookAsset }: AssetBookingIndicatorProps) {
  const { data: bookings = [] } = useBookings({ assetId })

  const activeBookings = bookings.filter(b => b.status === 'active')
  const upcomingBookings = bookings.filter(b => 
    b.status === 'approved' || b.status === 'pending'
  )

  if (bookings.length === 0) {
    return <EmptyState onBookAsset={onBookAsset} />
  }

  return (
    <Card withBorder>
      <Stack gap="md">
        <Group gap="xs">
          <IconCalendar size={20} />
          <Text size="sm" fw={500}>Bookings</Text>
        </Group>

        {activeBookings.map(booking => (
          <BookingItem key={booking.id} booking={booking} />
        ))}

        {upcomingBookings.length > 0 && (
          <>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">Upcoming</Text>
            {upcomingBookings.slice(0, 3).map(booking => (
              <BookingItem key={booking.id} booking={booking} />
            ))}
          </>
        )}
      </Stack>
    </Card>
  )
}
