/**
 * MaintenanceScheduleForm component (T173)
 * Configure recurring maintenance schedules
 */

import { Button, Group, NumberInput, Select, Stack } from '@mantine/core';
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

const scheduleTypes = [
  { value: 'time-based', label: 'Time-based (days/months/years)' },
  { value: 'usage-based', label: 'Usage-based (operating hours)' },
  { value: 'event-based', label: 'Event-based (number of bookings)' },
  { value: 'fixed-date', label: 'Fixed date (annual)' },
];

/**
 * Form for configuring maintenance schedules
 */
export function MaintenanceScheduleForm({ assetId, schedule, onSuccess, onCancel }: MaintenanceScheduleFormProps) {
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
        title: 'Asset required',
        message: 'Select an asset for this maintenance plan.',
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
        notifications.show({ title: 'Success', message: 'Maintenance plan updated', color: 'green', icon: <IconCheck /> });
      } else {
        await createSchedule.mutateAsync({
          assetId: selectedAssetId,
          ...baseData,
        } as MaintenanceScheduleCreate);
        notifications.show({ title: 'Success', message: 'Maintenance plan created', color: 'green', icon: <IconCheck /> });
      }
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save maintenance plan';
      notifications.show({ title: 'Error', message: msg, color: 'red', icon: <IconX /> });
    }
  });

  const scheduleType = form.values.scheduleType;

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        {allowAssetSelection && (
          <Select
            label="Asset"
            placeholder="Select asset"
            data={assets.map((asset) => ({
              value: asset.id,
              label: `${asset.assetNumber} · ${asset.name}`,
            }))}
            searchable
            nothingFoundMessage={assetsLoading ? 'Loading assets…' : 'No assets found'}
            disabled={assetsLoading}
            required
            {...form.getInputProps('selectedAssetId')}
          />
        )}
        <Select label="Maintenance type" data={scheduleTypes} required {...form.getInputProps('scheduleType')} />
        
        {scheduleType === 'time-based' && (
          <>
            <NumberInput label="Days" placeholder="e.g., 30" min={1} {...form.getInputProps('intervalDays')} />
            <NumberInput label="Months" placeholder="e.g., 6" min={1} {...form.getInputProps('intervalMonths')} />
            <NumberInput label="Years" placeholder="e.g., 1" min={1} {...form.getInputProps('intervalYears')} />
          </>
        )}
        
        {scheduleType === 'usage-based' && (
          <NumberInput label="Operating hours" placeholder="e.g., 100" min={1} required {...form.getInputProps('intervalHours')} />
        )}
        
        {scheduleType === 'event-based' && (
          <NumberInput label="Booking count" placeholder="e.g., 50" min={1} required {...form.getInputProps('intervalBookings')} />
        )}
        
        {scheduleType === 'fixed-date' && (
          <DateInput label="Date" placeholder="Occurs annually" required {...form.getInputProps('fixedDate')} />
        )}

        <NumberInput label="Remind (days before)" min={0} required {...form.getInputProps('reminderDaysBefore')} />

        <Group justify="flex-end" mt="md">
          {onCancel && <Button variant="subtle" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={createSchedule.isPending || updateSchedule.isPending}>
            {schedule ? 'Update' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
