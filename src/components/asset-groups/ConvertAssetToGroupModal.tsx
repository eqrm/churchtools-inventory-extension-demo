import { useEffect } from 'react';
import {
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { Asset, AssetGroupInheritanceRule } from '../../types/entities';
import { useConvertAssetToGroup } from '../../hooks/useAssetGroups';
import { useStorageProvider } from '../../hooks/useStorageProvider';
import { resolveNextAssetGroupBarcode } from '../../services/asset-groups/numbering';

interface ConvertAssetToGroupModalProps {
  asset: Asset;
  opened: boolean;
  onClose: () => void;
  onConverted?: () => void;
}

interface ConvertAssetToGroupFormValues {
  groupName: string;
  groupNumber: string;
  barcode: string;
  inheritManufacturer: boolean;
  inheritModel: boolean;
  inheritDescription: boolean;
}

function buildInheritanceOverrides(values: ConvertAssetToGroupFormValues): Record<string, AssetGroupInheritanceRule> {
  const overrides: Record<string, AssetGroupInheritanceRule> = {};

  overrides['manufacturer'] = {
    inherited: values.inheritManufacturer,
    overridable: false,
  };

  overrides['model'] = {
    inherited: values.inheritModel,
    overridable: false,
  };

  overrides['description'] = {
    inherited: values.inheritDescription,
    overridable: true,
  };

  return overrides;
}

export function ConvertAssetToGroupModal({ asset, opened, onClose, onConverted }: ConvertAssetToGroupModalProps) {
  const provider = useStorageProvider();
  const convertAsset = useConvertAssetToGroup();

  const form = useForm<ConvertAssetToGroupFormValues>({
    initialValues: {
      groupName: `${asset.name} Group`,
      groupNumber: asset.assetNumber,
      barcode: '',
      inheritManufacturer: true,
      inheritModel: true,
      inheritDescription: true,
    },
    validate: {
      groupName: (value) => (value.trim().length === 0 ? 'Group name is required' : null),
    },
  });

  useEffect(() => {
    if (!opened || !provider) {
      return;
    }

    let cancelled = false;

    const resolveIdentifiers = async () => {
      try {
        const nextBarcode = await resolveNextAssetGroupBarcode(provider);

        if (cancelled) {
          return;
        }

        if (!form.values.barcode) {
          form.setFieldValue('barcode', nextBarcode);
        }
      } catch (error) {
        console.error('Failed to resolve next asset group identifiers', error);
      }
    };

    void resolveIdentifiers();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, provider]);

  useEffect(() => {
    if (!opened) {
      form.setValues({
        groupName: `${asset.name} Group`,
        groupNumber: asset.assetNumber,
        barcode: '',
        inheritManufacturer: true,
        inheritModel: true,
        inheritDescription: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, asset.id]);

  const handleSubmit = async (values: ConvertAssetToGroupFormValues) => {
    try {
      await convertAsset.mutateAsync({
        assetId: asset.id,
        options: {
          groupName: values.groupName.trim(),
          groupNumber: values.groupNumber.trim() || undefined,
          barcode: values.barcode.trim() || undefined,
          inheritanceRules: buildInheritanceOverrides(values),
        },
      });

      notifications.show({
        title: 'Asset model created',
        message: `${asset.name} is now part of "${values.groupName}"`,
        color: 'green',
      });

      onConverted?.();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Unable to create model',
        message: error instanceof Error ? error.message : 'Unexpected error occurred.',
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create Asset Model" size="lg">
      <form onSubmit={form.onSubmit(values => {
        void handleSubmit(values);
      })}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Convert this asset into a reusable asset model. Existing data such as manufacturer and model can be shared with any new members you create later.
          </Text>

          <TextInput
            label="Model name"
            placeholder="e.g. Shure SM58 Microphones"
            required
            {...form.getInputProps('groupName')}
          />

          <Group grow align="flex-end">
            <TextInput
              label="Model number"
              placeholder="AG-001"
              {...form.getInputProps('groupNumber')}
            />
            <TextInput
              label="Model barcode"
              placeholder="7000001"
              {...form.getInputProps('barcode')}
            />
          </Group>

          <Textarea
            label="Description"
            placeholder="Provide context for this asset model"
            minRows={3}
            value={asset.description ?? ''}
            readOnly
          />

          <Stack gap="xs">
            <Text fw={500}>Shared fields</Text>
            <Switch
              label="Share manufacturer with assets in this model"
              {...form.getInputProps('inheritManufacturer', { type: 'checkbox' })}
            />
            <Switch
              label="Share model name with assets in this model"
              {...form.getInputProps('inheritModel', { type: 'checkbox' })}
            />
            <Switch
              label="Share description with assets in this model"
              {...form.getInputProps('inheritDescription', { type: 'checkbox' })}
            />
          </Stack>

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={convertAsset.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={convertAsset.isPending}>
              Create Model
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
