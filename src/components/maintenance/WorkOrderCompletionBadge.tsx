/**
 * Work Order Completion Badge Component (T163)
 * 
 * Shows partial completion indicator ("3/5 assets completed") with progress ring.
 */

import { Badge, Group, RingProgress, Tooltip, Text } from '@mantine/core';
import { IconCheck, IconProgress, IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { WorkOrderLineItem } from '../../types/maintenance';

interface WorkOrderCompletionBadgeProps {
  lineItems: WorkOrderLineItem[];
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function WorkOrderCompletionBadge({
  lineItems,
  size = 'md',
  showProgress = false,
}: WorkOrderCompletionBadgeProps) {
  const { t } = useTranslation('maintenance');

  const completedCount = lineItems.filter((item) => item.completionStatus === 'completed').length;
  const inProgressCount = lineItems.filter((item) => item.completionStatus === 'in-progress')
    .length;
  const totalCount = lineItems.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getColor = () => {
    if (completedCount === totalCount && totalCount > 0) return 'green';
    if (completedCount > 0 || inProgressCount > 0) return 'blue';
    return 'gray';
  };

  const getIcon = () => {
    if (completedCount === totalCount && totalCount > 0) return IconCheck;
    if (inProgressCount > 0) return IconProgress;
    return IconAlertCircle;
  };

  const Icon = getIcon();
  const color = getColor();

  const label = `${completedCount}/${totalCount}`;
  const tooltipText = t('workOrders.completionStatus', {
    completed: completedCount,
    inProgress: inProgressCount,
    total: totalCount,
    percentage,
  });

  if (showProgress && totalCount > 0) {
    return (
      <Tooltip label={tooltipText}>
        <Group gap="xs">
          <RingProgress
            size={size === 'sm' ? 24 : size === 'md' ? 32 : 40}
            thickness={size === 'sm' ? 3 : size === 'md' ? 4 : 5}
            sections={[
              { value: percentage, color: color },
            ]}
            label={
              <Text size={size === 'sm' ? '8px' : size === 'md' ? '10px' : '12px'} ta="center" fw={700}>
                {percentage}%
              </Text>
            }
          />
          <Text size={size}>
            {label} {t('completed')}
          </Text>
        </Group>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={tooltipText}>
      <Badge color={color} leftSection={<Icon size={14} />} size={size}>
        {label} {t('completed')}
      </Badge>
    </Tooltip>
  );
}
