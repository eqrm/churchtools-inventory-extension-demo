import { useEffect, useState } from 'react';
import {
  Button,
  Group,
  Stack,
  TextInput,
  Text,
  ActionIcon,
  Paper,
  Divider,
  Tooltip,
  Badge,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useCreateCategory, useUpdateCategory } from '../../hooks/useCategories';
import { useAssetPrefixes } from '../../hooks/useAssetPrefixes';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { CustomFieldDefinitionInput } from './CustomFieldDefinitionInput';
import { CustomFieldPreview } from './CustomFieldPreview';
import { IconPicker } from './IconPicker';
import type {
  AssetType,
  CustomFieldDefinition,
  AssetTypeCreate,
  AssetTypeUpdate,
} from '../../types/entities';
import {
  getStoredModuleDefaultPrefixId,
  getStoredPersonDefaultPrefixId,
  resolveAutoNumberingPreview,
  type AutoNumberingPreview,
  type AutoNumberingSource,
} from '../../services/assets/autoNumbering';

interface AssetTypeFormProps {
  category?: AssetType;
  onSuccess?: (assetType: AssetType) => void;
  onCancel?: () => void;
}

export function AssetTypeForm({ category, onSuccess, onCancel }: AssetTypeFormProps) {
  const isEditing = !!category;
  const createAssetType = useCreateCategory();
  const updateAssetType = useUpdateCategory();
  const { data: prefixes = [], isLoading: prefixesLoading } = useAssetPrefixes();
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const [autoNumberPreview, setAutoNumberPreview] = useState<AutoNumberingPreview | null>(null);

  const form = useForm<{
    name: string;
    icon?: string;
    assetNameTemplate?: string;
    defaultBookable: boolean;
    customFields: CustomFieldDefinition[];
  }>({
    initialValues: {
      name: category?.name ?? '',
      icon: category?.icon ?? '',
      assetNameTemplate: category?.assetNameTemplate ?? '%Manufacturer% %Model% %Asset Number%',
      defaultBookable: category?.defaultBookable ?? true,
      customFields:
        category?.customFields ??
        [],
    },
    validate: {
      name: (value) => {
        if (!value.trim()) return 'Asset type name is required';
        if (value.length < 2) return 'Asset type name must be at least 2 characters';
        if (value.length > 100) return 'Asset type name cannot exceed 100 characters';
        return null;
      },
      customFields: {
        name: (value) => {
          if (!value || !value.trim()) return 'Field name is required';
          return null;
        },
      },
    },
  });

  useEffect(() => {
    if (category) {
      form.setValues({
        name: category.name,
        icon: category.icon ?? '',
        assetNameTemplate: category.assetNameTemplate ?? '%Manufacturer% %Model% %Asset Number%',
        defaultBookable: category.defaultBookable ?? true,
        customFields: category.customFields,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (category) {
        const payload: AssetTypeUpdate = {
          name: values.name,
          icon: values.icon || undefined,
          assetNameTemplate: values.assetNameTemplate || undefined,
          defaultBookable: values.defaultBookable,
          customFields: values.customFields,
        };

        const updated = await updateAssetType.mutateAsync({
          id: category.id,
          data: payload,
        });

        notifications.show({
          title: 'Success',
          message: `Asset type "${updated.name}" updated`,
          color: 'green',
        });
        onSuccess?.(updated);
      } else {
        const payload: AssetTypeCreate = {
          name: values.name,
          icon: values.icon || undefined,
          assetNameTemplate: values.assetNameTemplate || undefined,
          defaultBookable: values.defaultBookable,
          customFields: values.customFields,
        };

        const created = await createAssetType.mutateAsync(payload);
        notifications.show({
          title: 'Success',
          message: `Asset type "${created.name}" created`,
          color: 'green',
        });
        form.reset();
        onSuccess?.(created);
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Unable to save asset type',
        color: 'red',
      });
    }
  };

  const addCustomField = () => {
    const newField: CustomFieldDefinition = {
      id: `temp-${String(Date.now())}`,
      name: '',
      type: 'text',
      required: false,
    };
    form.insertListItem('customFields', newField);
  };

  const removeCustomField = (index: number) => {
    form.removeListItem('customFields', index);
  };

  const isPending = createAssetType.isPending || updateAssetType.isPending;

  useEffect(() => {
    let cancelled = false;

    const refreshPreview = async () => {
      if (prefixes.length === 0) {
        if (!cancelled) {
          setAutoNumberPreview(null);
        }
        return;
      }

      const moduleDefault = getStoredModuleDefaultPrefixId();
      const personDefault = currentUserId
        ? await getStoredPersonDefaultPrefixId(currentUserId)
        : null;
      const preview = resolveAutoNumberingPreview({
        prefixes,
        personDefaultPrefixId: personDefault,
        moduleDefaultPrefixId: moduleDefault,
      });

      if (!cancelled) {
        setAutoNumberPreview(preview);
      }
    };

    void refreshPreview();

    return () => {
      cancelled = true;
    };
  }, [prefixes, currentUserId]);

  const autoNumberingSourceLabel = autoNumberPreview
    ? describeAutoNumberingSource(autoNumberPreview.source)
    : null;

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Asset type name"
          placeholder="e.g., Audio, Cameras, Microphones"
          required
          {...form.getInputProps('name')}
          disabled={isPending}
        />

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Icon
          </Text>
          <IconPicker
            value={form.values.icon}
            onChange={(value) => {
              form.setFieldValue('icon', value);
            }}
            disabled={isPending}
          />
          <Text size="xs" c="dimmed">
            Optional icon to help identify this asset type
          </Text>
        </Stack>

        <Divider label="Asset names" labelPosition="left" mt="md" />

        <Text size="sm" c="dimmed">
          Configure how asset names are generated for this type. Available variables are
          %Manufacturer%, %Model%, %Asset Number%, %Serial Number%, and custom field names (e.g.,
          %Color%). Example: <code>%Manufacturer% %Model% %Asset Number%</code>
        </Text>

        {prefixesLoading ? (
          <Text size="xs" c="dimmed">
            Loading default prefixes…
          </Text>
        ) : autoNumberPreview?.nextAssetNumber ? (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Auto-number preview:
            </Text>
            <Badge color={autoNumberPreview.prefix?.color ?? 'blue'} variant="light" size="sm">
              {autoNumberPreview.nextAssetNumber}
            </Badge>
            {autoNumberingSourceLabel && (
              <Text size="xs" c="dimmed">
                {autoNumberingSourceLabel}
              </Text>
            )}
          </Group>
        ) : (
          <Text size="xs" c="red">
            Add a prefix under Settings to enable automatic numbering.
          </Text>
        )}

        <Group align="flex-start">
          <TextInput
            label="Asset name template"
            placeholder="%Manufacturer% %Model% %Asset Number%"
            {...form.getInputProps('assetNameTemplate')}
            style={{ flex: 1 }}
          />
          <Tooltip
            label={
              <div>
                <div>
                  <strong>Available variables</strong>
                </div>
                <div>%Manufacturer%</div>
                <div>%Model%</div>
                <div>%Asset Number%</div>
                <div>%Serial Number%</div>
                <div>Custom field names, e.g., %Color%</div>
              </div>
            }
            withArrow
          >
            <ActionIcon variant="light">
              <IconInfoCircle size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider label="Default settings" labelPosition="left" mt="xl" />

        <Switch
          label="Assets of this type are bookable by default"
          description="New assets will have bookable enabled. Can be changed per asset."
          {...form.getInputProps('defaultBookable', { type: 'checkbox' })}
          disabled={isPending}
        />

        <Divider label="Custom fields" labelPosition="left" mt="xl" />

        <Text size="sm" c="dimmed">
          Define additional fields that every asset of this type should expose.
        </Text>

        <Stack gap="md">
          {form.values.customFields.map((field, index) => (
            <Paper key={field.id} withBorder p="md" pos="relative">
              <ActionIcon
                color="red"
                variant="subtle"
                size="sm"
                pos="absolute"
                top={8}
                right={8}
                onClick={() => {
                  removeCustomField(index);
                }}
                disabled={isPending}
              >
                <IconTrash size={16} />
              </ActionIcon>

              <CustomFieldDefinitionInput
                value={field}
                onChange={(updated: CustomFieldDefinition) => {
                  form.setFieldValue(`customFields.${String(index)}`, updated);
                }}
                disabled={isPending}
              />
            </Paper>
          ))}

          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={addCustomField}
            disabled={isPending}
          >
            Add custom field
          </Button>
        </Stack>

        {form.values.customFields.length > 0 && (
          <>
            <Divider label="Preview" labelPosition="left" mt="xl" />
            <CustomFieldPreview fields={form.values.customFields} />
          </>
        )}

        <Group justify="flex-end" mt="xl">
          {onCancel && (
            <Button variant="default" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isPending}>
            {isEditing ? 'Update asset type' : 'Create asset type'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function describeAutoNumberingSource(source: AutoNumberingSource): string {
  switch (source) {
    case 'person-default':
      return 'Based on your saved prefix.';
    case 'module-default':
      return 'Uses the module default prefix.';
    case 'collection-first':
      return 'Uses the first available prefix.';
    case 'explicit':
      return 'Uses the selected prefix.';
    default:
      return 'No prefix configured yet.';
  }
}
