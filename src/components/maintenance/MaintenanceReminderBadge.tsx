/**
 * MaintenanceReminderBadge component (T175)
 * Shows maintenance status as a colored badge
 */

import { Badge, Tooltip } from '@mantine/core';
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
    label = `${Math.abs(days)}d overdue`;
    tooltip = `Maintenance is ${Math.abs(days)} day(s) overdue`;
  } else if (days <= schedule.reminderDaysBefore) {
    // Due soon
    color = 'yellow';
    icon = <IconClock size={12} />;
    label = `${days}d`;
    tooltip = `Maintenance due in ${days} day(s)`;
  } else {
    // OK
    color = 'green';
    icon = null;
    label = `${days}d`;
    tooltip = `Next maintenance in ${days} day(s)`;
  }

  return (
    <Tooltip label={tooltip}>
      <Badge color={color} size="sm" leftSection={icon}>
        {label}
      </Badge>
    </Tooltip>
  );
}
