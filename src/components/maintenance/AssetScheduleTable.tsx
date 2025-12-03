/**
 * Asset Schedule Table Component (T160)
 * 
 * Displays completion status per asset in a work order with scheduling.
 * Mobile-friendly card layout for technicians on tablets/phones.
 */

import {
  Badge,
  Text,
  Button,
  Group,
  Box,
  Stack,
  Card,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCheck, IconClock, IconProgress, IconNote } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
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
  const [expandedNotes, setExpandedNotes] = useState<Set<UUID>>(new Set());

  const toggleNotes = (assetId: UUID) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: WorkOrderLineItem['completionStatus']) => {
    const configs = {
      pending: { color: 'gray', icon: IconClock, label: t('maintenance:completionStatus.pending') },
      'in-progress': { color: 'blue', icon: IconProgress, label: t('maintenance:completionStatus.in-progress') },
      completed: { color: 'green', icon: IconCheck, label: t('maintenance:completionStatus.completed') },
    };
    const config = configs[status];
    const Icon = config.icon;

    return (
      <Badge color={config.color} size="lg" leftSection={<Icon size={14} />}>
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
      <Group justify="space-between" mb="md">
        <Text size="sm" fw={500}>
          {t('maintenance:fields.assets')}
        </Text>
        <Badge size="lg" variant="light" color={completedCount === totalCount && totalCount > 0 ? 'green' : 'gray'}>
          {completedCount} / {totalCount} {t('maintenance:completed')}
        </Badge>
      </Group>

      <Stack gap="md">
        {lineItems.map((item) => {
          const asset = getAssetById(item.assetId);
          if (!asset) return null;
          const isCompleted = item.completionStatus === 'completed';
          const showNotes = expandedNotes.has(item.assetId);

          return (
            <Card
              key={item.assetId}
              withBorder
              padding="md"
              radius="md"
              style={{
                borderLeftWidth: 4,
                borderLeftColor: isCompleted
                  ? 'var(--mantine-color-green-6)'
                  : 'var(--mantine-color-gray-4)',
              }}
            >
              {/* Header: Asset info + Status */}
              <Group justify="space-between" wrap="nowrap" mb="sm">
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text fw={600} size="md" truncate>
                    {asset.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {asset.assetNumber}
                  </Text>
                </Box>
                {getStatusBadge(item.completionStatus)}
              </Group>

              {/* Scheduled Date */}
              {editable && !isCompleted && onUpdateLineItem ? (
                <Box mb="sm">
                  <Text size="xs" c="dimmed" mb={4}>
                    {t('maintenance:columns.scheduledDate')}
                  </Text>
                  <DateInput
                    size="md"
                    value={item.scheduledDate ? new Date(item.scheduledDate) : undefined}
                    onChange={(date) =>
                      onUpdateLineItem(item.assetId, {
                        scheduledDate: date?.toISOString().split('T')[0],
                      })
                    }
                    clearable
                    valueFormat="DD.MM.YYYY"
                    styles={{
                      input: { minHeight: 44 }, // Touch-friendly height
                    }}
                  />
                </Box>
              ) : item.scheduledDate ? (
                <Group gap="xs" mb="sm">
                  <Text size="xs" c="dimmed">
                    {t('maintenance:columns.scheduledDate')}:
                  </Text>
                  <Text size="sm">{formatDate(item.scheduledDate)}</Text>
                </Group>
              ) : null}

              {/* Completed At */}
              {isCompleted && item.completedAt && (
                <Group gap="xs" mb="sm">
                  <Text size="xs" c="dimmed">
                    {t('maintenance:columns.completedAt')}:
                  </Text>
                  <Text size="sm" c="green">
                    {formatDate(item.completedAt)}
                  </Text>
                </Group>
              )}

              {/* Notes section */}
              {editable && (
                <Box mb="sm">
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconNote size={14} />}
                    onClick={() => toggleNotes(item.assetId)}
                    color="gray"
                  >
                    {showNotes ? t('common:actions.hideNotes') : t('common:actions.addNotes')}
                  </Button>
                  {showNotes && onUpdateLineItem && (
                    <Textarea
                      mt="xs"
                      placeholder={t('maintenance:placeholders.notes')}
                      value={item.notes || ''}
                      onChange={(e) =>
                        onUpdateLineItem(item.assetId, { notes: e.currentTarget.value })
                      }
                      minRows={2}
                      autosize
                      styles={{
                        input: { minHeight: 60 },
                      }}
                    />
                  )}
                  {!showNotes && item.notes && (
                    <Text size="sm" c="dimmed" mt="xs" lineClamp={1}>
                      {item.notes}
                    </Text>
                  )}
                </Box>
              )}

              {/* Action button - large touch target */}
              {editable && !isCompleted && onMarkComplete && (
                <Button
                  fullWidth
                  size="md"
                  color="green"
                  variant="light"
                  leftSection={<IconCheck size={20} />}
                  onClick={() => onMarkComplete(item.assetId)}
                  styles={{
                    root: { minHeight: 48 }, // Touch-friendly
                  }}
                >
                  {t('maintenance:actions.markAsComplete')}
                </Button>
              )}
            </Card>
          );
        })}
      </Stack>

      {lineItems.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {t('maintenance:noAssets')}
        </Text>
      )}
    </Box>
  );
}
