 
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Grid,
  Group,
  Switch,
  NumberInput,
  Select,
  Stack,
  Textarea,
  TextInput,
  Title,
  Badge,
  Text,
  Modal,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconUsersGroup, IconX } from '@tabler/icons-react';
import { useCategories, useCategory } from '../../hooks/useCategories';
import { useCreateAsset, useCreateMultiAsset, useUpdateAsset } from '../../hooks/useAssets';
import { useAssetPrefixes } from '../../hooks/useAssetPrefixes';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useAssetModels } from '../../hooks/useAssetModels';
import {
  getStoredModuleDefaultPrefixId,
  getStoredPersonDefaultPrefixId,
  resolvePrefixForAutoNumbering,
  setStoredPersonDefaultPrefixId,
} from '../../services/assets/autoNumbering';
import { useMasterData } from '../../hooks/useMasterDataNames';
import { generateAssetNameFromTemplate, DEFAULT_ASSET_NAME_TEMPLATE } from '../../utils/assetNameTemplate';
import { MASTER_DATA_DEFINITIONS, normalizeMasterDataName } from '../../utils/masterData';
import { CustomFieldInput } from './CustomFieldInput';
import { MasterDataSelectInput } from '../common/MasterDataSelectInput';
import { MainImageUpload } from '../common/MainImageUpload';
import { ModelTemplateSelector } from '../models/ModelTemplateSelector';
import type { Asset, AssetCreate, AssetGroupFieldSource, AssetStatus, CustomFieldValue } from '../../types/entities';
import { validateCustomFieldValue } from '../../utils/validators';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';
import { useAssetGroup } from '../../hooks/useAssetGroups';
import { getInheritanceRuleForField } from '../../services/asset-groups/inheritance';
import { CUSTOM_FIELD_SOURCE_PREFIX } from '../../services/asset-groups/constants';

interface AssetFormProps {
  asset?: Asset;
  onSuccess?: (asset: Asset) => void;
  onCancel?: () => void;
}

interface AssetFormValues {
  name: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  mainImage: string | null;
  assetTypeId: string;
  prefixId?: string; // T272: Asset prefix selection
  status: AssetStatus;
  location?: string;
  parentAssetId?: string;
  isParent: boolean;
  quantity: number;
  bookable: boolean; // T070: Allow asset to be booked
  customFieldValues: Record<string, CustomFieldValue>;
}


export function AssetForm({ asset, onSuccess, onCancel }: AssetFormProps) {
  const isEditing = Boolean(asset);
  const { data: categories = [] } = useCategories();
  const { data: prefixes = [] } = useAssetPrefixes();
  const { models } = useAssetModels();
  const { names: locationNames, addItem: addLocation } = useMasterData(MASTER_DATA_DEFINITIONS.locations);
  const { names: manufacturerNames, addItem: addManufacturer } = useMasterData(
    MASTER_DATA_DEFINITIONS.manufacturers
  );
  const { names: modelNames, addItem: addModel } = useMasterData(MASTER_DATA_DEFINITIONS.models);
  const createAsset = useCreateAsset();
  const createMultiAsset = useCreateMultiAsset();
  const updateAsset = useUpdateAsset();
  const { data: currentUser } = useCurrentUser();
  const assetGroup = asset?.assetGroup;
  const { data: assetGroupDetail } = useAssetGroup(assetGroup?.id);
  
  // T064: Confirmation dialog for status changes on assigned assets
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [pendingStatus, setPendingStatus] = useState<AssetStatus | null>(null);

  // T118: Model template selection
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);


  const form = useForm<AssetFormValues>({
    initialValues: {
      name: asset?.name || '',
      manufacturer: asset?.manufacturer || '',
      model: asset?.model || '',
      description: asset?.description || '',
      mainImage: asset?.mainImage ?? null,
      assetTypeId: asset?.assetType.id || '',
      prefixId: '', // Default to first prefix or empty
      status: asset?.status || 'available',
      location: asset?.location || '',
      parentAssetId: asset?.parentAssetId || '',
      isParent: asset?.isParent || false,
      quantity: 1,
      bookable: asset?.bookable ?? true, // T070: Default to bookable
      customFieldValues: asset?.customFieldValues || {},
    },
    validate: {
      name: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Name is required';
        }
        if (value.length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (value.length > 200) {
          return 'Name must be less than 200 characters';
        }
        return null;
      },
      assetTypeId: (value) => (!value ? 'Asset type is required' : null),
    },
  });

  const currentUserId = currentUser?.id ?? null;
  const selectedPrefixId = form.values.prefixId;

  const [fieldSources, setFieldSources] = useState<Record<string, AssetGroupFieldSource>>({
    ...(asset?.fieldSources ?? {}),
  });

  useEffect(() => {
    setFieldSources({ ...(asset?.fieldSources ?? {}) });
  }, [asset?.fieldSources, asset?.id]);

  const prefixOptions = useMemo(
    () =>
      prefixes.map(prefix => ({
        value: prefix.id,
        label: prefix.description ? `${prefix.prefix} - ${prefix.description}` : prefix.prefix,
      })),
    [prefixes]
  );

  const selectedPrefix = useMemo(
    () => prefixes.find(prefix => prefix.id === selectedPrefixId) ?? null,
    [prefixes, selectedPrefixId]
  );

  const prefixDescription = selectedPrefix
    ? (
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Next asset number:
          </Text>
          <Badge color={selectedPrefix.color} size="sm">
            {`${selectedPrefix.prefix}-${String(selectedPrefix.sequence + 1).padStart(3, '0')}`}
          </Badge>
        </Group>
      )
    : 'Choose a prefix for this asset\'s numbering sequence';

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (selectedPrefixId) {
      return;
    }

    if (prefixes.length === 0) {
      return;
    }

    let cancelled = false;

    const applyStoredDefaults = async () => {
      const moduleDefault = getStoredModuleDefaultPrefixId();
      const personDefault = currentUserId ? await getStoredPersonDefaultPrefixId(currentUserId) : null;

      const resolution = resolvePrefixForAutoNumbering({
        prefixes,
        personDefaultPrefixId: personDefault,
        moduleDefaultPrefixId: moduleDefault,
      });

      if (!cancelled && resolution.prefixId) {
        form.setFieldValue('prefixId', resolution.prefixId);
      }
    };

    void applyStoredDefaults();

    return () => {
      cancelled = true;
    };
  }, [isEditing, prefixes, selectedPrefixId, currentUserId, form]);

  // Track whether the user has manually edited the name field. If not, we auto-fill
  // the name with a generated value based on other fields so the user sees a preview.
  const [nameManuallyEdited, setNameManuallyEdited] = useState<boolean>(Boolean(asset?.name));

  // Compute the generated name preview from template and relevant fields
  const generatedName = useMemo(() => {
    const prefixPreview = (() => {
      const selected = prefixes.find(p => p.id === form.values.prefixId);
      if (selected) return `${selected.prefix}-${String(selected.sequence + 1).padStart(3, '0')}`;
      return '';
    })();

    const data = {
      Manufacturer: form.values.manufacturer || '',
      Model: form.values.model || '',
      'Model Name': form.values.model || '',
      'Asset Number': prefixPreview,
      'Serial Number': '',
    } as Record<string, string>;

    return generateAssetNameFromTemplate(DEFAULT_ASSET_NAME_TEMPLATE, data);
  }, [form.values.manufacturer, form.values.model, form.values.prefixId, prefixes]);

  // Auto-fill the name if the user hasn't manually typed one
  useEffect(() => {
    if (!nameManuallyEdited) {
      form.setFieldValue('name', generatedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedName]);

  // When editing an existing asset, ensure its manufacturer/model are present in
  // the localStorage-backed lists so the CreatableSelect shows them consistently
  useEffect(() => {
    if (asset) {
      if (asset.location) addLocation(asset.location);
      if (asset.manufacturer) addManufacturer(asset.manufacturer);
      if (asset.model) addModel(asset.model);
    }
    // only run when asset changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id]);

  // Get selected category details
  const { data: selectedCategory } = useCategory(form.values.assetTypeId || '');

  // Update custom field values when category changes
  useEffect(() => {
    if (selectedCategory && !isEditing) {
      // Initialize custom fields with empty values
      const initialCustomFields: Record<string, CustomFieldValue> = {};
      selectedCategory.customFields.forEach((field) => {
        if (field.type === 'checkbox') {
          initialCustomFields[field.name] = false;
        } else if (field.type === 'multi-select') {
          initialCustomFields[field.name] = [];
        } else if (field.type === 'number') {
          initialCustomFields[field.name] = 0;
        } else {
          initialCustomFields[field.name] = '';
        }
      });
      form.setFieldValue('customFieldValues', initialCustomFields);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.id, isEditing]);

  const getFieldRule = useCallback(
    (fieldKey: string) => assetGroupDetail ? getInheritanceRuleForField(fieldKey, assetGroupDetail) : undefined,
    [assetGroupDetail],
  );

  const getFieldSource = useCallback(
    (fieldKey: string): AssetGroupFieldSource | 'local' => {
      const explicit = fieldSources[fieldKey];
      if (explicit) {
        return explicit;
      }
      const rule = getFieldRule(fieldKey);
      if (rule?.inherited) {
        return 'group';
      }
      return 'local';
    },
    [fieldSources, getFieldRule],
  );

  const isFieldInherited = useCallback(
    (fieldKey: string) => Boolean(assetGroup && getFieldRule(fieldKey)?.inherited && getFieldSource(fieldKey) === 'group'),
    [assetGroup, getFieldRule, getFieldSource],
  );

  const isFieldOverridden = useCallback(
    (fieldKey: string) => getFieldSource(fieldKey) === 'override',
    [getFieldSource],
  );

  const fieldSupportsOverride = useCallback(
    (fieldKey: string) => Boolean(assetGroup && getFieldRule(fieldKey)?.inherited && getFieldRule(fieldKey)?.overridable),
    [assetGroup, getFieldRule],
  );

  const updateFieldSource = useCallback((fieldKey: string, source: AssetGroupFieldSource | 'local') => {
    setFieldSources((prev) => {
      const next = { ...prev };
      if (source === 'local') {
        Reflect.deleteProperty(next, fieldKey);
      } else {
        next[fieldKey] = source;
      }
      return next;
    });
  }, []);

  const applyGroupValue = (fieldKey: string) => {
    if (!assetGroupDetail) {
      return;
    }

    switch (fieldKey) {
      case 'manufacturer':
        form.setFieldValue('manufacturer', assetGroupDetail.manufacturer ?? '');
        break;
      case 'model':
        form.setFieldValue('model', assetGroupDetail.model ?? '');
        break;
      case 'description':
        form.setFieldValue('description', assetGroupDetail.description ?? '');
        break;
      default:
        break;
    }
  };

  const applyGroupCustomFieldValue = (fieldId: string, fieldKey: string) => {
    if (!assetGroupDetail) {
      return;
    }

    const sharedValue = assetGroupDetail.sharedCustomFields?.[fieldId];
    if (sharedValue === undefined) {
      const { [fieldKey]: _removed, ...rest } = form.values.customFieldValues;
      form.setFieldValue('customFieldValues', rest);
      return;
    }

    form.setFieldValue('customFieldValues', {
      ...form.values.customFieldValues,
      [fieldKey]: sharedValue as CustomFieldValue,
    });
  };

  // T064: Handler for status changes with confirmation for assigned assets
  const handleStatusChange = (newStatus: string | null) => {
    if (!newStatus) return;
    
    const typedStatus = newStatus as AssetStatus;
    
    // If asset is currently assigned and status is being changed, show confirmation
    if (asset?.currentAssignmentId && typedStatus !== form.values.status) {
      setPendingStatus(typedStatus);
      openConfirm();
    } else {
      // No assignment or no change, update directly
      form.setFieldValue('status', typedStatus);
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      form.setFieldValue('status', pendingStatus);
      setPendingStatus(null);
    }
    closeConfirm();
  };

  const cancelStatusChange = () => {
    setPendingStatus(null);
    closeConfirm();
  };

  // T118: Handle model template selection
  const handleModelSelect = useCallback((modelId: string | null) => {
    setSelectedModelId(modelId);
    
    if (!modelId) {
      return;
    }

    const selectedModel = models.find((m) => m.id === modelId);
    if (!selectedModel) {
      return;
    }

    // Pre-fill form fields from model defaults
    if (selectedModel.manufacturer) {
      form.setFieldValue('manufacturer', selectedModel.manufacturer);
    }
    if (selectedModel.modelNumber) {
      form.setFieldValue('model', selectedModel.modelNumber);
    }

    // Apply default values from model
    if (selectedModel.defaultValues) {
      const { purchasePrice: _purchasePrice, location, notes, ...customDefaults } = selectedModel.defaultValues as {
        purchasePrice?: number;
        location?: string;
        notes?: string;
        [key: string]: unknown;
      };

      if (location) {
        form.setFieldValue('location', location);
      }
      if (notes) {
        form.setFieldValue('description', notes);
      }

      // Apply custom field defaults
      Object.entries(customDefaults).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setFieldValue('customFieldValues', {
            ...form.values.customFieldValues,
            [key]: value,
          });
        }
      });
    }
  }, [models, form]);

  const handleSubmit = async (values: AssetFormValues) => {
    try {
      // Ensure manufacturer/model values are persisted to localStorage-backed lists
      if (values.location) {
        addLocation(values.location);
      }
      if (values.manufacturer) {
        addManufacturer(values.manufacturer);
      }
      if (values.model) {
        addModel(values.model);
      }

      // Validate custom fields
      if (selectedCategory) {
        for (const field of selectedCategory.customFields) {
          const value = values.customFieldValues[field.name];
          const error = validateCustomFieldValue(value, field, field.name);
          if (error) {
            form.setFieldError(`customFieldValues.${field.name}`, error);
            return; // Stop submission if validation fails
          }
        }
      }

      if (isEditing && asset) {
        const nextFieldSources = assetGroup
          ? Object.entries(fieldSources).reduce<Record<string, AssetGroupFieldSource>>((acc, [key, value]) => {
              if (value === 'local') {
                return acc;
              }
              acc[key] = value;
              return acc;
            }, {})
          : undefined;

        // Update existing asset
        const updated = await updateAsset.mutateAsync({
          id: asset.id,
          data: {
            name: values.name,
            manufacturer: values.manufacturer || undefined,
            model: values.model || undefined,
            description: values.description || undefined,
            assetType: {
              id: values.assetTypeId,
              name: categories.find(c => c.id === values.assetTypeId)?.name || '',
            },
            status: values.status,
            location: values.location || undefined,
            parentAssetId: values.parentAssetId || undefined,
            bookable: values.bookable, // T070: Include bookable status
            customFieldValues: values.customFieldValues,
            mainImage: values.mainImage ?? null,
            isParent: asset.isParent,
            childAssetIds: asset.childAssetIds,
            barcode: asset.barcode,
            qrCode: asset.qrCode,
            fieldSources: nextFieldSources,
          },
        });

        notifications.show({
          title: 'Success',
          message: `Asset "${values.name}" has been updated`,
          color: 'green',
        });

        if (onSuccess) {
          onSuccess(updated);
        }
      } else {
        // Create new asset(s)
        const assetTypeName = categories.find(c => c.id === values.assetTypeId)?.name || '';
        
        const newAssetData: AssetCreate = {
          name: values.name,
          manufacturer: values.manufacturer || undefined,
          model: values.model || undefined,
          description: values.description || undefined,
          assetType: {
            id: values.assetTypeId,
            name: assetTypeName,
          },
          status: values.status,
          location: values.location || undefined,
          isParent: values.isParent,
          parentAssetId: values.parentAssetId || undefined,
          childAssetIds: [],
          bookable: values.bookable, // T070: Include bookable status
          customFieldValues: values.customFieldValues,
          prefixId: values.prefixId || undefined, // T272: Pass selected prefix
          fieldSources: assetGroup ? fieldSources : undefined,
        };

        if (values.mainImage !== null) {
          newAssetData.mainImage = values.mainImage;
        }

        // T092-T096: Handle multi-asset creation
        if (values.isParent && values.quantity >= 2) {
          const createdAssets = await createMultiAsset.mutateAsync({
            data: newAssetData,
            quantity: values.quantity,
          });

          const parentAsset = createdAssets[0];
          if (!parentAsset) {
            throw new Error('Failed to create parent asset');
          }

          // Photo upload removed — parent asset created without photos

          notifications.show({
            title: 'Success',
            message: `Created parent asset "${values.name}" with ${values.quantity} children (${parentAsset.assetNumber})`,
            color: 'green',
          });

          if (onSuccess) {
            onSuccess(parentAsset);
          }
        } else {
          const created = await createAsset.mutateAsync(newAssetData);

          // Photo upload removed — asset created without photos

          // Debug: show localStorage after creation
          try {
            console.warn('AssetForm: post-create assetManufacturers', localStorage.getItem('assetManufacturers'));
            console.warn('AssetForm: post-create assetModels', localStorage.getItem('assetModels'));
          } catch (err) {
            console.warn('AssetForm: failed to read localStorage after create', err);
          }

          notifications.show({
            title: 'Success',
            message: `Asset "${values.name}" has been created with number ${created.assetNumber}`,
            color: 'green',
          });

          if (onSuccess) {
            onSuccess(created);
          } else {
            // Reset form for creating another asset
            form.reset();
          }
        }
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save asset',
        color: 'red',
      });
    }
  };

  const isLoading = createAsset.isPending || updateAsset.isPending;

  return (
    <Card withBorder>
      <form onSubmit={form.onSubmit((values) => {
        void handleSubmit(values);
      })}>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>{isEditing ? 'Edit Asset' : 'Create New Asset'}</Title>
          </Group>

          {assetGroup && (
            <Alert
              icon={<IconUsersGroup size={16} />}
              color="grape"
              title="Asset model"
            >
              {assetGroupDetail
                ? `This asset inherits shared fields from ${assetGroupDetail.name}.`
                : 'Loading asset model details...'}
            </Alert>
          )}

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Name"
                placeholder="Asset name"
                required
                {...form.getInputProps('name')}
                onChange={(e) => {
                  // mark manual edit when user types anything different than generated preview
                  const val = e.currentTarget.value;
                  setNameManuallyEdited(val.trim().length > 0 && val !== generatedName);
                  form.setFieldValue('name', val);
                }}
                
              />

              {/* Compact UI: no inline generated-name preview; auto-fill still applies when the user hasn't edited the name. */}
            </Grid.Col>

            {/* asset-number info removed — generation is handled server-side and not shown here */}

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Asset Type"
                placeholder="Select asset type"
                required
                disabled={isEditing}
                data={categories.map(cat => ({
                  value: cat.id,
                  label: `${cat.icon || ''} ${cat.name}`.trim(),
                }))}
                {...form.getInputProps('assetTypeId')}
              />
            </Grid.Col>

            {/* T118: Model Template Selector - only show when creating new assets */}
            {!isEditing && models.length > 0 && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <ModelTemplateSelector
                  models={models}
                  selectedModelId={selectedModelId}
                  onSelect={handleModelSelect}
                  assetTypeId={form.values.assetTypeId || undefined}
                  disabled={!form.values.assetTypeId}
                />
              </Grid.Col>
            )}

            {/* T272: Asset Prefix Selector */}
            {!isEditing && prefixes.length > 0 && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="Asset Prefix"
                  placeholder="Select prefix"
                  description={prefixDescription}
                  descriptionProps={{ component: 'div' }}
                  data={prefixOptions}
                  value={form.values.prefixId || null}
                  clearable
                  onChange={(value) => {
                    form.setFieldValue('prefixId', value ?? '');
                    if (currentUser) {
                      void setStoredPersonDefaultPrefixId(currentUser, value ?? null);
                    }
                  }}
                />
              </Grid.Col>
            )}

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Status"
                placeholder="Select status"
                required
                data={[...ASSET_STATUS_OPTIONS]}
                value={form.values.status}
                onChange={handleStatusChange}
                error={form.errors['status']}
              />
            </Grid.Col>

            {/* T070: Bookable checkbox for asset availability filtering */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Checkbox
                label="Allow Booking"
                description="Enable this asset to be booked by users"
                {...form.getInputProps('bookable', { type: 'checkbox' })}
                mt="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <MasterDataSelectInput
                names={locationNames}
                label="Location"
                placeholder="Select or type location"
                description="Choose from pre-defined locations or add a new one"
                value={form.values.location || ''}
                onChange={(next) => form.setFieldValue('location', next)}
                nothingFound="No locations"
                error={form.errors['location']}
                onCreateOption={(name) => {
                  const created = addLocation(name);
                  return created?.name ?? normalizeMasterDataName(name);
                }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <MasterDataSelectInput
                names={manufacturerNames}
                label="Manufacturer"
                placeholder="Select or type manufacturer name"
                description="Choose from existing manufacturers or add a new one"
                value={form.values.manufacturer || ''}
                onChange={(next) => form.setFieldValue('manufacturer', next)}
                nothingFound="No manufacturers"
                error={form.errors['manufacturer'] as string | undefined}
                disabled={isEditing && assetGroup ? isFieldInherited('manufacturer') && !isFieldOverridden('manufacturer') : false}
                onCreateOption={(name) => {
                  const created = addManufacturer(name);
                  return created?.name ?? normalizeMasterDataName(name);
                }}
              />
              {isEditing && assetGroup && isFieldInherited('manufacturer') && (
                <Text size="xs" c="dimmed" mt={4}>
                  Inherited from {assetGroup.name}. Update the asset model to change this value.
                </Text>
              )}
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <MasterDataSelectInput
                names={modelNames}
                label="Model"
                placeholder="Select or type model name"
                description="Choose from existing models or add a new one"
                value={form.values.model || ''}
                onChange={(next) => form.setFieldValue('model', next)}
                nothingFound="No models"
                error={form.errors['model'] as string | undefined}
                disabled={isEditing && assetGroup ? isFieldInherited('model') && !isFieldOverridden('model') : false}
                onCreateOption={(name) => {
                  const created = addModel(name);
                  return created?.name ?? normalizeMasterDataName(name);
                }}
              />
              {isEditing && assetGroup && isFieldInherited('model') && (
                <Text size="xs" c="dimmed" mt={4}>
                  Inherited from {assetGroup.name}. Update the asset model to change this value.
                </Text>
              )}
            </Grid.Col>

            <Grid.Col span={12}>
              {assetGroup && fieldSupportsOverride('description') && (
                <Switch
                  size="sm"
                  label={`Override ${assetGroup.name} description`}
                  checked={isFieldOverridden('description')}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    if (checked) {
                      updateFieldSource('description', 'override');
                    } else {
                      updateFieldSource('description', 'group');
                      applyGroupValue('description');
                    }
                  }}
                  mb="xs"
                />
              )}
              <Textarea
                label="Description"
                placeholder="Additional details about this asset"
                rows={3}
                {...form.getInputProps('description')}
                disabled={isEditing && assetGroup ? isFieldInherited('description') && !isFieldOverridden('description') : false}
              />
              {assetGroup && isFieldInherited('description') && !isFieldOverridden('description') && (
                <Text size="xs" c="dimmed" mt={4}>
                  Inherited from {assetGroup.name}. Override this field to customize it for the asset.
                </Text>
              )}
              {assetGroup && isFieldOverridden('description') && (
                <Text size="xs" c="dimmed" mt={4}>
                  Currently overriding the shared description from {assetGroup.name}.
                </Text>
              )}
            </Grid.Col>

            <Grid.Col span={12}>
              <MainImageUpload
                label="Main Image"
                description="Displayed in asset lists and detail views."
                value={form.values.mainImage}
                onChange={(next) => form.setFieldValue('mainImage', next)}
                disabled={isLoading}
              />
            </Grid.Col>

            {/* T092: Parent Asset Checkbox */}
            {!isEditing && (
              <Grid.Col span={12}>
                <Checkbox
                  label="Create as parent asset with multiple children"
                  description="Check this to create multiple identical assets at once"
                  {...form.getInputProps('isParent', { type: 'checkbox' })}
                />
              </Grid.Col>
            )}

            {/* T093: Quantity Field (visible when isParent is true) */}
            {!isEditing && form.values.isParent && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <NumberInput
                  label="Quantity"
                  description="Number of child assets to create"
                  placeholder="Enter quantity"
                  min={2}
                  max={100}
                  required
                  {...form.getInputProps('quantity')}
                />
              </Grid.Col>
            )}
          </Grid>

          {/* Custom Fields */}
          {selectedCategory && selectedCategory.customFields.length > 0 && (
            <>
              <Title order={4} mt="md">Custom Fields</Title>
              <Grid>
                {selectedCategory.customFields.map((field) => (
                  <Grid.Col key={field.id} span={{ base: 12, md: 6 }}>
                    <Stack gap="xs">
                      {assetGroup && fieldSupportsOverride(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`) && (
                        <Switch
                          size="sm"
                          label={`Override ${assetGroup.name} value`}
                          checked={isFieldOverridden(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`)}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            const key = `${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`;
                            if (checked) {
                              updateFieldSource(key, 'override');
                            } else {
                              updateFieldSource(key, 'group');
                              applyGroupCustomFieldValue(field.id, field.name);
                            }
                          }}
                        />
                      )}
                      <CustomFieldInput
                        field={field}
                        value={form.values.customFieldValues[field.name]}
                        onChange={(value) => {
                          form.setFieldValue('customFieldValues', {
                            ...form.values.customFieldValues,
                            [field.name]: value,
                          });
                        }}
                        error={form.errors[`customFieldValues.${field.name}`] as string | undefined}
                        disabled={isLoading || (assetGroup ? isFieldInherited(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`) && !isFieldOverridden(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`) : false)}
                      />
                      {assetGroup && isFieldInherited(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`) && !isFieldOverridden(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`) && (
                        <Text size="xs" c="dimmed">
                          {fieldSupportsOverride(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`)
                            ? `Inherited from ${assetGroup.name}. Override this field to set a custom value.`
                            : `Inherited from ${assetGroup.name}. Update the asset model to change this value.`}
                        </Text>
                      )}
                      {assetGroup && isFieldOverridden(`${CUSTOM_FIELD_SOURCE_PREFIX}${field.id}`) && (
                        <Text size="xs" c="dimmed">
                          Custom value overrides the shared field from {assetGroup.name}.
                        </Text>
                      )}
                    </Stack>
                  </Grid.Col>
                ))}
              </Grid>
            </>
          )}

          {/* Photo Upload Section removed */}

          <Group justify="flex-end" mt="md">
            {onCancel && (
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconX size={16} />}
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              leftSection={<IconDeviceFloppy size={16} />}
              loading={isLoading}
            >
              {isEditing ? 'Save Changes' : 'Create Asset'}
            </Button>
          </Group>
        </Stack>
      </form>

      {/* T064: Confirmation modal for status changes on assigned assets */}
      <Modal
        opened={confirmOpened}
        onClose={cancelStatusChange}
        title="Confirm Status Change"
        centered
      >
        <Stack gap="md">
          <Text>
            This asset is currently assigned. Changing the status may affect the assignment.
            Are you sure you want to continue?
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={cancelStatusChange}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange}>
              Confirm Change
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
