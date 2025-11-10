import { useState } from 'react';
import { Button, Checkbox, Group, Modal, Select, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAdjustments } from '@tabler/icons-react';
import type { AssetGroup, AssetStatus, AssetUpdate } from '../../types/entities';
import { useBulkUpdateGroupMembers } from '../../hooks/useAssetGroups';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';
import { MasterDataSelectInput } from '../common/MasterDataSelectInput';
import { MASTER_DATA_DEFINITIONS, normalizeMasterDataName } from '../../utils/masterData';
import { useMasterData } from '../../hooks/useMasterDataNames';

interface BulkUpdateMembersModalProps {
  group: AssetGroup;
  opened: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

interface BulkUpdateFormValues {
  status: AssetStatus;
  location: string;
  manufacturer: string;
  model: string;
  description: string;
  bookable: boolean;
  clearOverrides: boolean;
}

function buildUpdatePayload(values: BulkUpdateFormValues, enabled: Record<keyof Omit<BulkUpdateFormValues, 'clearOverrides'>, boolean>): AssetUpdate {
  const update: AssetUpdate = {};
  if (enabled.status) update.status = values.status;
  if (enabled.location) update.location = values.location.trim() || undefined;
  if (enabled.manufacturer) update.manufacturer = values.manufacturer.trim() || undefined;
  if (enabled.model) update.model = values.model.trim() || undefined;
  if (enabled.description) update.description = values.description.trim() || undefined;
  if (enabled.bookable) update.bookable = values.bookable;
  return update;
}

export function BulkUpdateMembersModal({ group, opened, onClose, onCompleted }: BulkUpdateMembersModalProps) {
  const mutation = useBulkUpdateGroupMembers();
  const [enabled, setEnabled] = useState({
    status: false,
    location: false,
    manufacturer: false,
    model: false,
    description: false,
    bookable: false,
  });

  const form = useForm<BulkUpdateFormValues>({
    initialValues: {
      status: 'available',
      location: '',
      manufacturer: group.manufacturer ?? '',
      model: group.model ?? '',
      description: group.description ?? '',
      bookable: true,
      clearOverrides: false,
    },
  });
  const { names: locationNames, addItem: addLocation } = useMasterData(MASTER_DATA_DEFINITIONS.locations);

  const toggleField = (key: keyof typeof enabled) => {
    setEnabled((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSubmit = async (values: BulkUpdateFormValues) => {
    const update = buildUpdatePayload(values, enabled);
    const hasSelection = Object.keys(update).length > 0;

    if (!hasSelection && !values.clearOverrides) {
      notifications.show({
        title: 'Choose at least one update',
        message: 'Select a field to override or enable "Clear overrides".',
        color: 'yellow',
      });
      return;
    }

    try {
      await mutation.mutateAsync({
        groupId: group.id,
        updates: update,
        options: values.clearOverrides ? { clearOverrides: true } : undefined,
      });

      notifications.show({
        title: 'Members updated',
        message: 'Model members now share the selected values.',
        color: 'green',
      });

      onCompleted?.();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Bulk update failed',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Bulk update ${group.name}`} size="lg">
      <form onSubmit={form.onSubmit((values) => { void handleSubmit(values); })}>
        <Stack gap="md">
          <Checkbox
            label="Update status"
            checked={enabled.status}
            onChange={() => toggleField('status')}
          />
          {enabled.status && (
            <Select
              data={ASSET_STATUS_OPTIONS}
              value={form.values.status}
              onChange={(value) => value && form.setFieldValue('status', value as AssetStatus)}
            />
          )}

          <Checkbox
            label="Update location"
            checked={enabled.location}
            onChange={() => toggleField('location')}
          />
          {enabled.location && (
            <MasterDataSelectInput
              names={locationNames}
              placeholder="Select or type a location"
              value={form.values.location ?? ''}
              onChange={(value) => form.setFieldValue('location', value)}
              label="Location"
              nothingFound="No locations"
              onCreateOption={(name) => {
                const created = addLocation(name);
                return created?.name ?? normalizeMasterDataName(name);
              }}
            />
          )}

          <Checkbox
            label="Update manufacturer"
            checked={enabled.manufacturer}
            onChange={() => toggleField('manufacturer')}
          />
          {enabled.manufacturer && (
            <TextInput placeholder={group.manufacturer ?? 'Shure'} {...form.getInputProps('manufacturer')} />
          )}

          <Checkbox
            label="Update model"
            checked={enabled.model}
            onChange={() => toggleField('model')}
          />
          {enabled.model && (
            <TextInput placeholder={group.model ?? 'SM58'} {...form.getInputProps('model')} />
          )}

          <Checkbox
            label="Update description"
            checked={enabled.description}
            onChange={() => toggleField('description')}
          />
          {enabled.description && (
            <Textarea minRows={3} {...form.getInputProps('description')} />
          )}

          <Checkbox
            label="Update bookable flag"
            checked={enabled.bookable}
            onChange={() => toggleField('bookable')}
          />
          {enabled.bookable && (
            <Switch label="Members are bookable" {...form.getInputProps('bookable', { type: 'checkbox' })} />
          )}

          <Switch
            label="Clear member overrides"
            description="Reset field override tracking so members inherit shared values again."
            {...form.getInputProps('clearOverrides', { type: 'checkbox' })}
          />

          <Group justify="flex-end">
            <Button
              type="submit"
              leftSection={<IconAdjustments size={16} />}
              loading={mutation.isPending}
            >
              Apply Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
