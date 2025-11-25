import { useEffect, useMemo, useState } from 'react';
import { Button, Group, List, Modal, Stack, Text } from '@mantine/core';
import { IconChecklist, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { seedDemoData } from '../../services/demo/demoSeeder';
import { isDemoToolsEnabled } from '../../utils/environment/flags';
import { useDemoMetadataStore } from '../../state/offline/demoMetadataStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export function DemoDataModal(): JSX.Element | null {
    const demoToolsEnabled = isDemoToolsEnabled();
    const status = useDemoMetadataStore((state) => state.status);
    const metadata = useDemoMetadataStore((state) => state.metadata);
    const load = useDemoMetadataStore((state) => state.load);
    const refresh = useDemoMetadataStore((state) => state.refresh);
    const markModalDismissed = useDemoMetadataStore((state) => state.markModalDismissed);
    const { data: currentUser } = useCurrentUser();
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!demoToolsEnabled) {
            return;
        }
        if (status === 'idle') {
            void load();
        }
    }, [status, load, demoToolsEnabled]);

    const shouldOpen = useMemo(() => {
        if (!demoToolsEnabled) {
            return false;
        }
        if (status !== 'ready') {
            return false;
        }
        if (!metadata) {
            return false;
        }
        return !metadata.seededAt && !metadata.modalDismissedAt;
    }, [status, metadata, demoToolsEnabled]);

    if (!demoToolsEnabled) {
        return null;
    }

    const handleAccept = async () => {
        setIsProcessing(true);
        try {
            await seedDemoData({ person: currentUser ?? null });
            await refresh();
            notifications.show({
                title: 'Demo data installed',
                message: 'Sample categories and assets have been added. You can reset them from Developer Tools.',
                color: 'green',
            });
        } catch (error) {
            console.error('Failed to seed demo data', error);
            notifications.show({
                title: 'Failed to install demo data',
                message: error instanceof Error ? error.message : 'An unexpected error occurred.',
                color: 'red',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        setIsProcessing(true);
        try {
            await markModalDismissed();
            notifications.show({
                title: 'Demo data skipped',
                message: 'You can seed demo data later from Developer Tools in Settings.',
                color: 'blue',
            });
        } catch (error) {
            console.error('Failed to dismiss demo modal', error);
            notifications.show({
                title: 'Unable to dismiss',
                message: error instanceof Error ? error.message : 'An unexpected error occurred.',
                color: 'red',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal opened={shouldOpen} onClose={handleDecline} title={renderTitle()} size="lg" centered>
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Kick-start your evaluation with curated sample data. We will generate categories, assets, and master data so you can explore the extension without touching real records.
                </Text>

                <List spacing="xs" size="sm" icon={<IconChecklist size={16} />}>
                    <List.Item>Four asset categories with deterministic icons and templates</List.Item>
                    <List.Item>Representative assets with booking-ready metadata</List.Item>
                    <List.Item>Automatic tagging so you can remove demo data with a single action</List.Item>
                </List>

                <Text size="xs" c="dimmed">
                    Demo content lives only in this module and can be cleared at any time from Settings → Developer Tools.
                </Text>

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={handleDecline} disabled={isProcessing}>
                        Not now
                    </Button>
                    <Button onClick={handleAccept} loading={isProcessing}>
                        Load demo data
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

function renderTitle(): JSX.Element {
    return (
        <Group gap="xs">
            <IconInfoCircle size={18} />
            <Text fw={600}>Explore with demo data</Text>
        </Group>
    );
}
