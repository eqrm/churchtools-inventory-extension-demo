/**
 * MaintenanceScheduleForm component (T173)
 * Configure recurring maintenance schedules
 */

import { Button, Group, NumberInput, Select, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useCreateMaintenanceSchedule, useUpdateMaintenanceSchedule } from '../../hooks/useMaintenance';
import { useAssets } from '../../hooks/useAssets';
import type { MaintenanceSchedule, MaintenanceScheduleCreate, ScheduleType } from '../../types/entities';

interface MaintenanceScheduleFormProps {
  assetId?: string;
  schedule?: MaintenanceSchedule;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const scheduleTypes = (t: (s: string, v?: unknown) => string) => [
  { value: 'time-based', label: t('scheduleForm.types.timeBased') },
  { value: 'usage-based', label: t('scheduleForm.types.usageBased') },
  { value: 'event-based', label: t('scheduleForm.types.eventBased') },
  { value: 'fixed-date', label: t('scheduleForm.types.fixedDate') },
];

/**
 * Form for configuring maintenance schedules
 */
export function MaintenanceScheduleForm({ assetId, schedule, onSuccess, onCancel }: MaintenanceScheduleFormProps) {
  const { t } = useTranslation('maintenance');
  const createSchedule = useCreateMaintenanceSchedule();
  const updateSchedule = useUpdateMaintenanceSchedule();
  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const allowAssetSelection = !assetId && !schedule;

  const form = useForm<{
    selectedAssetId: string;
    scheduleType: ScheduleType;
    intervalDays?: number | string;
    intervalMonths?: number | string;
    intervalYears?: number | string;
    intervalHours?: number | string;
    intervalBookings?: number | string;
    fixedDate?: Date | null;
    reminderDaysBefore: number | string;
  }>({
    initialValues: {
      selectedAssetId: schedule?.assetId || assetId || '',
      scheduleType: schedule?.scheduleType || 'time-based',
      intervalDays: schedule?.intervalDays || '',
      intervalMonths: schedule?.intervalMonths || '',
      intervalYears: schedule?.intervalYears || '',
      intervalHours: schedule?.intervalHours || '',
      intervalBookings: schedule?.intervalBookings || '',
      fixedDate: schedule?.fixedDate ? new Date(schedule.fixedDate) : null,
      reminderDaysBefore: schedule?.reminderDaysBefore || 7,
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const selectedAssetId = assetId ?? schedule?.assetId ?? values.selectedAssetId;

    if (!selectedAssetId) {
      notifications.show({
        title: t('scheduleForm.errors.assetRequiredTitle'),
        message: t('scheduleForm.errors.assetRequiredMessage'),
        color: 'red',
        icon: <IconX />,
      });
      return;
    }

    const baseData: Partial<MaintenanceScheduleCreate> & Partial<MaintenanceSchedule> = {
      scheduleType: values.scheduleType,
      reminderDaysBefore: Number(values.reminderDaysBefore),
    };

    // Add interval fields based on schedule type
    if (values.scheduleType === 'time-based') {
      if (values.intervalDays) baseData.intervalDays = Number(values.intervalDays);
      if (values.intervalMonths) baseData.intervalMonths = Number(values.intervalMonths);
      if (values.intervalYears) baseData.intervalYears = Number(values.intervalYears);
    } else if (values.scheduleType === 'usage-based') {
      baseData.intervalHours = Number(values.intervalHours);
    } else if (values.scheduleType === 'event-based') {
      baseData.intervalBookings = Number(values.intervalBookings);
    } else if (values.scheduleType === 'fixed-date' && values.fixedDate) {
      baseData.fixedDate = values.fixedDate.toISOString().split('T')[0];
    }

    try {
      if (schedule) {
        await updateSchedule.mutateAsync({ id: schedule.id, data: baseData });
        notifications.show({ title: t('messages.scheduleUpdated'), message: t('messages.scheduleUpdatedDescription'), color: 'green', icon: <IconCheck /> });
      } else {
        await createSchedule.mutateAsync({
          assetId: selectedAssetId,
          ...baseData,
        } as MaintenanceScheduleCreate);
        notifications.show({ title: t('messages.scheduleCreated'), message: t('messages.scheduleCreatedDescription'), color: 'green', icon: <IconCheck /> });
      }
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('errors.scheduleSaveFailed');
      notifications.show({ title: t('common:app.error'), message: msg, color: 'red', icon: <IconX /> });
    }
  });

  const scheduleType = form.values.scheduleType;

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        {allowAssetSelection && (
          <Select
            label={t('scheduleForm.labels.asset')}
            placeholder={t('scheduleForm.placeholders.asset')}
            data={assets.map((asset) => ({
              value: asset.id,
              label: `${asset.assetNumber} · ${asset.name}`,
            }))}
            searchable
            nothingFoundMessage={assetsLoading ? t('scheduleForm.placeholders.loadingAssets') : t('scheduleForm.placeholders.noAssets')}
            disabled={assetsLoading}
            required
            {...form.getInputProps('selectedAssetId')}
          />
        )}
        <Select label={t('scheduleForm.labels.type')} data={scheduleTypes(t)} required {...form.getInputProps('scheduleType')} />
        
        {scheduleType === 'time-based' && (
          <>
            <NumberInput label={t('scheduleForm.labels.days')} placeholder={t('scheduleForm.placeholders.daysExample')} min={1} {...form.getInputProps('intervalDays')} />
            <NumberInput label={t('scheduleForm.labels.months')} placeholder={t('scheduleForm.placeholders.monthsExample')} min={1} {...form.getInputProps('intervalMonths')} />
            <NumberInput label={t('scheduleForm.labels.years')} placeholder={t('scheduleForm.placeholders.yearsExample')} min={1} {...form.getInputProps('intervalYears')} />
          </>
        )}
        
        {scheduleType === 'usage-based' && (
          <NumberInput label={t('scheduleForm.labels.operatingHours')} placeholder={t('scheduleForm.placeholders.hoursExample')} min={1} required {...form.getInputProps('intervalHours')} />
        )}
        
        {scheduleType === 'event-based' && (
          <NumberInput label={t('scheduleForm.labels.bookingCount')} placeholder={t('scheduleForm.placeholders.bookingsExample')} min={1} required {...form.getInputProps('intervalBookings')} />
        )}
        
        {scheduleType === 'fixed-date' && (
          <DateInput label={t('scheduleForm.labels.date')} placeholder={t('scheduleForm.placeholders.annualDate')} required {...form.getInputProps('fixedDate')} />
        )}

        <NumberInput label={t('scheduleForm.labels.remindDaysBefore')} min={0} required {...form.getInputProps('reminderDaysBefore')} />

        <Group justify="flex-end" mt="md">
          {onCancel && <Button variant="subtle" onClick={onCancel}>{t('common:actions.cancel')}</Button>}
          <Button type="submit" loading={createSchedule.isPending || updateSchedule.isPending}>
            {schedule ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
