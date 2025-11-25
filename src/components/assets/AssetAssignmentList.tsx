import { Card, Divider, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Asset } from '../../types/entities';
import { PersonAvatar } from '../common/PersonAvatar';
import { formatDateTime } from '../../utils/formatters';

const LABEL_WIDTH = 150;

interface AssetAssignmentListProps {
  asset: Asset;
}

interface AssignmentRow {
  key: string;
  label: string;
  personId?: string;
  name?: string;
  description?: string;
  emptyLabel?: string;
}

function buildRows(asset: Asset, t: TFunction<'assets'>): AssignmentRow[] {
  const sinceDescription = asset.inUseBy?.since
    ? t('detail.assignmentSinceDescription', { date: formatDateTime(asset.inUseBy.since) })
    : undefined;
  const createdDescription = asset.createdAt
    ? t('detail.assignmentCreatedDescription', { date: formatDateTime(asset.createdAt) })
    : undefined;
  const updatedDescription = asset.lastModifiedAt
    ? t('detail.assignmentUpdatedDescription', { date: formatDateTime(asset.lastModifiedAt) })
    : undefined;

  return [
    {
      key: 'inUseBy',
      label: t('detail.assignmentInUseLabel'),
      personId: asset.inUseBy?.personId,
      name: asset.inUseBy?.personName,
      description: sinceDescription,
      emptyLabel: t('detail.assignmentInUseEmpty'),
    },
    {
      key: 'createdBy',
      label: t('detail.assignmentCreatedLabel'),
      personId: asset.createdBy,
      name: asset.createdByName,
      description: createdDescription,
    },
    {
      key: 'lastModifiedBy',
      label: t('detail.assignmentUpdatedLabel'),
      personId: asset.lastModifiedBy,
      name: asset.lastModifiedByName,
      description: updatedDescription,
    },
  ];
}

export function AssetAssignmentList({ asset }: AssetAssignmentListProps) {
  const { t } = useTranslation('assets');
  const rows = buildRows(asset, t);

  return (
    <Card withBorder>
      <Stack gap="md">
        <Text fw={600}>{t('detail.assignmentSummaryTitle')}</Text>
        <Divider />
        {rows.map((row) => {
          const hasPerson = Boolean(row.personId || row.name);

          return (
            <Group key={row.key} gap="md" align="flex-start" wrap="nowrap">
              <Text size="sm" fw={500} style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
                {row.label}
              </Text>
              {hasPerson ? (
                <PersonAvatar
                  personId={row.personId}
                  name={row.name}
                  size="sm"
                  textSize="sm"
                  description={row.description}
                  fallbackLabel="—"
                />
              ) : (
                <Text size="sm" c="dimmed">
                  {row.emptyLabel ?? '—'}
                </Text>
              )}
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}
