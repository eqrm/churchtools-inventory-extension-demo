/**
 * Booking Detail Page - Shows full booking details
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Stack, Button, Group, Modal, Card, Text } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useBooking } from '../hooks/useBookings'
import { BookingDetail } from '../components/bookings/BookingDetail'
import { BookingForm } from '../components/bookings/BookingForm'
import { CheckOutModal } from '../components/bookings/CheckOutModal'
import { CheckInModal } from '../components/bookings/CheckInModal'
import { ApprovalButtons } from '../components/bookings/ApprovalButtons'

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: booking, isLoading } = useBooking(id)
  
  const [editModalOpened, setEditModalOpened] = useState(false)
  const [checkOutModalOpened, setCheckOutModalOpened] = useState(false)
  const [checkInModalOpened, setCheckInModalOpened] = useState(false)

  if (isLoading) {
    return <Text>Loading...</Text>
  }

  if (!booking || !id) {
    return (
      <Card withBorder>
        <Text c="red">Booking not found</Text>
      </Card>
    )
  }

  return (
    <Stack gap="md">
      <Group>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/bookings')}
        >
          Back to list
        </Button>
      </Group>

      {booking.status === 'pending' && (
        <ApprovalButtons bookingId={booking.id} />
      )}

      <BookingDetail
        bookingId={id}
        onEdit={() => setEditModalOpened(true)}
        onCheckOut={() => setCheckOutModalOpened(true)}
        onCheckIn={() => setCheckInModalOpened(true)}
      />

      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Edit booking"
        size="lg"
      >
        <BookingForm
          booking={booking}
          onSuccess={() => setEditModalOpened(false)}
          onCancel={() => setEditModalOpened(false)}
        />
      </Modal>

      <CheckOutModal
        opened={checkOutModalOpened}
        onClose={() => setCheckOutModalOpened(false)}
        bookingId={booking.id}
        assetName={booking.asset?.name || 'Unknown asset'}
      />

      <CheckInModal
        opened={checkInModalOpened}
        onClose={() => setCheckInModalOpened(false)}
        bookingId={booking.id}
        assetName={booking.asset?.name || 'Unknown asset'}
      />
    </Stack>
  )
}
