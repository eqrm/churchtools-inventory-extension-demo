import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Card, Menu, Stack, Table, Text } from '@mantine/core';
import {
    IconBan,
    IconCheck,
    IconDotsVertical,
    IconHourglassHigh,
    IconRotateClockwise,
} from '@tabler/icons-react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useMaintenancePlanStore } from '../../state/maintenance/planStore';
import { formatDateTime } from '../../utils/formatters';
import { MaintenanceCompletionDrawer } from './MaintenanceCompletionDrawer';
import { MaintenanceTeamList } from './MaintenanceTeamList';

type DrawerMode = 'complete' | 'skip' | 'pending';

const statusMeta = {
    pending: { label: 'Pending', color: 'yellow', icon: IconHourglassHigh },
    completed: { label: 'Completed', color: 'teal', icon: IconCheck },
    skipped: { label: 'Skipped', color: 'gray', icon: IconBan },
} as const;

export function MaintenanceCompletionTable() {
    const { state, markAssetCompleted, markAssetPending, markAssetSkipped } = useMaintenancePlanStore();
    const { data: currentUser } = useCurrentUser();

    const [drawerState, setDrawerState] = useState<{ assetId: string; mode: DrawerMode } | null>(null);

    const assets = state.assets;

    const activeAsset = useMemo(() => {
        if (!drawerState) {
            return null;
        }
        return assets.find((asset) => asset.assetId === drawerState.assetId) ?? null;
    }, [assets, drawerState]);

    const handleSubmit = (payload: { status: 'pending' | 'completed' | 'skipped'; notes?: string; occurredAt?: string }) => {
        const asset = activeAsset;
        if (!asset) {
            return;
        }

        if (payload.status === 'completed') {
            markAssetCompleted({
                assetId: asset.assetId,
                notes: payload.notes,
                occurredAt: payload.occurredAt,
                completedBy: currentUser
                    ? {
                          id: currentUser.id,
                          name: currentUser.name,
                      }
                    : undefined,
            });
        } else if (payload.status === 'pending') {
            markAssetPending({
                assetId: asset.assetId,
                reason: payload.notes,
                timestamp: payload.occurredAt,
            });
        } else {
            markAssetSkipped({
                assetId: asset.assetId,
                reason: payload.notes,
                timestamp: payload.occurredAt,
            });
        }

        setDrawerState(null);
    };

    if (assets.length === 0) {
        return (
            <Card withBorder>
                <Stack gap="sm">
                    <Text fw={600}>Asset completion tracking</Text>
                    <Text size="sm" c="dimmed">
                        Select one or more assets in the plan to unlock completion tracking.
                    </Text>
                </Stack>
            </Card>
        );
    }

    const disableActions = state.stage === 'draft';

    return (
        <>
            <Card withBorder>
                <Stack gap="md">
                    <Stack gap={4}>
                        <Text fw={600}>Asset completion tracking</Text>
                        <Text size="sm" c="dimmed">
                            Update each asset as work progresses. Completed assets automatically release their holds once the plan is finalized.
                        </Text>
                    </Stack>

                    <MaintenanceTeamList assets={assets} />

                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ width: '22%' }}>Asset number</Table.Th>
                                <Table.Th style={{ width: '28%' }}>Asset name</Table.Th>
                                <Table.Th style={{ width: '15%' }}>Status</Table.Th>
                                <Table.Th style={{ width: '15%' }}>Completed by</Table.Th>
                                <Table.Th style={{ width: '15%' }}>Timestamp</Table.Th>
                                <Table.Th>Notes</Table.Th>
                                <Table.Th style={{ width: 48 }} aria-label="Actions" />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {assets.map((asset) => {
                                const meta = statusMeta[asset.status];
                                const StatusIcon = meta.icon;
                                return (
                                    <Table.Tr key={asset.assetId}>
                                        <Table.Td>{asset.assetNumber}</Table.Td>
                                        <Table.Td>{asset.assetName}</Table.Td>
                                        <Table.Td>
                                            <Badge color={meta.color} leftSection={<StatusIcon size={12} />}>
                                                {meta.label}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>{asset.completedByName ?? '—'}</Table.Td>
                                        <Table.Td>{asset.completedAt ? formatDateTime(asset.completedAt) : '—'}</Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed" lineClamp={2}>
                                                {asset.notes ?? '—'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Menu position="bottom-end" withinPortal>
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle" aria-label="Open actions" disabled={disableActions}>
                                                        <IconDotsVertical size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        leftSection={<IconCheck size={16} />}
                                                        onClick={() => setDrawerState({ assetId: asset.assetId, mode: 'complete' })}
                                                    >
                                                        Log completion
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<IconRotateClockwise size={16} />}
                                                        onClick={() => setDrawerState({ assetId: asset.assetId, mode: 'pending' })}
                                                    >
                                                        Mark pending
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<IconBan size={16} />}
                                                        onClick={() => setDrawerState({ assetId: asset.assetId, mode: 'skip' })}
                                                    >
                                                        Skip asset
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Stack>
            </Card>

            <MaintenanceCompletionDrawer
                opened={drawerState !== null}
                asset={activeAsset}
                mode={drawerState?.mode ?? 'pending'}
                onClose={() => setDrawerState(null)}
                onSubmit={handleSubmit}
            />
        </>
    );
}
