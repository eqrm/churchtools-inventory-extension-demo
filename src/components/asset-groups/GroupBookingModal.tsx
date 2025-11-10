import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconClock } from '@tabler/icons-react';
import type { Asset, AssetGroup, BookingCreate } from '../../types/entities';
import { useCreateGroupBooking } from '../../hooks/useAssetGroups';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import DateField from '../common/DateField';
import { PersonPicker } from '../common/PersonPicker';
import type { PersonSearchResult } from '../../services/person/PersonSearchService';

interface GroupBookingModalProps {
  group: AssetGroup;
  members: Asset[];
  opened: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

interface GroupBookingFormValues {
  bookingMode: 'single-day' | 'date-range';
  date: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  notes: string;
  stopOnError: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildBooking(values: GroupBookingFormValues, userName: string, userId: string, recipient?: PersonSearchResult): Omit<BookingCreate, 'asset' | 'kit' | 'quantity' | 'allocatedChildAssets'> {
  const startDate = values.bookingMode === 'single-day' ? values.date : values.startDate;
  const endDate = values.bookingMode === 'single-day' ? values.date : values.endDate;
  const data: Omit<BookingCreate, 'asset' | 'kit' | 'quantity' | 'allocatedChildAssets'> = {
    startDate,
    endDate,
    purpose: values.purpose.trim(),
    notes: values.notes.trim() || undefined,
    status: 'pending',
    bookingMode: values.bookingMode,
    bookedById: userId,
    bookedByName: userName,
    bookingForId: recipient?.id ?? userId,
    bookingForName: recipient?.displayName ?? userName,
    requestedBy: userId,
    requestedByName: userName,
  };

  if (values.bookingMode === 'single-day') {
    data.date = values.date;
  }

  if (values.startTime) data.startTime = values.startTime;
  if (values.endTime) data.endTime = values.endTime;

  return data;
}

function validateDates(values: GroupBookingFormValues): string | null {
  if (values.bookingMode === 'single-day') {
    if (!values.date) return 'Select a date for the booking.';
    if (values.startTime && values.endTime && values.startTime >= values.endTime) {
      return 'End time must be after start time.';
    }
    return null;
  }

  if (!values.startDate || !values.endDate) {
    return 'Select both start and end dates.';
  }
  if (values.startDate > values.endDate) {
    return 'Start date must be before end date.';
  }
  return null;
}

export function GroupBookingModal({ group, members, opened, onClose, onCompleted }: GroupBookingModalProps) {
  const mutation = useCreateGroupBooking();
  const { data: currentUser } = useCurrentUser();
  const [recipient, setRecipient] = useState<PersonSearchResult | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const form = useForm<GroupBookingFormValues>({
    initialValues: {
      bookingMode: 'single-day',
      date: todayISO(),
      startDate: todayISO(),
      endDate: todayISO(),
      startTime: '',
      endTime: '',
      purpose: `${group.name} reservation`,
      notes: '',
      stopOnError: true,
    },
  });

  const availableOptions = useMemo(() => members.filter((asset) => asset.status === 'available'), [members]);
  const assetOptions = useMemo(() => members.map((asset) => ({
    value: asset.id,
    label: `${asset.assetNumber} • ${asset.name}`,
    status: asset.status,
  })), [members]);

  useEffect(() => {
    if (!opened) return;
    const defaults = availableOptions.length > 0 ? availableOptions.map((asset) => asset.id) : members.map((asset) => asset.id);
    setSelectedAssets(defaults);
    form.setValues({
      ...form.values,
      date: form.values.date || todayISO(),
      startDate: form.values.startDate || todayISO(),
      endDate: form.values.endDate || todayISO(),
    });
    setRecipient(null);
  }, [opened, availableOptions, members, form]);

  const handleSubmit = async (values: GroupBookingFormValues) => {
    if (!currentUser) {
      notifications.show({
        title: 'Current user missing',
        message: 'Please wait for your user profile to load before creating bookings.',
        color: 'red',
      });
      return;
    }

    if (selectedAssets.length === 0) {
      notifications.show({
        title: 'Select members to book',
        message: 'Choose at least one asset from the group.',
        color: 'yellow',
      });
      return;
    }

    const dateError = validateDates(values);
    if (dateError) {
      notifications.show({ title: 'Check booking dates', message: dateError, color: 'yellow' });
      return;
    }

    const booking = buildBooking(values, currentUser.name, currentUser.id, recipient ?? undefined);

    try {
      const result = await mutation.mutateAsync({
        groupId: group.id,
        assetIds: selectedAssets,
        booking,
        stopOnError: values.stopOnError,
      });

      const successCount = result.successes.length;
      const failureCount = result.failures.length;

      if (successCount > 0) {
        notifications.show({
          title: 'Group booking scheduled',
          message: `${successCount} asset${successCount === 1 ? '' : 's'} booked for ${group.name}.`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      }

      if (failureCount > 0) {
        const details = result.failures.slice(0, 3).map((failure) => `• ${failure.assetId}: ${failure.error}`).join('\n');
        notifications.show({
          title: 'Some bookings failed',
          message: `${failureCount} member${failureCount === 1 ? '' : 's'} could not be booked.\n${details}${failureCount > 3 ? '\n…' : ''}`,
          color: 'orange',
        });
      }

      onCompleted?.();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Unable to create bookings',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create group booking" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Create identical bookings for multiple members of {group.name}. Members are preselected in the order they are available.
        </Text>

        <MultiSelect
          label="Members to include"
          data={assetOptions}
          value={selectedAssets}
          onChange={setSelectedAssets}
          searchable
          nothingFoundMessage="No members found"
        />

        <SegmentedControl
          value={form.values.bookingMode}
          onChange={(value) => {
            form.setFieldValue('bookingMode', value as 'single-day' | 'date-range');
            if (value === 'single-day') {
              form.setFieldValue('startDate', form.values.date);
              form.setFieldValue('endDate', form.values.date);
            }
          }}
          data={[
            { label: 'Single Day', value: 'single-day' },
            { label: 'Date Range', value: 'date-range' },
          ]}
        />

        {form.values.bookingMode === 'single-day' && (
          <Stack gap="sm">
            <DateField
              label="Booking date"
              value={form.values.date}
              onChange={(iso) => {
                const value = iso ?? '';
                form.setFieldValue('date', value);
                form.setFieldValue('startDate', value);
                form.setFieldValue('endDate', value);
              }}
            />
            <Group grow>
              <TimeInput
                label="Start time"
                leftSection={<IconClock size={16} />}
                {...form.getInputProps('startTime')}
              />
              <TimeInput
                label="End time"
                leftSection={<IconClock size={16} />}
                {...form.getInputProps('endTime')}
              />
            </Group>
          </Stack>
        )}

        {form.values.bookingMode === 'date-range' && (
          <Stack gap="sm">
            <Group align="flex-end">
              <DateField
                label="Start date"
                value={form.values.startDate}
                onChange={(iso) => form.setFieldValue('startDate', iso ?? '')}
              />
              <DateField
                label="End date"
                value={form.values.endDate}
                onChange={(iso) => form.setFieldValue('endDate', iso ?? '')}
              />
            </Group>
            <Group grow>
              <TimeInput
                label="Start time (optional)"
                leftSection={<IconClock size={16} />}
                {...form.getInputProps('startTime')}
              />
              <TimeInput
                label="End time (optional)"
                leftSection={<IconClock size={16} />}
                {...form.getInputProps('endTime')}
              />
            </Group>
          </Stack>
        )}

        <TextInput
          label="Purpose"
          placeholder="Sunday service"
          required
          {...form.getInputProps('purpose')}
        />

        <Textarea
          label="Notes"
          minRows={3}
          {...form.getInputProps('notes')}
        />

        <PersonPicker
          label="Booking for"
          value={recipient}
          onChange={setRecipient}
        />

        <Switch
          label="Stop on first failure"
          description="Halts booking creation when a member cannot be booked (recommended)"
          {...form.getInputProps('stopOnError', { type: 'checkbox' })}
        />

        <Group justify="flex-end">
          <Button
            onClick={() => {
              void handleSubmit(form.values);
            }}
            loading={mutation.isPending}
            leftSection={<IconCheck size={16} />}
          >
            Book Selected Members
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
