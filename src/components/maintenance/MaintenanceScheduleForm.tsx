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
  { value: 'time-based', label: 'Zeitbasiert (Tage/Monate/Jahre)' },
  { value: 'usage-based', label: 'Nutzungsbasiert (Betriebsstunden)' },
  { value: 'event-based', label: 'Ereignisbasiert (Anzahl Buchungen)' },
  { value: 'fixed-date', label: 'Festes Datum (Jährlich)' },
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
        title: 'Fehlende Asset-Auswahl',
        message: 'Bitte wählen Sie ein Asset für diesen Wartungsplan aus.',
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
        notifications.show({ title: 'Erfolg', message: 'Wartungsplan aktualisiert', color: 'green', icon: <IconCheck /> });
      } else {
        await createSchedule.mutateAsync({
          assetId: selectedAssetId,
          ...baseData,
        } as MaintenanceScheduleCreate);
        notifications.show({ title: 'Erfolg', message: 'Wartungsplan erstellt', color: 'green', icon: <IconCheck /> });
      }
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fehler beim Speichern';
      notifications.show({ title: 'Fehler', message: msg, color: 'red', icon: <IconX /> });
    }
  });

  const scheduleType = form.values.scheduleType;

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        {allowAssetSelection && (
          <Select
            label="Asset"
            placeholder="Asset auswählen"
            data={assets.map((asset) => ({
              value: asset.id,
              label: `${asset.assetNumber} · ${asset.name}`,
            }))}
            searchable
            nothingFoundMessage={assetsLoading ? 'Lade Assets...' : 'Kein Asset gefunden'}
            disabled={assetsLoading}
            required
            {...form.getInputProps('selectedAssetId')}
          />
        )}
        <Select label="Wartungstyp" data={scheduleTypes} required {...form.getInputProps('scheduleType')} />
        
        {scheduleType === 'time-based' && (
          <>
            <NumberInput label="Tage" placeholder="z.B. 30" min={1} {...form.getInputProps('intervalDays')} />
            <NumberInput label="Monate" placeholder="z.B. 6" min={1} {...form.getInputProps('intervalMonths')} />
            <NumberInput label="Jahre" placeholder="z.B. 1" min={1} {...form.getInputProps('intervalYears')} />
          </>
        )}
        
        {scheduleType === 'usage-based' && (
          <NumberInput label="Betriebsstunden" placeholder="z.B. 100" min={1} required {...form.getInputProps('intervalHours')} />
        )}
        
        {scheduleType === 'event-based' && (
          <NumberInput label="Anzahl Buchungen" placeholder="z.B. 50" min={1} required {...form.getInputProps('intervalBookings')} />
        )}
        
        {scheduleType === 'fixed-date' && (
          <DateInput label="Datum" placeholder="Jährlich wiederkehrend" required {...form.getInputProps('fixedDate')} />
        )}

        <NumberInput label="Erinnerung (Tage vorher)" min={0} required {...form.getInputProps('reminderDaysBefore')} />

        <Group justify="flex-end" mt="md">
          {onCancel && <Button variant="subtle" onClick={onCancel}>Abbrechen</Button>}
          <Button type="submit" loading={createSchedule.isPending || updateSchedule.isPending}>
            {schedule ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
