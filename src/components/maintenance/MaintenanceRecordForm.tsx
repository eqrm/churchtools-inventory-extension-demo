/**
 * MaintenanceRecordForm component (T172)
 * Form for recording completed maintenance
 */

import { Button, Group, NumberInput, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useCreateMaintenanceRecord, useMaintenanceSchedule, useUpdateMaintenanceSchedule } from '../../hooks/useMaintenance';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { calculateNextDue } from '../../utils/maintenanceCalculations';
import { bindSelectField } from '../../utils/selectControl';
import type { MaintenanceRecordCreate, MaintenanceType } from '../../types/entities';

interface MaintenanceRecordFormProps {
  assetId: string;
  assetNumber: string;
  assetName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const maintenanceTypes = (t: (s: string, v?: unknown) => string) => [
  { value: 'inspection', label: t('records.types.inspection') },
  { value: 'maintenance', label: t('records.types.maintenance') },
  { value: 'planned-repair', label: t('records.types.planned-repair') },
  { value: 'unplanned-repair', label: t('records.types.unplanned-repair') },
  { value: 'improvement', label: t('records.types.improvement') },
];

/**
 * Form for recording completed maintenance
 */
export function MaintenanceRecordForm({
  assetId,
  assetNumber,
  assetName,
  onSuccess,
  onCancel,
}: MaintenanceRecordFormProps) {
  const { t } = useTranslation('maintenance');
  const { data: currentUser } = useCurrentUser();
  const { data: schedule } = useMaintenanceSchedule(assetId);
  const createRecord = useCreateMaintenanceRecord();
  const updateSchedule = useUpdateMaintenanceSchedule();

  const form = useForm<{
    type: MaintenanceType;
    date: Date;
    description: string;
    notes: string;
    cost: number | string;
  }>({
    initialValues: {
      type: 'inspection',
      date: new Date(),
      description: '',
      notes: '',
      cost: '',
    },
    validate: {
      description: (value) => (value.trim() ? null : 'Description is required'),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    if (!currentUser) {
      notifications.show({
        title: t('common:app.error'),
        message: t('records.errors.userNotFound') ?? 'User not found',
        color: 'red',
        icon: <IconX />,
      });
      return;
    }

    const dateStr = values.date.toISOString().split('T')[0];
    if (!dateStr) return;

    const recordData: MaintenanceRecordCreate = {
      asset: { id: assetId, assetNumber, name: assetName },
      type: values.type,
      date: dateStr,
      performedBy: currentUser.id,
      performedByName: currentUser.name,
      description: values.description,
      notes: values.notes || undefined,
      cost: values.cost ? Number(values.cost) : undefined,
    };

    try {
      await createRecord.mutateAsync(recordData);
      
      // T184: Automatically update next due date if schedule exists
      if (schedule) {
        const nextDue = calculateNextDue(schedule, dateStr);
        if (nextDue) {
          await updateSchedule.mutateAsync({
            id: schedule.id,
            data: { nextDue },
          });
        }
      }
      
      notifications.show({ title: t('messages.recordCreated'), message: t('messages.recordCreatedDescription'), color: 'green', icon: <IconCheck /> });
      form.reset();
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('errors.recordSaveFailed');
      notifications.show({ title: t('common:app.error'), message: msg, color: 'red', icon: <IconX /> });
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Select
          label={t('records.columns.type')}
          data={maintenanceTypes(t)}
          required
          {...bindSelectField(form, 'type', {
            parse: (value) => value as MaintenanceType,
          })}
        />
        <DateInput label={t('records.columns.date')} required {...form.getInputProps('date')} />
        <TextInput label={t('records.columns.description')} placeholder={t('records.placeholders.descriptionExample')} required {...form.getInputProps('description')} />
        <Textarea label={t('records.labels.notes') ?? 'Notes'} placeholder={t('records.placeholders.notes') ?? 'Additional notes...'} minRows={3} {...form.getInputProps('notes')} />
        <NumberInput label={t('records.columns.cost') + ' (€)'} placeholder="0.00" decimalScale={2} min={0} {...form.getInputProps('cost')} />
        <Group justify="flex-end" mt="md">
          {onCancel && <Button variant="subtle" onClick={onCancel}>{t('common:actions.cancel')}</Button>}
          <Button type="submit" loading={createRecord.isPending}>{t('page.actions.logMaintenance')}</Button>
        </Group>
      </Stack>
    </form>
  );
}
