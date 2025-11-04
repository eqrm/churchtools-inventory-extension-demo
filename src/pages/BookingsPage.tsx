/**
 * Bookings Page - Lists all equipment bookings
 */

import { useState } from 'react';
import { Stack, Modal } from '@mantine/core';
import { BookingList } from '../components/bookings/BookingList'
import { BookingForm } from '../components/bookings/BookingForm'

export function BookingsPage() {
  const [createModalOpened, setCreateModalOpened] = useState(false)

  return (
    <Stack gap="md">
      <BookingList onCreateClick={() => setCreateModalOpened(true)} />

      <Modal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        title="Neue Buchung erstellen"
        size="lg"
      >
        <BookingForm
          onSuccess={() => setCreateModalOpened(false)}
          onCancel={() => setCreateModalOpened(false)}
        />
      </Modal>
    </Stack>
  )
}
