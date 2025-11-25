import { useEffect, useState } from 'react';
import { Badge, Button, Card, Group, Modal, Stack, Text } from '@mantine/core';
import { IconDatabase, IconRefresh, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { resetDemoData, reseedDemoData } from '../../services/demo/demoSeeder';
import { isDemoToolsEnabled } from '../../utils/environment/flags';
import { useDemoMetadataStore } from '../../state/offline/demoMetadataStore';

export function DeveloperToolsCard(): JSX.Element | null {
    const demoToolsEnabled = isDemoToolsEnabled();
    const metadata = useDemoMetadataStore((state) => state.metadata);
    const status = useDemoMetadataStore((state) => state.status);
    const refresh = useDemoMetadataStore((state) => state.refresh);
    const load = useDemoMetadataStore((state) => state.load);
    const clearModalDismissed = useDemoMetadataStore((state) => state.clearModalDismissed);
    const [pendingAction, setPendingAction] = useState<'reset' | 'reseed' | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        if (status === 'idle') {
            void load();
        }
    }, [status, load]);

    if (!demoToolsEnabled) {
        return null;
    }

    const seededAtLabel = metadata?.seededAt ? formatTimestamp(metadata.seededAt) : 'Not seeded yet';
    const lastResetLabel = metadata?.lastResetAt ? formatTimestamp(metadata.lastResetAt) : 'Never';

    const openConfirm = (action: 'reset' | 'reseed') => {
        setPendingAction(action);
    };

    const closeConfirm = () => {
        if (isApplying) {
            return;
        }
        setPendingAction(null);
    };

    const handleConfirm = async () => {
        if (!pendingAction) {
            return;
        }

        setIsApplying(true);
        try {
            if (pendingAction === 'reset') {
                await resetDemoData();
                await clearModalDismissed();
                notifications.show({
                    title: 'Demo data cleared',
                    message: 'All demo entities were removed. The onboarding modal will reappear on next load.',
                    color: 'green',
                });
            } else {
                await reseedDemoData();
                notifications.show({
                    title: 'Demo data reinstalled',
                    message: 'Sample data has been refreshed with the latest templates.',
                    color: 'green',
                });
            }
            await refresh();
        } catch (error) {
            console.error('Developer tools action failed', error);
            notifications.show({
                title: 'Action failed',
                message: error instanceof Error ? error.message : 'An unexpected error occurred.',
                color: 'red',
            });
        } finally {
            setIsApplying(false);
            setPendingAction(null);
        }
    };

    const handleReopenModal = async () => {
        try {
            await clearModalDismissed();
            await refresh();
            notifications.show({
                title: 'Onboarding modal re-enabled',
                message: 'The demo data prompt will appear again on next load.',
                color: 'blue',
            });
        } catch (error) {
            console.error('Failed to re-enable modal', error);
            notifications.show({
                title: 'Unable to re-enable modal',
                message: error instanceof Error ? error.message : 'An unexpected error occurred.',
                color: 'red',
            });
        }
    };

    return (
        <Card withBorder padding="lg" radius="md">
            <Stack gap="md">
                <Group gap="xs">
                    <IconDatabase size={18} />
                    <Text fw={600}>Developer demo controls</Text>
                </Group>

                <Text size="sm" c="dimmed">
                    Manage demo data for local development. These actions are only available in development builds and never touch production records.
                </Text>

                <Group gap="md">
                    <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                            Seeded at
                        </Text>
                        <Badge color={metadata?.seededAt ? 'green' : 'gray'} variant="light">
                            {seededAtLabel}
                        </Badge>
                    </Stack>
                    <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                            Last reset
                        </Text>
                        <Badge color={metadata?.lastResetAt ? 'orange' : 'gray'} variant="light">
                            {lastResetLabel}
                        </Badge>
                    </Stack>
                </Group>

                <Group gap="sm">
                    <Button
                        leftSection={<IconTrash size={16} />}
                        variant="default"
                        onClick={() => openConfirm('reset')}
                        disabled={status === 'loading' || isApplying}
                    >
                        Reset demo data
                    </Button>
                    <Button
                        leftSection={<IconRefresh size={16} />}
                        onClick={() => openConfirm('reseed')}
                        disabled={status === 'loading' || isApplying}
                    >
                        Reseed demo data
                    </Button>
                    <Button variant="subtle" onClick={handleReopenModal} disabled={isApplying}>
                        Re-enable onboarding modal
                    </Button>
                </Group>
            </Stack>

            <Modal opened={pendingAction !== null} onClose={closeConfirm} withCloseButton={!isApplying} centered>
                <Stack gap="md">
                    <Text fw={600}>
                        {pendingAction === 'reset' ? 'Reset demo data?' : 'Reseed demo data?'}
                    </Text>
                    <Text size="sm" c="dimmed">
                        {pendingAction === 'reset'
                            ? 'This removes all demo entities tagged during seeding. Real data remains untouched.'
                            : 'This clears existing demo entities and installs the latest demo dataset.'}
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeConfirm} disabled={isApplying}>
                            Cancel
                        </Button>
                        <Button color="red" onClick={handleConfirm} loading={isApplying}>
                            {pendingAction === 'reset' ? 'Reset' : 'Reseed'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Card>
    );
}

function formatTimestamp(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}
