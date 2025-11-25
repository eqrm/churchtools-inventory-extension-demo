/**
 * BookingStatusBadge Component
 * 
 * Displays a color-coded badge for booking status.
 */

import { Badge } from '@mantine/core'
import type { BookingStatus } from '../../types/entities'
import { bookingStrings } from '../../i18n/bookingStrings'

interface BookingStatusBadgeProps {
  status: BookingStatus
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string }> = {
  pending: { label: bookingStrings.status.pending, color: 'gray' },
  approved: { label: bookingStrings.status.approved, color: 'blue' },
  declined: { label: bookingStrings.status.declined, color: 'red' },
  active: { label: bookingStrings.status.active, color: 'green' },
  completed: { label: bookingStrings.status.completed, color: 'teal' },
  overdue: { label: bookingStrings.status.overdue, color: 'orange' },
  cancelled: { label: bookingStrings.status.cancelled, color: 'dark' },
  'maintenance-hold': { label: bookingStrings.status['maintenance-hold'], color: 'grape' },
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  
  return (
    <Badge color={config.color} variant="light">
      {config.label}
    </Badge>
  )
}
