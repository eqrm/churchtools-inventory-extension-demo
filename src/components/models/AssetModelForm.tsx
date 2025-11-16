/**
 * Asset Model Form Component
 * 
 * Form for creating and editing asset model templates.
 */

import { useState } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Textarea, NumberInput, Button, Stack, Group, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { AssetModel } from '../../types/model';
import type { UUID } from '../../types/entities';
import { TagInput } from '../tags/TagInput';
import { TagPropagationConfirmation } from '../tags/TagPropagationConfirmation';
import { useTags, useModelTagPropagation } from '../../hooks/useTags';

interface AssetModelFormProps {
  model?: AssetModel;
  assetTypes: Array<{ id: string; name: string }>;
  onSubmit: (data: Partial<AssetModel>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  affectedAssetsCount?: number;
}

export function AssetModelForm({
  model,
  assetTypes,
  onSubmit,
  onCancel,
  isLoading = false,
  affectedAssetsCount = 0,
}: AssetModelFormProps) {
  const { t } = useTranslation(['models', 'common']);
  const { t: tTags } = useTranslation('tags');

  // Tag state and hooks
  const [propagationModalOpened, setPropagationModalOpened] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<typeof form.values | null>(null);
  const { tags: allTags = [], isLoading: tagsLoading } = useTags();
  const { propagateTags, isPropagating } = useModelTagPropagation(model?.id || null);

  const form = useForm({
    initialValues: {
      name: model?.name || '',
      assetTypeId: model?.assetTypeId || '',
      manufacturer: model?.manufacturer || '',
      modelNumber: model?.modelNumber || '',
      tagIds: model?.tagIds || [],
      defaultValues: {
        purchasePrice: (model?.defaultValues?.['purchasePrice'] as number) || undefined,
        warrantyMonths: model?.defaultWarrantyMonths || undefined,
        location: (model?.defaultValues?.['location'] as string) || '',
        notes: (model?.defaultValues?.['notes'] as string) || '',
      },
    },
    validate: {
      name: (value) =>
        !value
          ? t('models:validation.nameRequired')
          : value.length > 100
            ? t('models:validation.nameMaxLength')
            : null,
      assetTypeId: (value) => (!value ? t('models:validation.assetTypeRequired') : null),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    // Check if tags changed and there are affected assets
    const tagsChanged = model && 
      JSON.stringify([...values.tagIds].sort()) !== JSON.stringify([...model.tagIds].sort());
    
    if (tagsChanged && affectedAssetsCount > 0) {
      // Show propagation confirmation modal
      setPendingFormValues(values);
      setPropagationModalOpened(true);
    } else {
      // Submit directly without propagation
      submitForm(values, false);
    }
  };

  const submitForm = async (values: typeof form.values, shouldPropagate: boolean) => {
    const formData: Partial<AssetModel> = {
      name: values.name,
      assetTypeId: values.assetTypeId,
      manufacturer: values.manufacturer || undefined,
      modelNumber: values.modelNumber || undefined,
      defaultWarrantyMonths: values.defaultValues.warrantyMonths,
      tagIds: values.tagIds as UUID[],
      defaultValues: {
        purchasePrice: values.defaultValues.purchasePrice,
        location: values.defaultValues.location || undefined,
        notes: values.defaultValues.notes || undefined,
      },
    };

    // Call the parent onSubmit
    onSubmit(formData);

    // If propagation was requested, propagate tags to assets
    if (shouldPropagate && model?.id && values.tagIds.length > 0) {
      try {
        await propagateTags(values.tagIds as UUID[]);
        notifications.show({
          title: tTags('notifications.tagsPropagatedTitle'),
          message: tTags('notifications.tagsPropagated', { 
            count: affectedAssetsCount, 
            targetType: tTags('assets') 
          }),
          color: 'green',
        });
      } catch (error) {
        notifications.show({
          title: tTags('notifications.updateErrorTitle'),
          message: error instanceof Error ? error.message : tTags('notifications.updateErrorMessage'),
          color: 'red',
        });
      }
    }
  };

  const handlePropagationConfirm = async () => {
    if (pendingFormValues) {
      await submitForm(pendingFormValues, true);
      setPropagationModalOpened(false);
      setPendingFormValues(null);
    }
  };

  const handlePropagationSkip = async () => {
    if (pendingFormValues) {
      await submitForm(pendingFormValues, false);
      setPropagationModalOpened(false);
      setPendingFormValues(null);
    }
  };

  return (
    <>
      <TagPropagationConfirmation
        opened={propagationModalOpened}
        onClose={() => {
          setPropagationModalOpened(false);
          setPendingFormValues(null);
        }}
        onConfirm={handlePropagationConfirm}
        onSkip={handlePropagationSkip}
        entityType="model"
        affectedCount={affectedAssetsCount}
        isLoading={isPropagating}
      />

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
        <TextInput
          label={t('models:form.name')}
          placeholder={t('models:form.namePlaceholder')}
          required
          {...form.getInputProps('name')}
        />

        <Select
          label={t('models:form.assetType')}
          placeholder={t('models:form.assetTypePlaceholder')}
          data={assetTypes.map((type) => ({ value: type.id, label: type.name }))}
          required
          searchable
          {...form.getInputProps('assetTypeId')}
        />

        <TextInput
          label={t('models:form.manufacturer')}
          placeholder={t('models:form.manufacturerPlaceholder')}
          {...form.getInputProps('manufacturer')}
        />

        <TextInput
          label={t('models:form.modelNumber')}
          placeholder={t('models:form.modelNumberPlaceholder')}
          {...form.getInputProps('modelNumber')}
        />

        <NumberInput
          label={t('models:form.defaultPurchasePrice')}
          min={0}
          decimalScale={2}
          prefix="$"
          {...form.getInputProps('defaultValues.purchasePrice')}
        />

        <NumberInput
          label={t('models:form.defaultWarrantyMonths')}
          min={0}
          max={120}
          {...form.getInputProps('defaultValues.warrantyMonths')}
        />

        <TextInput
          label={t('models:form.defaultLocation')}
          {...form.getInputProps('defaultValues.location')}
        />

        <Textarea
          label={t('models:form.defaultNotes')}
          rows={2}
          {...form.getInputProps('defaultValues.notes')}
        />

        <TagInput
          tags={allTags}
          selectedTagIds={form.values.tagIds as UUID[]}
          onChange={(tagIds) => form.setFieldValue('tagIds', tagIds)}
          isLoading={tagsLoading}
          label={tTags('selectTags')}
          placeholder={tTags('searchOrCreateTag')}
          description={model && affectedAssetsCount > 0 
            ? tTags('tagPropagation.note')
                .replace('{{targetType}}', tTags('assets'))
                .replace('{{entityType}}', tTags('model'))
            : undefined
          }
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel} disabled={isLoading}>
            {t('common:cancel')}
          </Button>
          <Button type="submit" loading={isLoading}>
            {model ? t('common:save') : t('common:create')}
          </Button>
        </Group>
      </Stack>
    </form>
    </>
  );
}
