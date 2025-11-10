import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconBookmarkPlus, IconDeviceFloppy, IconTrash, IconX } from '@tabler/icons-react';
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
import { useAssetGroupTemplates } from '../../hooks/useAssetGroupTemplates';
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
}

function normalizeSharedCustomFields(
  values: Record<string, CustomFieldValue>,
  fields: CustomFieldDefinition[],
): Record<string, CustomFieldValue> {
  const allowed = new Set(fields.map(field => field.id));
  const result: Record<string, CustomFieldValue> = {};

  for (const [fieldId, value] of Object.entries(values)) {
    if (!allowed.has(fieldId)) {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    if (value === '') {
      continue;
    }

    result[fieldId] = value;
  }

  return result;
}

function mergeDefaults(
  rules: Record<string, AssetGroupInheritanceRule>,
): Record<string, AssetGroupInheritanceRule> {
  return {
    ...DEFAULT_ASSET_GROUP_INHERITANCE_RULES,
    ...rules,
  };
}

export function AssetGroupForm({ group, onSuccess, onCancel }: AssetGroupFormProps) {
  const { data: assetTypes = [] } = useCategories();
  const createGroup = useCreateAssetGroup();
  const updateGroup = useUpdateAssetGroup();
  const { templates, addTemplate, removeTemplate } = useAssetGroupTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

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

  useEffect(() => {
    setSelectedTemplateId(null);
  }, [group?.id]);

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

  const templateOptions = useMemo(() => (
    templates
      .map(template => ({ value: template.id, label: template.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ), [templates]);

  const applyTemplate = (templateId: string) => {
    const template = templates.find(item => item.id === templateId);
    if (!template) {
      return;
    }

    setSelectedTemplateId(templateId);
    form.setFieldValue('assetTypeId', template.assetTypeId);
    form.setFieldValue('manufacturer', template.data.manufacturer ?? '');
    form.setFieldValue('model', template.data.model ?? '');
    form.setFieldValue('description', template.data.description ?? '');
    form.setFieldValue('inheritanceRules', mergeDefaults(template.data.inheritanceRules));
    form.setFieldValue('customFieldRules', { ...template.data.customFieldRules });
    form.setFieldValue('sharedCustomFields', { ...template.data.sharedCustomFields });

    notifications.show({
      title: 'Template applied',
      message: `"${template.name}" configuration applied.`,
      color: 'blue',
    });
  };

  const handleTemplateDelete = () => {
    if (!selectedTemplateId) {
      return;
    }
    const template = templates.find(item => item.id === selectedTemplateId);
    if (!template) {
      return;
    }

    const confirmed = window.confirm(`Delete template "${template.name}"?`);
    if (!confirmed) {
      return;
    }

    removeTemplate(selectedTemplateId);
    setSelectedTemplateId(null);
    notifications.show({
      title: 'Template deleted',
      message: `Template "${template.name}" removed.`,
      color: 'orange',
    });
  };

  const handleTemplateSave = () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      notifications.show({
        title: 'Template name required',
        message: 'Enter a name before saving.',
        color: 'red',
      });
      return;
    }

    if (!form.values.assetTypeId) {
      notifications.show({
        title: 'Asset type required',
        message: 'Select an asset type before saving as a template.',
        color: 'red',
      });
      return;
    }

    addTemplate({
      name: trimmedName,
      assetTypeId: form.values.assetTypeId,
      data: {
        manufacturer: form.values.manufacturer || undefined,
        model: form.values.model || undefined,
        description: form.values.description || undefined,
        inheritanceRules: { ...form.values.inheritanceRules },
        customFieldRules: { ...form.values.customFieldRules },
        sharedCustomFields: { ...form.values.sharedCustomFields },
      },
    });

    notifications.show({
      title: 'Template saved',
      message: `Template "${trimmedName}" is ready to reuse.`,
      color: 'green',
    });

    setTemplateModalOpen(false);
    setTemplateName('');
  };

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

          <Stack gap="xs">
            <Select
              label="Apply Template"
              placeholder={templateOptions.length === 0 ? 'No templates saved yet' : 'Select template'}
              data={templateOptions}
              value={selectedTemplateId}
              onChange={(value) => {
                setSelectedTemplateId(value);
                if (value) {
                  applyTemplate(value);
                }
              }}
              clearable
              disabled={templateOptions.length === 0}
            />
            <Group justify="flex-end" gap="xs">
              <Button
                variant="default"
                leftSection={<IconBookmarkPlus size={16} />}
                onClick={() => setTemplateModalOpen(true)}
              >
                Save as Template
              </Button>
              {templateOptions.length > 0 && (
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  disabled={!selectedTemplateId}
                  onClick={handleTemplateDelete}
                >
                  Delete Template
                </Button>
              )}
            </Group>
          </Stack>

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
      <Modal
        opened={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          setTemplateName('');
        }}
        title="Save Template"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Templates capture inheritance and shared field settings so you can quickly spin up consistent groups.
          </Text>
          <TextInput
            label="Template Name"
            placeholder="Shared microphone settings"
            value={templateName}
            onChange={(event) => setTemplateName(event.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={() => {
                setTemplateModalOpen(false);
                setTemplateName('');
              }}
            >
              Cancel
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleTemplateSave}
            >
              Save Template
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
