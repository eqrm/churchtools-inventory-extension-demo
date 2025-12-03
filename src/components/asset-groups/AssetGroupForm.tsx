import { useEffect, useMemo } from 'react';
import { Button, Card, Grid, Group, NumberInput, Select, Stack, Switch, Textarea, TextInput, Title } from '@mantine/core';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type {
  AssetGroup,
  AssetGroupCreate,
  AssetGroupInheritanceRule,
  AssetGroupUpdate,
  CustomFieldDefinition,
  CustomFieldValue,
} from '../../types/entities';
import { DEFAULT_ASSET_GROUP_INHERITANCE_RULES } from '../../services/asset-groups/constants';
import { useCategories } from '../../hooks/useCategories';
import {
  useCreateAssetGroup,
  useUpdateAssetGroup,
} from '../../hooks/useAssetGroups';
import { InheritanceRuleEditor } from './InheritanceRuleEditor';
import { CustomFieldInput } from '../assets/CustomFieldInput';
import { MainImageUpload } from '../common/MainImageUpload';

interface AssetGroupFormProps {
  group?: AssetGroup;
  onSuccess?: (group: AssetGroup) => void;
  onCancel?: () => void;
}

interface AssetGroupFormValues {
  name: string;
  groupNumber: string;
  barcode?: string;
  assetTypeId: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  mainImage: string | null;
  inheritanceRules: Record<string, AssetGroupInheritanceRule>;
  customFieldRules: Record<string, AssetGroupInheritanceRule>;
  sharedCustomFields: Record<string, CustomFieldValue>;
  // Unified AssetModel fields (from old AssetModel)
  defaultWarrantyMonths?: number;
  defaultBookable: boolean;
}

function normalizeSharedCustomFields(
  values: Record<string, CustomFieldValue>,
  fields: CustomFieldDefinition[],
): Record<string, CustomFieldValue> {
  if (fields.length === 0) {
    return {};
  }

  const allowed = new Set(fields.map((field) => field.id));
  const result: Record<string, CustomFieldValue> = {};

  for (const [fieldId, value] of Object.entries(values)) {
    if (allowed.has(fieldId)) {
      result[fieldId] = value;
    }
  }

  return result;
}

function mergeDefaults(
  rules: Record<string, AssetGroupInheritanceRule>,
): Record<string, AssetGroupInheritanceRule> {
  const merged: Record<string, AssetGroupInheritanceRule> = {};

  for (const [key, defaultRule] of Object.entries(DEFAULT_ASSET_GROUP_INHERITANCE_RULES)) {
    merged[key] = {
      inherited: defaultRule.inherited,
      overridable: defaultRule.overridable,
    };
  }

  for (const [key, rule] of Object.entries(rules)) {
    merged[key] = {
      inherited: rule.inherited,
      overridable: rule.overridable,
    };
  }

  return merged;
}

export function AssetGroupForm({ group, onSuccess, onCancel }: AssetGroupFormProps) {
  const { data: assetTypes = [] } = useCategories();
  const createGroup = useCreateAssetGroup();
  const updateGroup = useUpdateAssetGroup();

  const initialValues = useMemo<AssetGroupFormValues>(() => ({
    name: group?.name ?? '',
    groupNumber: group?.groupNumber ?? '',
    barcode: group?.barcode ?? '',
    assetTypeId: group?.assetType.id ?? '',
    manufacturer: group?.manufacturer ?? '',
    model: group?.model ?? '',
    description: group?.description ?? '',
    mainImage: group?.mainImage ?? null,
    inheritanceRules: mergeDefaults(group?.inheritanceRules ?? {}),
    customFieldRules: { ...(group?.customFieldRules ?? {}) },
    sharedCustomFields: { ...(group?.sharedCustomFields ?? {}) } as Record<string, CustomFieldValue>,
    // Unified AssetModel fields
    defaultWarrantyMonths: group?.defaultWarrantyMonths,
    defaultBookable: group?.defaultBookable ?? true,
  }), [group]);

  const form = useForm<AssetGroupFormValues>({
    initialValues,
    validate: {
      name: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Group name is required';
        }
        if (value.length < 2) {
          return 'Name must be at least 2 characters';
        }
        return null;
      },
      assetTypeId: (value) => (!value ? 'Asset type is required' : null),
    },
  });

  const assetTypeOptions = useMemo(() => {
    const options = assetTypes.map((assetType) => ({
      value: assetType.id,
      label: assetType.name,
    }));

    if (
      group &&
      group.assetType &&
      !options.find((option) => option.value === group.assetType.id)
    ) {
      options.push({ value: group.assetType.id, label: group.assetType.name });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [assetTypes, group]);

  const selectedAssetType = useMemo(() => {
    if (!form.values.assetTypeId) {
      return undefined;
    }
    return assetTypes.find((assetType) => assetType.id === form.values.assetTypeId);
  }, [assetTypes, form.values.assetTypeId]);

  useEffect(() => {
    // Ensure inheritance defaults always include required keys
    form.setFieldValue('inheritanceRules', mergeDefaults(form.values.inheritanceRules));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAssetType) {
      return;
    }

    const allowedCustomFieldIds = new Set(selectedAssetType.customFields.map((field) => field.id));

    const filteredRules = Object.fromEntries(
      Object.entries(form.values.customFieldRules)
        .filter(([fieldId]) => allowedCustomFieldIds.has(fieldId))
    );

    const filteredShared = Object.fromEntries(
      Object.entries(form.values.sharedCustomFields)
        .filter(([fieldId]) => allowedCustomFieldIds.has(fieldId))
    );

    selectedAssetType.customFields.forEach((field) => {
      if (!filteredRules[field.id]) {
        filteredRules[field.id] = { inherited: false, overridable: false };
      }
    });

    form.setValues({
      ...form.values,
      customFieldRules: filteredRules,
      sharedCustomFields: filteredShared as Record<string, CustomFieldValue>,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssetType?.id]);

  const isSubmitting = createGroup.isPending || updateGroup.isPending;

  const handleSubmit = async (values: AssetGroupFormValues) => {
    if (!selectedAssetType) {
      notifications.show({
        title: 'Asset type required',
        message: 'Choose an asset type before saving the model.',
        color: 'red',
      });
      return;
    }

    const basePayload = {
      groupNumber: values.groupNumber.trim() || undefined,
      name: values.name.trim(),
      barcode: values.barcode?.trim() || undefined,
      assetType: {
        id: selectedAssetType.id,
        name: selectedAssetType.name,
      },
      manufacturer: values.manufacturer?.trim() || undefined,
      model: values.model?.trim() || undefined,
      description: values.description?.trim() || undefined,
      inheritanceRules: mergeDefaults(values.inheritanceRules),
      customFieldRules: values.customFieldRules,
      sharedCustomFields: normalizeSharedCustomFields(values.sharedCustomFields, selectedAssetType.customFields),
      // Unified AssetModel fields
      defaultWarrantyMonths: values.defaultWarrantyMonths,
      defaultBookable: values.defaultBookable,
    } satisfies Partial<AssetGroup>;

    try {
      let result: AssetGroup;

      if (group) {
        const mainImageUpdate: string | null | undefined =
          values.mainImage === null ? null : values.mainImage ?? undefined;
        const updatePayload: AssetGroupUpdate = {
          ...basePayload,
          mainImage: mainImageUpdate,
        };
        result = await updateGroup.mutateAsync({ id: group.id, data: updatePayload });
        notifications.show({
          title: 'Asset model updated',
          message: `"${values.name}" has been updated.`,
          color: 'green',
        });
      } else {
        const createPayload: AssetGroupCreate = {
          ...basePayload,
          mainImage: values.mainImage ?? undefined,
        };
        result = await createGroup.mutateAsync(createPayload);
        notifications.show({
          title: 'Asset model created',
          message: `"${values.name}" is ready to use.`,
          color: 'green',
        });
      }

      onSuccess?.(result);
    } catch (error) {
      notifications.show({
        title: 'Unable to save asset model',
        message: error instanceof Error ? error.message : 'Unexpected error',
        color: 'red',
      });
    }
  };

  return (
    <Card withBorder>
      <form onSubmit={form.onSubmit((values) => {
        void handleSubmit(values);
      })}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={3}>{group ? 'Edit Asset Model' : 'Create Asset Model'}</Title>
            <Group gap="xs">
              {onCancel && (
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconX size={16} />}
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={16} />}
                loading={isSubmitting}
              >
                Save Model
              </Button>
            </Group>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="sm">
                <TextInput
                  label="Model Name"
                  placeholder="Shure SM58 Microphones"
                  required
                  {...form.getInputProps('name')}
                />
                <TextInput
                  label="Model Number (optional)"
                  placeholder="e.g. SM58"
                  {...form.getInputProps('groupNumber')}
                />
                <TextInput
                  label="Barcode"
                  placeholder="7000001"
                  {...form.getInputProps('barcode')}
                />
                <Select
                  label="Asset Type"
                  placeholder="Select type"
                  data={assetTypeOptions}
                  searchable
                  required
                  {...form.getInputProps('assetTypeId')}
                />
                <TextInput
                  label="Manufacturer"
                  placeholder="Shure"
                  {...form.getInputProps('manufacturer')}
                />
                <TextInput
                  label="Model"
                  placeholder="SM58"
                  {...form.getInputProps('model')}
                />
                <NumberInput
                  label="Default Warranty (Months)"
                  description="Applied when creating new assets from this model"
                  placeholder="12"
                  min={0}
                  max={120}
                  {...form.getInputProps('defaultWarrantyMonths')}
                />
                <Switch
                  label="Bookable by default"
                  description="New assets from this model will be bookable"
                  {...form.getInputProps('defaultBookable', { type: 'checkbox' })}
                />
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="sm">
                <Textarea
                  label="Description"
                  minRows={6}
                  placeholder="Provide details about this asset model"
                  {...form.getInputProps('description')}
                />
                <MainImageUpload
                  label="Main image"
                  description="Displayed in asset model lists and detail views."
                  value={form.values.mainImage}
                  onChange={(next) => {
                    form.setFieldValue('mainImage', next);
                  }}
                  disabled={isSubmitting}
                />
              </Stack>
            </Grid.Col>
          </Grid>

          <InheritanceRuleEditor
            rules={form.values.inheritanceRules}
            customFieldRules={form.values.customFieldRules}
            customFieldDefinitions={selectedAssetType?.customFields}
            onChange={(next) => {
              form.setFieldValue('inheritanceRules', next.rules);
              form.setFieldValue('customFieldRules', next.customFieldRules);
            }}
          />

          {selectedAssetType && selectedAssetType.customFields.length > 0 && (
            <Card withBorder radius="md" px="md" py="md">
              <Stack gap="sm">
                <Title order={5}>Shared Custom Fields</Title>
                {selectedAssetType.customFields.map((field) => (
                  <CustomFieldInput
                    key={field.id}
                    field={field}
                    value={form.values.sharedCustomFields[field.id]}
                    onChange={(value) => {
                      form.setFieldValue('sharedCustomFields', {
                        ...form.values.sharedCustomFields,
                        [field.id]: value,
                      });
                    }}
                    disabled={!form.values.customFieldRules[field.id]?.inherited}
                  />
                ))}
              </Stack>
            </Card>
          )}
        </Stack>
      </form>
    </Card>
  );
}
