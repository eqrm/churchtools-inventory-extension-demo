import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import type { Asset } from '../../types/entities';

export interface KitMemberBadgeProps {
  members?: Asset['kitBoundAssets'];
  withinPortal?: boolean;
}

export function KitMemberBadge({ members = [], withinPortal = true }: KitMemberBadgeProps) {
  const count = members.length;
  const badgeLabel = count === 1 ? '1 member' : `${count} members`;

  const tooltipLabel = count === 0
    ? (
        <Text size="xs" fw={500}>
          No kit members linked yet
        </Text>
      )
    : (
        <Stack gap={4} maw={280}>
          <Text size="xs" fw={600}>
            {badgeLabel}
          </Text>
          {members.map((member) => (
            <Group key={`${member.assetId}-${member.assetNumber}`} gap="xs" wrap="nowrap">
              <Text size="xs" fw={500}>
                {member.assetNumber}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {member.name}
              </Text>
            </Group>
          ))}
        </Stack>
      );

  return (
    <Tooltip label={tooltipLabel} withinPortal={withinPortal} position="top" withArrow>
      <Badge
        size="xs"
        color="violet"
        variant="light"
        leftSection={<IconUsers size={10} />}
        data-testid="kit-member-badge"
      >
        {badgeLabel}
      </Badge>
    </Tooltip>
  );
}
