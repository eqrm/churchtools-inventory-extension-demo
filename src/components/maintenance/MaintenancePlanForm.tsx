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
import { useTranslation } from 'react-i18next';
import { useAssets } from '../../hooks/useAssets';
import { useMaintenancePlanStore } from '../../state/maintenance/planStore';
import { getMasterDataDefinition } from '../../utils/masterData';
import { useMasterData } from '../../hooks/useMasterDataNames';
import { formatDateTime } from '../../utils/formatters';
import type { Asset, MaintenancePlanSchedule } from '../../types/entities';
import { applyHoldSyncResult, syncMaintenancePlanHolds } from '../../services/maintenance/maintenanceCalendar';

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

    // Stage labels are localized at render time

const stageColors: Record<string, string> = {
    draft: 'gray',
    planned: 'blue',
    completed: 'teal',
};

export function MaintenancePlanForm() {
    const { t } = useTranslation('maintenance');
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
        const result = await syncMaintenancePlanHolds(latestState);
        applyHoldSyncResult(result, setAssetHold);
        return result;
    }, [setAssetHold]);

    const syncHolds = useCallback(
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
                        title: t('plan.messages.holdsUpdatedTitle'),
                        message: options.successMessage,
                    });
                }
                return result;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error occurred.';
                notifications.show({
                    color: 'red',
                    title: t('plan.errors.holdsUpdateFailed'),
                    message,
                });
                return null;
            } finally {
                setIsSyncingHolds(false);
            }
        },
            [syncPlanHolds, t],
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

        await syncHolds({ successMessage: 'Maintenance window reserved for selected assets.' });
    }, [advanceStage, notifyWarnings, syncHolds]);

    const handleResetToDraft = useCallback(async () => {
        advanceStage('draft');
        const latest = useMaintenancePlanStore.getState().state;

        if (latest.stage === 'draft') {
            await syncHolds({ successMessage: 'Maintenance holds released.' });
        }
    }, [advanceStage, syncHolds]);

    const handleCompletePlan = useCallback(async () => {
        advanceStage('completed');
        const latest = useMaintenancePlanStore.getState().state;

        if (latest.stage !== 'completed') {
            notifyWarnings(latest.stageWarnings);
            return;
        }

        await syncHolds({ successMessage: 'Maintenance plan completed and calendar holds released.' });
    }, [advanceStage, notifyWarnings, syncHolds]);

    const handleScheduleUpdate = useCallback(
        (partial: Partial<MaintenancePlanSchedule>) => {
            updateSchedule(partial);
            const latest = useMaintenancePlanStore.getState().state;
            if (latest.stage === 'planned') {
                void syncHolds({ suppressSuccess: true });
            }
        },
        [updateSchedule, syncHolds],
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
                void syncHolds({ suppressSuccess: true });
            }
        },
        [assets, addAssets, removeAsset, selectedAssetIds, syncHolds],
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
                            label={t('plan.labels.name')}
                            placeholder={t('plan.placeholders.name')}
                            value={state.name}
                            onChange={(event) => setName(event.currentTarget.value)}
                            required
                        />
                        <Textarea
                            label={t('plan.labels.description')}
                            placeholder={t('plan.placeholders.description')}
                            minRows={2}
                            value={state.description}
                            onChange={(event) => setDescription(event.currentTarget.value)}
                        />
                    </Stack>
                    <Badge color={stageColors[state.stage]} variant="light" size="lg">
                        {t(`plan.stages.${state.stage}`)}
                    </Badge>
                </Group>

                <Group gap="sm">
                    <Button
                        leftSection={<IconPlayerPlay size={16} />}
                        onClick={handleAdvanceToPlanned}
                        disabled={!canMoveToPlanned || isSyncingHolds}
                        loading={isSyncingHolds}
                    >
                        {t('plan.actions.moveToPlanned')}
                    </Button>
                    <Button
                        variant="light"
                        leftSection={<IconRotateClockwise size={16} />}
                        onClick={handleResetToDraft}
                        disabled={!canResetToDraft || isSyncingHolds}
                        loading={isSyncingHolds}
                    >
                        {t('plan.actions.resetToDraft')}
                    </Button>
                    <Button
                        color="teal"
                        leftSection={<IconCircleCheck size={16} />}
                        onClick={handleCompletePlan}
                        disabled={!canComplete || isSyncingHolds}
                        loading={isSyncingHolds}
                    >
                        {t('plan.actions.complete')}
                    </Button>
                </Group>

                {state.stageWarnings.length > 0 && (
                    <Alert icon={<IconAlertCircle />} color="red" title={t('plan.requirements.title')}>
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
                        label={t('plan.labels.assets')}
                        placeholder={assetsLoading ? t('plan.placeholders.loadingAssets') : t('plan.placeholders.selectAssets')}
                        data={assetOptions}
                        searchable
                        clearable
                        value={selectedAssetIds}
                        onChange={handleAssetChange}
                        nothingFoundMessage={assetsLoading ? 'Loading…' : 'No assets found'}
                    />

                    <Text size="sm" c="dimmed">
                        {selectedAssetIds.length === 0
                            ? t('plan.placeholders.selectAssetsPrompt')
                            : t('plan.labels.selectedCount', { count: selectedAssetIds.length })}
                    </Text>
                </Stack>

                <Stack gap="md">
                    <Text fw={600}>{t('plan.labels.company')}</Text>
                    <MultiSelect
                        data={companyOptions}
                        value={state.maintenanceCompanyId ? [state.maintenanceCompanyId] : []}
                        onChange={(values) => handleCompanyChange(values[values.length - 1] ?? null)}
                        label={t('plan.labels.preferredCompany')}
                        placeholder={t('plan.placeholders.selectCompany')}
                        searchable
                        clearable
                    />
                    {state.maintenanceCompanyName && (
                        <Text size="sm" c="dimmed">
                            {t('plan.labels.selectedCompany', { company: state.maintenanceCompanyName })}
                        </Text>
                    )}
                </Stack>

                <Divider label={t('plan.labels.scheduleWindow')} labelPosition="center" />

                <Group grow>
                    <DateInput
                        label={t('plan.labels.startDate')}
                        value={startDateValue}
                        onChange={(value) => handleScheduleUpdate({ startDate: toIsoDate(value) })}
                        placeholder={t('plan.placeholders.startDate')}
                    />
                    <DateInput
                        label={t('plan.labels.endDate')}
                        value={endDateValue}
                        onChange={(value) => handleScheduleUpdate({ endDate: toIsoDate(value) })}
                        placeholder={t('plan.placeholders.endDate')}
                        minDate={startDateValue ?? undefined}
                    />
                </Group>

                <Group gap="md" align="flex-end">
                    <ColorInput
                        label={t('plan.labels.holdColor')}
                        format="hex"
                        value={state.schedule.holdColor}
                        onChange={(value) => handleScheduleUpdate({ holdColor: value || undefined })}
                        placeholder={t('plan.placeholders.holdColor')}
                    />
                    <TextInput
                        label={t('plan.labels.intervalRule')}
                        placeholder={t('plan.placeholders.intervalRuleExample')}
                        value={state.intervalRule ?? ''}
                        onChange={(event) => setIntervalRule(event.currentTarget.value || undefined)}
                    />
                </Group>

                <Textarea
                    label={t('plan.labels.internalNotes')}
                    placeholder={t('plan.placeholders.internalNotes')}
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
