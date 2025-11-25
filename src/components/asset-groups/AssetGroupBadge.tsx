import { Badge, type BadgeProps } from '@mantine/core';
import { IconTags } from '@tabler/icons-react';
import type { AssetGroup } from '../../types/entities';

interface AssetGroupBadgeProps extends Omit<BadgeProps, 'children'> {
  group: Pick<AssetGroup, 'groupNumber' | 'name'>;
  withName?: boolean;
}

export function AssetGroupBadge({ group, withName, ...badgeProps }: AssetGroupBadgeProps) {
  const segments: string[] = [];

  if (group.groupNumber) {
    segments.push(group.groupNumber);
  }

  if (withName || segments.length === 0) {
    segments.push(group.name);
  }

  return (
    <Badge
      leftSection={<IconTags size={12} />}
      radius="sm"
      variant="light"
      color="grape"
      {...badgeProps}
    >
      {segments.join(' • ')}
    </Badge>
  );
}
