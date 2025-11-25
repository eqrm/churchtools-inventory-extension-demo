import { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    ColorInput,
    Divider,
    Group,
    MultiSelect,
    Stack,
    Text,
    TextInput,
    Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconAlertCircle, IconCircleCheck, IconPlayerPlay, IconRotateClockwise } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAssets } from '../../hooks/useAssets';
import { useMaintenancePlanStore } from '../../state/maintenance/planStore';
import { getMasterDataDefinition } from '../../utils/masterData';
import { useMasterData } from '../../hooks/useMasterDataNames';
import { formatDateTime } from '../../utils/formatters';
import type { Asset, MaintenancePlanSchedule } from '../../types/entities';
import { applyHoldSyncResult, synchronizeMaintenancePlanHolds } from '../../services/maintenance/maintenanceCalendar';

const maintenanceCompanyDefinition = getMasterDataDefinition('maintenanceCompanies');

function toDate(value?: string) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value: Date | null): string | undefined {
    if (!value) return undefined;
    return value.toISOString().split('T')[0];
}

const stageLabels: Record<string, string> = {
    draft: 'Draft',
    planned: 'Planned',
    completed: 'Completed',
};

const stageColors: Record<string, string> = {
    draft: 'gray',
    planned: 'blue',
    completed: 'teal',
};

export function MaintenancePlanForm() {
    const {
        state,
        setName,
        setDescription,
        setNotes,
        setCompany,
        setIntervalRule,
        updateSchedule,
        addAssets,
        removeAsset,
        setAssetHold,
        advanceStage,
    } = useMaintenancePlanStore();

    const { data: assets = [], isLoading: assetsLoading } = useAssets();
    const { items: companyItems } = useMasterData(maintenanceCompanyDefinition);

    const [isSyncingHolds, setIsSyncingHolds] = useState(false);

    const syncPlanHolds = useCallback(async () => {
        const latestState = useMaintenancePlanStore.getState().state;
        const result = await synchronizeMaintenancePlanHolds(latestState);
        applyHoldSyncResult(result, setAssetHold);
        return result;
    }, [setAssetHold]);

    const synchronizeHolds = useCallback(
        async (options: { successMessage?: string; suppressSuccess?: boolean } = {}) => {
            setIsSyncingHolds(true);
            try {
                const result = await syncPlanHolds();
                if (
                    !options.suppressSuccess &&
                    options.successMessage &&
                    result &&
                    (result.created.length > 0 || result.released.length > 0)
                ) {
                    notifications.show({
                        color: 'green',
                        title: 'Maintenance holds updated',
                        message: options.successMessage,
                    });
                }
                return result;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error occurred.';
                notifications.show({
                    color: 'red',
                    title: 'Unable to update maintenance holds',
                    message,
                });
                return null;
            } finally {
                setIsSyncingHolds(false);
            }
        },
        [syncPlanHolds],
    );

    const notifyWarnings = useCallback((warnings: string[]) => {
        if (warnings.length === 0) {
            return;
        }

        notifications.show({
            color: 'yellow',
            title: 'Plan requirements',
            message: warnings.join(' '),
        });
    }, []);

    const handleAdvanceToPlanned = useCallback(async () => {
        advanceStage('planned');
        const latest = useMaintenancePlanStore.getState().state;

        if (latest.stage !== 'planned') {
            notifyWarnings(latest.stageWarnings);
            return;
        }

        await synchronizeHolds({ successMessage: 'Maintenance window reserved for selected assets.' });
    }, [advanceStage, notifyWarnings, synchronizeHolds]);

    const handleResetToDraft = useCallback(async () => {
        advanceStage('draft');
        const latest = useMaintenancePlanStore.getState().state;

        if (latest.stage === 'draft') {
            await synchronizeHolds({ successMessage: 'Maintenance holds released.' });
        }
    }, [advanceStage, synchronizeHolds]);

    const handleCompletePlan = useCallback(async () => {
        advanceStage('completed');
        const latest = useMaintenancePlanStore.getState().state;

        if (latest.stage !== 'completed') {
            notifyWarnings(latest.stageWarnings);
            return;
        }

        await synchronizeHolds({ successMessage: 'Maintenance plan completed and calendar holds released.' });
    }, [advanceStage, notifyWarnings, synchronizeHolds]);

    const handleScheduleUpdate = useCallback(
        (partial: Partial<MaintenancePlanSchedule>) => {
            updateSchedule(partial);
            const latest = useMaintenancePlanStore.getState().state;
            if (latest.stage === 'planned') {
                void synchronizeHolds({ suppressSuccess: true });
            }
        },
        [updateSchedule, synchronizeHolds],
    );

    const assetOptions = useMemo(() => {
        const mapped = assets.map((asset) => ({
            value: asset.id,
            label: `${asset.assetNumber} · ${asset.name}`,
        }));

        const existingIds = new Set(mapped.map((option) => option.value));
        state.assets.forEach((asset) => {
            if (!existingIds.has(asset.assetId)) {
                mapped.push({
                    value: asset.assetId,
                    label: `${asset.assetNumber} · ${asset.assetName}`,
                });
            }
        });

        return mapped;
    }, [assets, state.assets]);

    const companyOptions = useMemo(() => {
        const options = companyItems.map((company) => ({ value: company.id, label: company.name }));
        if (
            state.maintenanceCompanyId &&
            !options.some((option) => option.value === state.maintenanceCompanyId)
        ) {
            options.push({
                value: state.maintenanceCompanyId,
                label: state.maintenanceCompanyName ?? state.maintenanceCompanyId,
            });
        }
        return options;
    }, [companyItems, state.maintenanceCompanyId, state.maintenanceCompanyName]);

    const selectedAssetIds = useMemo(() => state.assets.map((asset) => asset.assetId), [state.assets]);

    const handleAssetChange = useCallback(
        (value: string[]) => {
            const selectedSet = new Set(value);
            const currentSet = new Set(selectedAssetIds);

            const addedIds = value.filter((id) => !currentSet.has(id));
            const removedIds = selectedAssetIds.filter((id) => !selectedSet.has(id));

            if (addedIds.length > 0) {
                const additions = addedIds
                    .map((id) => assets.find((asset) => asset.id === id))
                    .filter((asset): asset is Asset => Boolean(asset))
                    .map((asset) => ({
                        assetId: asset.id,
                        assetNumber: asset.assetNumber,
                        assetName: asset.name,
                    }));

                if (additions.length > 0) {
                    addAssets(additions);
                }
            }

            removedIds.forEach((id) => removeAsset(id));

            const nextState = useMaintenancePlanStore.getState().state;
            if (nextState.stage === 'planned') {
                void synchronizeHolds({ suppressSuccess: true });
            }
        },
        [assets, addAssets, removeAsset, selectedAssetIds, synchronizeHolds],
    );

    const handleCompanyChange = useCallback(
        (companyId: string | null) => {
            if (!companyId) {
                setCompany(null);
                return;
            }

            const target = companyItems.find((item) => item.id === companyId);
            if (target) {
                setCompany({ id: target.id, name: target.name });
            } else if (state.maintenanceCompanyName) {
                setCompany({ id: companyId, name: state.maintenanceCompanyName });
            } else {
                setCompany({ id: companyId, name: companyId });
            }
        },
        [companyItems, setCompany, state.maintenanceCompanyName],
    );

    const startDateValue = toDate(state.schedule.startDate);
    const endDateValue = toDate(state.schedule.endDate);

    const canMoveToPlanned = state.stage !== 'planned' && state.stage !== 'completed';
    const canResetToDraft = state.stage !== 'draft';
    const canComplete = state.stage !== 'completed';

    return (
        <Card withBorder>
            <Stack gap="lg">
                <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                        <TextInput
                            label="Plan name"
                            placeholder="Enter maintenance plan name"
                            value={state.name}
                            onChange={(event) => setName(event.currentTarget.value)}
                            required
                        />
                        <Textarea
                            label="Description"
                            placeholder="Describe the maintenance scope"
                            minRows={2}
                            value={state.description}
                            onChange={(event) => setDescription(event.currentTarget.value)}
                        />
                    </Stack>
                    <Badge color={stageColors[state.stage]} variant="light" size="lg">
                        {stageLabels[state.stage] ?? state.stage}
                    </Badge>
                </Group>

                <Group gap="sm">
                    <Button
                        leftSection={<IconPlayerPlay size={16} />}
                        onClick={handleAdvanceToPlanned}
                        disabled={!canMoveToPlanned || isSyncingHolds}
                        loading={isSyncingHolds}
                    >
                        Move to planned
                    </Button>
                    <Button
                        variant="light"
                        leftSection={<IconRotateClockwise size={16} />}
                        onClick={handleResetToDraft}
                        disabled={!canResetToDraft || isSyncingHolds}
                        loading={isSyncingHolds}
                    >
                        Reset to draft
                    </Button>
                    <Button
                        color="teal"
                        leftSection={<IconCircleCheck size={16} />}
                        onClick={handleCompletePlan}
                        disabled={!canComplete || isSyncingHolds}
                        loading={isSyncingHolds}
                    >
                        Complete plan
                    </Button>
                </Group>

                {state.stageWarnings.length > 0 && (
                    <Alert icon={<IconAlertCircle />} color="red" title="Plan requirements">
                        <Stack gap={4}>
                            {state.stageWarnings.map((warning) => (
                                <Text key={warning} size="sm">
                                    {warning}
                                </Text>
                            ))}
                        </Stack>
                    </Alert>
                )}

                <Stack gap="md">
                    <MultiSelect
                        label="Assets"
                        placeholder={assetsLoading ? 'Loading assets…' : 'Select one or more assets'}
                        data={assetOptions}
                        searchable
                        clearable
                        value={selectedAssetIds}
                        onChange={handleAssetChange}
                        nothingFoundMessage={assetsLoading ? 'Loading…' : 'No assets found'}
                    />

                    <Text size="sm" c="dimmed">
                        {selectedAssetIds.length === 0
                            ? 'Select at least one asset to prepare the plan.'
                            : `${selectedAssetIds.length} asset${selectedAssetIds.length === 1 ? '' : 's'} included in this plan.`}
                    </Text>
                </Stack>

                <Stack gap="md">
                    <Text fw={600}>Maintenance company</Text>
                    <MultiSelect
                        data={companyOptions}
                        value={state.maintenanceCompanyId ? [state.maintenanceCompanyId] : []}
                        onChange={(values) => handleCompanyChange(values[values.length - 1] ?? null)}
                        label="Preferred company"
                        placeholder="Select maintenance company"
                        searchable
                        clearable
                    />
                    {state.maintenanceCompanyName && (
                        <Text size="sm" c="dimmed">
                            Selected company: {state.maintenanceCompanyName}
                        </Text>
                    )}
                </Stack>

                <Divider label="Schedule window" labelPosition="center" />

                <Group grow>
                    <DateInput
                        label="Start date"
                        value={startDateValue}
                        onChange={(value) => handleScheduleUpdate({ startDate: toIsoDate(value) })}
                        placeholder="Select start date"
                    />
                    <DateInput
                        label="End date"
                        value={endDateValue}
                        onChange={(value) => handleScheduleUpdate({ endDate: toIsoDate(value) })}
                        placeholder="Select end date"
                        minDate={startDateValue ?? undefined}
                    />
                </Group>

                <Group gap="md" align="flex-end">
                    <ColorInput
                        label="Hold color"
                        format="hex"
                        value={state.schedule.holdColor}
                        onChange={(value) => handleScheduleUpdate({ holdColor: value || undefined })}
                        placeholder="#1c7ed6"
                    />
                    <TextInput
                        label="Interval rule"
                        placeholder="e.g. Quarterly"
                        value={state.intervalRule ?? ''}
                        onChange={(event) => setIntervalRule(event.currentTarget.value || undefined)}
                    />
                </Group>

                <Textarea
                    label="Internal notes"
                    placeholder="Add optional notes for technicians"
                    minRows={3}
                    value={state.notes}
                    onChange={(event) => setNotes(event.currentTarget.value)}
                />

                <Stack gap={4}>
                    {state.lastTransitionAt && (
                        <Text size="sm" c="dimmed">
                            Last stage update: {formatDateTime(state.lastTransitionAt)}
                        </Text>
                    )}
                    {state.completedAt && (
                        <Text size="sm" c="dimmed">
                            Completed on: {formatDateTime(state.completedAt)}
                        </Text>
                    )}
                </Stack>
            </Stack>
        </Card>
    );
}
