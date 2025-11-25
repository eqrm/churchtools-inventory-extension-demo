/**
 * KitAvailabilityIndicator Component - Stub Implementation
 * TODO: Full implementation needed for T138
 */

import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface KitAvailabilityIndicatorProps {
  available: boolean;
  reason?: string;
}

export function KitAvailabilityIndicator({ available, reason }: KitAvailabilityIndicatorProps) {
  const { t } = useTranslation('kits');
  return (
    <Badge color={available ? 'green' : 'red'} title={reason}>
      {available ? t('availability.available') : t('availability.unavailable')}
    </Badge>
  );
}
