/**
 * AssetWorkOrdersList Component (T4.3.2, T4.3.3)
 * 
 * Displays a table of work orders associated with a specific asset.
 * Shows work order number, type, state, scheduled dates, and overdue indicators.
 */

import { Badge, Group, Stack, Table, Text, Anchor, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconExternalLink } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAssetWorkOrders } from '../../hooks/useAssetWorkOrders';
import type { UUID } from '../../types/entities';
import type { WorkOrder, WorkOrderState, WorkOrderOrderType } from '../../types/maintenance';

export interface AssetWorkOrdersListProps {
  assetId: UUID;
}

export function AssetWorkOrdersList({ assetId }: AssetWorkOrdersListProps) {
  const { t } = useTranslation(['maintenance', 'common']);
  const { data: workOrders = [], isLoading, error } = useAssetWorkOrders(assetId);

  if (isLoading) {
    return <Text c="dimmed">{t('common:loading')}</Text>;
  }

  if (error) {
    return <Text c="red">{t('common:error')}: {error.message}</Text>;
  }

  if (workOrders.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {t('maintenance:workOrders.noWorkOrdersForAsset')}
      </Text>
    );
  }

  const getStateBadgeColor = (state: WorkOrderState): string => {
    switch (state) {
      case 'backlog':
        return 'gray';
      case 'assigned':
        return 'blue';
      case 'planned':
        return 'cyan';
      case 'offer-requested':
        return 'yellow';
      case 'offer-received':
        return 'lime';
      case 'in-progress':
        return 'orange';
      case 'completed':
        return 'green';
      case 'done':
        return 'teal';
      case 'aborted':
        return 'red';
      case 'obsolete':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getOrderTypeColor = (orderType: WorkOrderOrderType): string => {
    switch (orderType) {
      case 'planned':
        return 'blue';
      case 'unplanned':
        return 'red';
      case 'follow-up':
        return 'grape';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /** States that indicate a work order is completed and cannot be overdue */
  const COMPLETED_STATES: WorkOrderState[] = ['completed', 'done', 'aborted', 'obsolete'];

  /**
   * Check if a work order is overdue
   */
  const isOverdue = (workOrder: WorkOrder): boolean => {
    // Completed states are not overdue
    if (COMPLETED_STATES.includes(workOrder.state)) {
      return false;
    }
    
    // Must have a scheduled end date to be overdue
    if (!workOrder.scheduledEnd) {
      return false;
    }
    
    const endDate = new Date(workOrder.scheduledEnd);
    const now = new Date();
    return endDate < now;
  };

  // Sort by scheduled date (most recent first)
  const sortedWorkOrders = [...workOrders].sort((a, b) => {
    const dateA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
    const dateB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Stack gap="md">
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('maintenance:fields.workOrderNumber')}</Table.Th>
            <Table.Th>{t('maintenance:fields.type')}</Table.Th>
            <Table.Th>{t('maintenance:fields.orderType')}</Table.Th>
            <Table.Th>{t('maintenance:fields.state')}</Table.Th>
            <Table.Th>{t('maintenance:fields.scheduledStart')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedWorkOrders.map((workOrder: WorkOrder) => (
            <Table.Tr key={workOrder.id}>
              <Table.Td>
                <Anchor
                  component={Link}
                  to={`/maintenance/work-orders/${workOrder.id}/edit`}
                  size="sm"
                  fw={500}
                >
                  <Group gap="xs">
                    {workOrder.workOrderNumber}
                    <IconExternalLink size={14} />
                  </Group>
                </Anchor>
              </Table.Td>
              <Table.Td>
                <Badge color={workOrder.type === 'internal' ? 'blue' : 'orange'} variant="light" size="sm">
                  {t(`maintenance:types.${workOrder.type}`)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={getOrderTypeColor((workOrder.orderType ?? 'planned') as WorkOrderOrderType)}
                  variant="outline"
                  size="sm"
                >
                  {t(`maintenance:orderTypes.${workOrder.orderType ?? 'planned'}`)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Badge color={getStateBadgeColor(workOrder.state)} variant="filled" size="sm">
                  {t(`maintenance:states.${workOrder.state}`)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  {isOverdue(workOrder) ? (
                    <Tooltip label={t('maintenance:workOrders.overdue')}>
                      <Badge 
                        color="red" 
                        variant="filled" 
                        size="sm"
                        leftSection={<IconAlertTriangle size={12} />}
                      >
                        {formatDate(workOrder.scheduledEnd)}
                      </Badge>
                    </Tooltip>
                  ) : (
                    <Text size="sm" c="dimmed">
                      {formatDate(workOrder.scheduledStart)}
                    </Text>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
