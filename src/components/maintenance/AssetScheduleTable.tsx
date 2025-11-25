/**
 * Asset Schedule Table Component (T160)
 * 
 * Displays completion status per asset in a work order with scheduling.
 */

import { Table, Badge, Text, ActionIcon, Group, Box, Tooltip } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCheck, IconClock, IconProgress } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { WorkOrderLineItem } from '../../types/maintenance';
import type { UUID } from '../../types/entities';

interface Asset {
  id: UUID;
  name: string;
  assetNumber: string;
}

interface AssetScheduleTableProps {
  lineItems: WorkOrderLineItem[];
  assets: Asset[];
  editable?: boolean;
  onUpdateLineItem?: (assetId: UUID, updates: Partial<WorkOrderLineItem>) => void;
  onMarkComplete?: (assetId: UUID) => void;
}

export function AssetScheduleTable({
  lineItems,
  assets,
  editable = false,
  onUpdateLineItem,
  onMarkComplete,
}: AssetScheduleTableProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  const getStatusBadge = (status: WorkOrderLineItem['completionStatus']) => {
    const configs = {
      pending: { color: 'gray', icon: IconClock, label: t('maintenance:states.pending') },
      'in-progress': { color: 'blue', icon: IconProgress, label: t('maintenance:states.inProgress') },
      completed: { color: 'green', icon: IconCheck, label: t('maintenance:states.completed') },
    };
    const config = configs[status];
    const Icon = config.icon;

    return (
      <Badge color={config.color} leftSection={<Icon size={14} />}>
        {config.label}
      </Badge>
    );
  };

  const getAssetById = (assetId: UUID) => assets.find((a) => a.id === assetId);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const completedCount = lineItems.filter((item) => item.completionStatus === 'completed').length;
  const totalCount = lineItems.length;

  return (
    <Box>
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={500}>
          {t('maintenance:fields.assets')}
        </Text>
        <Text size="sm" c="dimmed">
          {completedCount} / {totalCount} {t('maintenance:completed')}
        </Text>
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('maintenance:columns.assetNumber')}</Table.Th>
            <Table.Th>{t('maintenance:columns.assetName')}</Table.Th>
            <Table.Th>{t('maintenance:columns.scheduledDate')}</Table.Th>
            <Table.Th>{t('maintenance:columns.status')}</Table.Th>
            <Table.Th>{t('maintenance:columns.completedAt')}</Table.Th>
            {editable && <Table.Th>{t('common:columns.actions')}</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {lineItems.map((item) => {
            const asset = getAssetById(item.assetId);
            if (!asset) return null;

            return (
              <Table.Tr key={item.assetId}>
                <Table.Td>{asset.assetNumber}</Table.Td>
                <Table.Td>{asset.name}</Table.Td>
                <Table.Td>
                  {editable && item.completionStatus === 'pending' && onUpdateLineItem ? (
                    <DateInput
                      size="xs"
                      value={item.scheduledDate ? new Date(item.scheduledDate) : undefined}
                      onChange={(date) =>
                        onUpdateLineItem(item.assetId, {
                          scheduledDate: date?.toISOString().split('T')[0],
                        })
                      }
                      clearable
                      valueFormat="DD.MM.YYYY"
                    />
                  ) : (
                    <Text size="sm">{formatDate(item.scheduledDate)}</Text>
                  )}
                </Table.Td>
                <Table.Td>{getStatusBadge(item.completionStatus)}</Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(item.completedAt)}</Text>
                </Table.Td>
                {editable && (
                  <Table.Td>
                    {item.completionStatus !== 'completed' && onMarkComplete && (
                      <Tooltip label={t('maintenance:actions.markAsComplete')}>
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          onClick={() => onMarkComplete(item.assetId)}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {lineItems.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {t('maintenance:noAssets')}
        </Text>
      )}
    </Box>
  );
}
