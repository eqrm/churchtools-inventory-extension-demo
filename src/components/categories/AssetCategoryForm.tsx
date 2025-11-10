 
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
import type { AssetType, CustomFieldDefinition, AssetTypeCreate, AssetTypeUpdate } from '../../types/entities';
import {
  getStoredModuleDefaultPrefixId,
  getStoredPersonDefaultPrefixId,
  resolveAutoNumberingPreview,
  type AutoNumberingPreview,
  type AutoNumberingSource,
} from '../../services/assets/autoNumbering';

interface AssetTypeFormProps {
  category?: AssetType;
  initialData?: {
    name: string;
    icon?: string;
    customFields: Omit<CustomFieldDefinition, 'id'>[];
  };
  onSuccess?: (category: AssetType) => void;
  onCancel?: () => void;
}

export function AssetTypeForm({ category, initialData, onSuccess, onCancel }: AssetTypeFormProps) {
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
    customFields: CustomFieldDefinition[];
  }>({
    initialValues: {
      name: category?.name || initialData?.name || '',
      icon: category?.icon || initialData?.icon || '',
  assetNameTemplate: category?.assetNameTemplate ?? '%Manufacturer% %Model% %Asset Number%',
      customFields: category?.customFields || (initialData?.customFields.map((field, index) => ({
        ...field,
        id: `field-${Date.now().toString()}-${index.toString()}`,
      }))) || [],
    },
    validate: {
      name: (value) => {
        if (!value.trim()) return 'Category name is required';
        if (value.length < 2) return 'Category name must be at least 2 characters';
        if (value.length > 100) return 'Category name must not exceed 100 characters';
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

  // Update form when category prop changes
  useEffect(() => {
    if (category) {
      form.setValues({
        name: category.name,
        icon: category.icon || '',
        customFields: category.customFields,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (isEditing) {
        const payload: AssetTypeUpdate = {
          name: values.name,
          icon: values.icon || undefined,
          assetNameTemplate: values.assetNameTemplate || undefined,
          customFields: values.customFields,
        };

        const updated = await updateAssetType.mutateAsync({
          id: category.id,
          data: payload,
        });
        notifications.show({
          title: 'Success',
          message: `Category "${updated.name}" has been updated`,
          color: 'green',
        });
        onSuccess?.(updated);
      } else {
        const categoryData: AssetTypeCreate = {
          name: values.name,
          icon: values.icon || undefined,
          assetNameTemplate: values.assetNameTemplate || undefined,
          customFields: values.customFields,
        };
        const created = await createAssetType.mutateAsync(categoryData);
        notifications.show({
          title: 'Success',
          message: `Category "${created.name}" has been created`,
          color: 'green',
        });
        form.reset();
        onSuccess?.(created);
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save category',
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

    const refreshAutoNumberPreview = async () => {
      if (prefixes.length === 0) {
        if (!cancelled) {
          setAutoNumberPreview(null);
        }
        return;
      }

      const moduleDefault = getStoredModuleDefaultPrefixId();
  const personDefault = currentUserId ? await getStoredPersonDefaultPrefixId(currentUserId) : null;
      const preview = resolveAutoNumberingPreview({
        prefixes,
        personDefaultPrefixId: personDefault,
        moduleDefaultPrefixId: moduleDefault,
      });

      if (!cancelled) {
        setAutoNumberPreview(preview);
      }
    };

    void refreshAutoNumberPreview();

    return () => {
      cancelled = true;
    };
  }, [prefixes, currentUserId]);

  const autoNumberingSourceLabel = autoNumberPreview ? describeAutoNumberingSource(autoNumberPreview.source) : null;

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Category Name"
          placeholder="e.g., Sound Equipment, Cameras, Microphones"
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
            Optional icon to represent this category
          </Text>
        </Stack>

        <Divider label="Custom Fields" labelPosition="left" />

        <Divider label="Asset Name Template" labelPosition="left" mt="xl" />

        <Text size="sm" c="dimmed">
          Define how asset names are generated for this category. Use variables like %Manufacturer%, %Model%, %Asset Number% and any custom field names wrapped in %%. Example: <code>%Manufacturer% %Model% %Asset Number%</code>
        </Text>

        {prefixesLoading ? (
          <Text size="xs" c="dimmed">Loading prefix defaults…</Text>
        ) : autoNumberPreview?.nextAssetNumber ? (
          <Group gap="xs">
            <Text size="xs" c="dimmed">Default asset number preview:</Text>
            <Badge color={autoNumberPreview.prefix?.color ?? 'blue'} variant="light" size="sm">
              {autoNumberPreview.nextAssetNumber}
            </Badge>
            {autoNumberingSourceLabel && (
              <Text size="xs" c="dimmed">{autoNumberingSourceLabel}</Text>
            )}
          </Group>
        ) : (
          <Text size="xs" c="red">
            Add an asset prefix in Settings to enable automatic numbering.
          </Text>
        )}

        <Group align="flex-start">
          <TextInput
            label="Default Asset Name Template"
            placeholder="%Manufacturer% %Model% %Asset Number%"
            {...form.getInputProps('assetNameTemplate')}
            style={{ flex: 1 }}
          />
          <Tooltip
            label={<div>
              <div><strong>Available variables</strong></div>
              <div>%Manufacturer%</div>
              <div>%Model%</div>
              <div>%Asset Number%</div>
              <div>%Serial Number%</div>
              <div>Also use custom field names like %Color%</div>
            </div>}
            withArrow
          >
            <ActionIcon variant="light">
              <IconInfoCircle size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Text size="sm" c="dimmed">
          Define custom fields that will be available for all assets in this category.
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
            Add Custom Field
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
            {isEditing ? 'Update Category' : 'Create Category'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function describeAutoNumberingSource(source: AutoNumberingSource): string {
  switch (source) {
    case 'person-default':
      return 'Based on your saved preference.';
    case 'module-default':
      return 'Using the module default prefix.';
    case 'collection-first':
      return 'Using the first available prefix.';
    case 'explicit':
      return 'Using the selected prefix.';
    default:
      return 'No prefix configured yet.';
  }
}
