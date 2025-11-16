/**
 * MaintenanceRecordForm component (T172)
 * Form for recording completed maintenance
 */

import { Button, Group, NumberInput, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useCreateMaintenanceRecord, useMaintenanceSchedule, useUpdateMaintenanceSchedule } from '../../hooks/useMaintenance';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { calculateNextDue } from '../../utils/maintenanceCalculations';
import type { MaintenanceRecordCreate, MaintenanceType } from '../../types/entities';

interface MaintenanceRecordFormProps {
  assetId: string;
  assetNumber: string;
  assetName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const maintenanceTypes = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'testing', label: 'Testing' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
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
        title: 'Error',
        message: 'User not found',
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
      
      notifications.show({ title: 'Success', message: 'Maintenance recorded', color: 'green', icon: <IconCheck /> });
      form.reset();
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save maintenance record';
      notifications.show({ title: 'Error', message: msg, color: 'red', icon: <IconX /> });
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Select label="Maintenance type" data={maintenanceTypes} required {...form.getInputProps('type')} />
        <DateInput label="Date" required {...form.getInputProps('date')} />
        <TextInput label="Description" placeholder="e.g., Annual safety inspection" required {...form.getInputProps('description')} />
        <Textarea label="Notes" placeholder="Additional notes..." minRows={3} {...form.getInputProps('notes')} />
        <NumberInput label="Cost (€)" placeholder="0.00" decimalScale={2} min={0} {...form.getInputProps('cost')} />
        <Group justify="flex-end" mt="md">
          {onCancel && <Button variant="subtle" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={createRecord.isPending}>Log maintenance</Button>
        </Group>
      </Stack>
    </form>
  );
}
