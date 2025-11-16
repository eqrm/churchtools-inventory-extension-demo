import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Group,
  Stack,
  Card,
  Text,
  Badge,
  ScrollArea,
  useMantineTheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { notifications } from '@mantine/notifications';
import { useUpdateAsset } from '../../hooks/useAssets';
import type { Asset, AssetStatus } from '../../types/entities';
import {
  ASSET_STATUS_KANBAN_COLORS,
  ASSET_STATUS_KANBAN_ORDER,
  ASSET_STATUS_LABELS,
} from '../../constants/assetStatuses';

interface AssetKanbanViewProps {
  assets: Asset[];
}

type StatusGroup = { status: AssetStatus; label: string; color: string };

const statusGroups: StatusGroup[] = ASSET_STATUS_KANBAN_ORDER.map((status) => ({
  status,
  label: ASSET_STATUS_LABELS[status],
  color: ASSET_STATUS_KANBAN_COLORS[status] ?? 'gray',
}));

type ColumnData = StatusGroup & { assets: Asset[] };

function KanbanColumn({ group, children }: { group: ColumnData; children: ReactNode }) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const { setNodeRef, isOver } = useDroppable({ id: group.status });
  const hasCards = group.assets.length > 0;

  return (
    <Stack
      key={group.status}
      gap="sm"
      style={{ minWidth: 280, maxWidth: 280 }}
    >
      <Group gap="xs">
        <Text fw={600}>{group.label}</Text>
        <Badge color={group.color} variant="filled" size="sm">
          {group.assets.length}
        </Badge>
      </Group>

      <Stack
        gap="xs"
        ref={setNodeRef}
        style={{
          minHeight: 140,
          padding: theme.spacing.xs,
          borderRadius: theme.radius.md,
          backgroundColor: isOver
            ? theme.colors.blue[0]
            : colorScheme === 'dark'
              ? theme.colors.dark[6]
              : theme.colors.gray[0],
          border: `1px dashed ${isOver ? theme.colors.blue[5] : theme.colors.gray[3]}`,
          transition: 'background-color 150ms ease, border-color 150ms ease',
        }}
      >
        {hasCards ? (
          children
        ) : (
          <Text c={isOver ? 'blue' : 'dimmed'} size="sm" ta="center" py="md">
            {isOver ? 'Hier ablegen, um zu verschieben' : 'Keine Assets'}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

function KanbanCard({ asset, disableNavigation }: { asset: Asset; disableNavigation: boolean }) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: asset.id });

  const style: CSSProperties = {
    cursor: isDragging ? 'grabbing' : 'grab',
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.7 : 1,
    boxShadow: isDragging ? '0 8px 16px rgba(0, 0, 0, 0.15)' : undefined,
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disableNavigation) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    navigate(`/assets/${asset.id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!disableNavigation) {
        navigate(`/assets/${asset.id}`);
      }
    }
  };

  return (
    <Card
      ref={setNodeRef}
      shadow="sm"
      padding="sm"
      radius="md"
      withBorder
      style={{ textDecoration: 'none', ...style }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...listeners}
      {...attributes}
    >
      <Stack gap={4}>
        <Text fw={500} size="sm" lineClamp={1}>
          {asset.name}
        </Text>
        <Badge variant="light" size="xs">
          {asset.assetNumber}
        </Badge>
        {asset.location && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            📍 {asset.location}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

/**
 * Kanban view displaying assets grouped by status
 */
export function AssetKanbanView({ assets }: AssetKanbanViewProps) {
  const updateAsset = useUpdateAsset();
  const [suppressClick, setSuppressClick] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const scheduleClickRelease = useCallback(() => {
    window.setTimeout(() => {
      setSuppressClick(false);
    }, 120);
  }, []);

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    setSuppressClick(true);
  }, []);

  const groupedAssets = useMemo<ColumnData[]>(
    () =>
      statusGroups.map((group) => ({
        ...group,
        assets: assets.filter((a) => a.status === group.status),
      })),
    [assets],
  );

  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      scheduleClickRelease();
    },
    [scheduleClickRelease],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      scheduleClickRelease();
      const { active, over } = event;
      if (!over) {
        return;
      }

      const assetId = String(active.id);
      const targetStatus = String(over.id) as AssetStatus;
      const targetGroup = statusGroups.find((group) => group.status === targetStatus);
      if (!targetGroup) {
        return;
      }

      const asset = assets.find((item) => item.id === assetId);
      if (!asset || asset.status === targetStatus) {
        return;
      }

      updateAsset.mutate(
        { id: assetId, data: { status: targetStatus } },
        {
          onSuccess: () => {
            notifications.show({
              title: 'Status updated',
              message: `${asset.name} → ${targetGroup.label}`,
              color: 'green',
            });
          },
          onError: (error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            notifications.show({
              title: 'Failed to move asset',
              message,
              color: 'red',
            });
          },
        },
      );
    },
    [assets, scheduleClickRelease, updateAsset],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <ScrollArea>
        <Group align="flex-start" gap="md" style={{ minWidth: 'fit-content' }}>
          {groupedAssets.map((group) => (
            <KanbanColumn key={group.status} group={group}>
              {group.assets.map((asset) => (
                <KanbanCard key={asset.id} asset={asset} disableNavigation={suppressClick} />
              ))}
            </KanbanColumn>
          ))}
        </Group>
      </ScrollArea>
    </DndContext>
  );
}
