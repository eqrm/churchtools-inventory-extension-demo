/**
 * MaintenanceReminderBadge component (T175)
 * Shows maintenance status as a colored badge
 */

import { Badge, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle, IconClock } from '@tabler/icons-react';
import { daysUntilDue } from '../../utils/maintenanceCalculations';
import type { MaintenanceSchedule } from '../../types/entities';

interface MaintenanceReminderBadgeProps {
  schedule: MaintenanceSchedule;
}

/**
 * Badge showing maintenance status
 * Red = overdue, Yellow = due soon, Green = ok
 */
export function MaintenanceReminderBadge({ schedule }: MaintenanceReminderBadgeProps) {
  const { t } = useTranslation('maintenance');
  const days = daysUntilDue(schedule);

  if (days === null || !schedule.nextDue) {
    return null;
  }

  let color: string;
  let icon: React.ReactNode;
  let label: string;
  let tooltip: string;

  if (days < 0) {
    // Overdue
    color = 'red';
    icon = <IconAlertTriangle size={12} />;
    label = t('reminder.overdue', { count: Math.abs(days), days: Math.abs(days) });
    tooltip = t('reminder.overdueTooltip', { count: Math.abs(days) });
  } else if (days <= schedule.reminderDaysBefore) {
    // Due soon
    color = 'yellow';
    icon = <IconClock size={12} />;
    label = t('reminder.daysShort', { count: days });
    tooltip = t('reminder.dueIn', { count: days });
  } else {
    // OK
    color = 'green';
    icon = null;
    label = t('reminder.daysShort', { count: days });
    tooltip = t('reminder.nextIn', { count: days });
  }

  return (
    <Tooltip label={tooltip}>
      <Badge color={color} size="sm" leftSection={icon}>
        {label}
      </Badge>
    </Tooltip>
  );
}
