import { Card, Divider, Group, Stack, Text } from '@mantine/core'
import type { Asset } from '../../types/entities'
import { PersonAvatar } from '../common/PersonAvatar'
import { formatDateTime } from '../../utils/formatters'

const LABEL_WIDTH = 150

interface AssetAssignmentListProps {
  asset: Asset
}

interface AssignmentRow {
  key: string
  label: string
  personId?: string
  name?: string
  description?: string
  emptyLabel?: string
}

function buildRows(asset: Asset): AssignmentRow[] {
  const sinceDescription = asset.inUseBy?.since ? `Since ${formatDateTime(asset.inUseBy.since)}` : undefined
  const createdDescription = asset.createdAt ? `Created ${formatDateTime(asset.createdAt)}` : undefined
  const updatedDescription = asset.lastModifiedAt ? `Updated ${formatDateTime(asset.lastModifiedAt)}` : undefined

  return [
    {
      key: 'inUseBy',
      label: 'Currently in use',
      personId: asset.inUseBy?.personId,
      name: asset.inUseBy?.personName,
      description: sinceDescription,
      emptyLabel: 'Not currently assigned',
    },
    {
      key: 'createdBy',
      label: 'Created by',
      personId: asset.createdBy,
      name: asset.createdByName,
      description: createdDescription,
    },
    {
      key: 'lastModifiedBy',
      label: 'Last modified by',
      personId: asset.lastModifiedBy,
      name: asset.lastModifiedByName,
      description: updatedDescription,
    },
  ]
}

export function AssetAssignmentList({ asset }: AssetAssignmentListProps) {
  const rows = buildRows(asset)

  return (
    <Card withBorder>
      <Stack gap="md">
        <Text fw={600}>People</Text>
        <Divider />
        {rows.map((row) => {
          const hasPerson = Boolean(row.personId || row.name)

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
          )
        })}
      </Stack>
    </Card>
  )
}
