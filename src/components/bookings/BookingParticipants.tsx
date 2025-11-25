import { Group, Stack, Text } from '@mantine/core'
import type { Booking } from '../../types/entities'
import { bookingStrings } from '../../i18n/bookingStrings'
import { PersonAvatar } from '../common/PersonAvatar'
import { formatDateTime } from '../../utils/formatters'

const LABEL_WIDTH = 130

interface BookingParticipantsProps {
  booking: Booking
}

interface ParticipantRow {
  key: string
  label: string
  personId?: string
  name?: string | null
  timestamp?: string | null
}

function normaliseLabel(label: string): string {
  return label.endsWith(':') ? label.slice(0, -1) : label
}

export function BookingParticipants({ booking }: BookingParticipantsProps) {
  const rows: ParticipantRow[] = [
    {
      key: 'bookedBy',
      label: normaliseLabel(bookingStrings.labels.bookedBy),
      personId: booking.bookedById,
      name: booking.bookedByName || booking.requestedByName,
    },
    {
      key: 'bookingFor',
      label: bookingStrings.form.bookingFor,
      personId: booking.bookingForId,
      name: booking.bookingForName,
    },
    {
      key: 'approvedBy',
      label: normaliseLabel(bookingStrings.labels.approvedBy),
      personId: booking.approvedBy,
      name: booking.approvedByName,
    },
    {
      key: 'checkedOutBy',
      label: 'Checked out by',
      personId: booking.checkedOutBy,
      name: booking.checkedOutByName,
      timestamp: booking.checkedOutAt,
    },
    {
      key: 'checkedInBy',
      label: 'Checked in by',
      personId: booking.checkedInBy,
      name: booking.checkedInByName,
      timestamp: booking.checkedInAt,
    },
  ]

  return (
    <Stack gap="sm">
      {rows.map((row) => {
        const hasPerson = Boolean(row.personId || row.name)
        const description = row.timestamp ? formatDateTime(row.timestamp) : undefined

        return (
          <Group key={row.key} gap="md" align="flex-start" wrap="nowrap">
            <Text size="sm" fw={500} style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
              {row.label}
            </Text>
            {hasPerson ? (
              <PersonAvatar
                personId={row.personId}
                name={row.name ?? undefined}
                size="sm"
                textSize="sm"
                description={description}
                fallbackLabel="—"
              />
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </Group>
        )
      })}
    </Stack>
  )
}
