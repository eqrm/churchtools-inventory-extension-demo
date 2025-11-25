/**
 * Asset Availability Indicator - Visual indicator for asset availability
 */

import { Badge } from '@mantine/core'

interface AssetAvailabilityIndicatorProps {
  isAvailable: boolean
  nextAvailableDate?: string
}

export function AssetAvailabilityIndicator({ isAvailable, nextAvailableDate }: AssetAvailabilityIndicatorProps) {
  if (isAvailable) {
    return <Badge color="green">Available</Badge>
  }

  return (
    <Badge color="red">
      Booked{nextAvailableDate ? ` until ${new Date(nextAvailableDate).toLocaleDateString('en-US')}` : ''}
    </Badge>
  )
}
