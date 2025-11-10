import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Select,
} from '@mantine/core';
import { IconUsersPlus } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { Asset, AssetGroup, AssetCreate, AssetStatus } from '../../types/entities';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';
import { useStorageProvider } from '../../hooks/useStorageProvider';
import { createGroupMembers } from '../../services/asset-groups/operations';
import { assetGroupKeys } from '../../hooks/useAssetGroups';
import { useQueryClient } from '@tanstack/react-query';
import { MasterDataSelectInput } from '../common/MasterDataSelectInput';
import { MASTER_DATA_DEFINITIONS, normalizeMasterDataName } from '../../utils/masterData';
import { useMasterData } from '../../hooks/useMasterDataNames';

interface AddAssetsToGroupModalProps {
  opened: boolean;
  onClose: () => void;
  group: AssetGroup;
  onAdded?: (assets: Asset[]) => void;
}

interface AddMembersFormValues {
  quantity: number;
  status: AssetStatus;
  location?: string;
  bookable: boolean;
  applySharedCustomFields: boolean;
}

export function AddAssetsToGroupModal({ opened, onClose, group, onAdded }: AddAssetsToGroupModalProps) {
  const provider = useStorageProvider();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { names: locationNames, addItem: addLocation } = useMasterData(MASTER_DATA_DEFINITIONS.locations);

  const sharedFieldCount = useMemo(() =>
    group.sharedCustomFields ? Object.keys(group.sharedCustomFields).length : 0,
  [group.sharedCustomFields]);

  const form = useForm<AddMembersFormValues>({
    initialValues: {
      quantity: 1,
      status: 'available',
      location: '',
      bookable: true,
      applySharedCustomFields: true,
    },
    validate: {
      quantity: (value) => (value <= 0 ? 'Quantity must be at least 1' : null),
    },
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (sharedFieldCount === 0) {
      form.setFieldValue('applySharedCustomFields', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, sharedFieldCount]);

  const handleSubmit = async (values: AddMembersFormValues) => {
    if (!provider) {
      notifications.show({
        title: 'Storage unavailable',
        message: 'Storage provider is still loading, please try again shortly.',
        color: 'red',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const baseData: Partial<AssetCreate> = {
        status: values.status,
        location: values.location?.trim() || undefined,
        bookable: values.bookable,
      };

      const assets = await createGroupMembers(group.id, values.quantity, {
        provider,
        baseData,
        applySharedCustomFields: values.applySharedCustomFields,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assetGroupKeys.members(group.id) }),
        queryClient.invalidateQueries({ queryKey: assetGroupKeys.detail(group.id) }),
      ]);

      notifications.show({
        title: 'Assets added',
        message: `${values.quantity} asset${values.quantity === 1 ? '' : 's'} added to ${group.name}.`,
        color: 'green',
      });

      onAdded?.(assets);
      form.reset();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Failed to add members',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  <Modal opened={opened} onClose={onClose} title={`Add assets to ${group.name}`} zIndex={220}>
      <form onSubmit={form.onSubmit((values) => {
        void handleSubmit(values);
      })}>
        <Stack gap="md">
          <NumberInput
            label="How many assets?"
            min={1}
            required
            {...form.getInputProps('quantity')}
          />

          <Select
            label="Status"
            data={ASSET_STATUS_OPTIONS}
            value={form.values.status}
            onChange={(value) => {
              if (value) {
                form.setFieldValue('status', value as AssetStatus);
              }
            }}
          />

          <MasterDataSelectInput
            names={locationNames}
            label="Location"
            placeholder="Select or type a location"
            description="Search existing locations or create a new one"
            value={form.values.location ?? ''}
            onChange={(value) => {
              form.setFieldValue('location', value);
            }}
            nothingFound="No locations"
            onCreateOption={(name) => {
              const created = addLocation(name);
              return created?.name ?? normalizeMasterDataName(name);
            }}
          />

          <Switch
            label="Members are bookable"
            {...form.getInputProps('bookable', { type: 'checkbox' })}
          />

          <Switch
            label="Apply shared custom fields"
            description={group.sharedCustomFields && Object.keys(group.sharedCustomFields).length > 0
              ? 'Inherit the model\'s shared custom field values when creating new assets.'
              : 'Shared custom fields are not configured for this model.'}
            disabled={!group.sharedCustomFields || Object.keys(group.sharedCustomFields).length === 0}
            {...form.getInputProps('applySharedCustomFields', { type: 'checkbox' })}
          />

          <Group justify="flex-end">
            <Button
              type="submit"
              leftSection={<IconUsersPlus size={16} />}
              loading={isSubmitting}
            >
              Add Assets
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
