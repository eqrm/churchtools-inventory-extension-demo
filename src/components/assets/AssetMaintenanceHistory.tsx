import { Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { HistoryTimeline } from '../common/HistoryTimeline';
import { createAssetHistorySource } from '../../services/assets/assetHistory';
import type { HistoryEventSource } from '../../utils/history/types';

const MAINTENANCE_EVENT_KINDS = new Set(['maintenance-stage']);
const MAINTENANCE_ACTIONS = new Set(['maintenance-performed']);

export interface AssetMaintenanceHistoryProps {
    assetId: string;
    assetName?: string;
}

export function AssetMaintenanceHistory({ assetId, assetName }: AssetMaintenanceHistoryProps) {
    const sources = useMemo<HistoryEventSource[]>(() => {
        const baseSource = createAssetHistorySource(assetId);

        return [
            {
                ...baseSource,
                queryKey: [...baseSource.queryKey, 'maintenance-only'],
                queryFn: async () => {
                    const events = await baseSource.queryFn();
                    return events.filter(event => {
                        if (MAINTENANCE_EVENT_KINDS.has(event.kind)) {
                            return true;
                        }

                        const action = event.metadata?.['action'];
                        if (typeof action === 'string' && MAINTENANCE_ACTIONS.has(action)) {
                            return true;
                        }

                        return event.tags?.some(tag => tag.label === 'maintenanceStatus' || tag.label === 'maintenancePlan');
                    });
                },
            },
        ];
    }, [assetId]);

    return (
        <Stack gap="md">
            <Text size="sm" c="dimmed">
                Maintenance events are recorded automatically when asset plans change status or completion details are updated.
            </Text>
            <HistoryTimeline
                entityType="asset"
                entityId={assetId}
                sources={sources}
                title="Maintenance history"
                emptyState={`No maintenance activity recorded for ${assetName ?? 'this asset'} yet.`}
            />
        </Stack>
    );
}
