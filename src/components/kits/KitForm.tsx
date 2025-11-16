/**
 * KitForm Component
 * Form for creating and editing equipment kits
 */

import { useEffect, useMemo } from 'react';
import { useForm } from '@mantine/form';
import { Stack, TextInput, Textarea, Select, Button, Group, Checkbox, Text, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useCreateKit, useUpdateKit } from '../../hooks/useKits';
import type { Kit, KitCreate, KitInheritanceProperty } from '../../types/entities';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';
import { FixedKitBuilder } from './FixedKitBuilder';
import { FlexibleKitBuilder } from './FlexibleKitBuilder';

interface KitFormProps {
  kit?: Kit;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function KitForm({ kit, onSuccess, onCancel }: KitFormProps) {
  const createKit = useCreateKit();
  const updateKit = useUpdateKit();
  const { t } = useTranslation('kits');

  const typeOptions = useMemo(
    () => [
      { value: 'fixed', label: t('form.fields.typeOptions.fixed') },
      { value: 'flexible', label: t('form.fields.typeOptions.flexible') },
    ],
    [t],
  );

  const inheritanceOptions = useMemo(
    () => [
      { value: 'location', label: t('form.inheritance.location') },
      { value: 'status', label: t('form.inheritance.status') },
      { value: 'tags', label: t('form.inheritance.tags') },
    ],
    [t],
  );

  const form = useForm<KitCreate>({
    initialValues: kit
      ? {
          name: kit.name,
          description: kit.description,
          type: kit.type,
          boundAssets: kit.boundAssets,
          poolRequirements: kit.poolRequirements,
          location: kit.location ?? '',
          status: kit.status,
          inheritedProperties: kit.inheritedProperties ?? [],
        }
      : {
          name: '',
          description: '',
          type: 'fixed' as const,
          boundAssets: [],
          poolRequirements: [],
          location: '',
          status: undefined,
          inheritedProperties: ['location', 'status'] satisfies KitInheritanceProperty[],
        },
    validate: {
      name: (value: string) => (!value ? t('form.validation.nameRequired') : null),
      type: (value: KitCreate['type']) => (!value ? t('form.validation.typeRequired') : null),
    },
  });

  // Reset builder fields when type changes
  useEffect(() => {
    if (form.values.type === 'fixed') {
      form.setFieldValue('poolRequirements', []);
    } else {
      form.setFieldValue('boundAssets', []);
    }
  }, [form.values.type, form]);

  const handleSubmit = async (values: KitCreate) => {
    try {
      if (kit) {
        await updateKit.mutateAsync({ id: kit.id, data: values });
        notifications.show({
          title: t('form.notifications.updateTitle'),
          message: t('form.notifications.updateMessage'),
          color: 'green',
        });
      } else {
        await createKit.mutateAsync(values);
        notifications.show({
          title: t('form.notifications.createTitle'),
          message: t('form.notifications.createMessage'),
          color: 'green',
        });
      }
      onSuccess?.();
    } catch (error) {
      const fallback = t('form.notifications.errorTitle');
      notifications.show({
        title: fallback,
        message: error instanceof Error ? error.message : fallback,
        color: 'red',
      });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t('form.fields.nameLabel')}
          placeholder={t('form.fields.namePlaceholder')}
          {...form.getInputProps('name')}
          required
        />

        <Select
          label={t('form.fields.typeLabel')}
          description={
            form.values.type === 'fixed'
              ? t('form.fields.typeDescription.fixed')
              : t('form.fields.typeDescription.flexible')
          }
          data={typeOptions}
          {...form.getInputProps('type')}
          required
        />

        <Textarea
          label={t('form.fields.descriptionLabel')}
          placeholder={t('form.fields.descriptionPlaceholder')}
          rows={3}
          {...form.getInputProps('description')}
        />

        <TextInput
          label={t('form.fields.locationLabel')}
          placeholder={t('form.fields.locationPlaceholder')}
          {...form.getInputProps('location')}
        />

        <Select
          label={t('form.fields.statusLabel')}
          placeholder={t('form.fields.statusPlaceholder')}
          data={ASSET_STATUS_OPTIONS}
          value={form.values.status ?? null}
          onChange={(value) => form.setFieldValue('status', (value ?? undefined) as KitCreate['status'])}
          clearable
        />

        <Stack gap={4}>
          <Group gap={4} align="flex-start">
            <Text fw={500}>{t('form.inheritance.heading')}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {t('form.inheritance.description')}
          </Text>
          <Checkbox.Group
            value={(form.values.inheritedProperties ?? []) as KitInheritanceProperty[]}
            onChange={(value) =>
              form.setFieldValue(
                'inheritedProperties',
                (value as KitInheritanceProperty[]) ?? [],
              )
            }
          >
            <Group gap="md">
              {inheritanceOptions.map((option) => (
                <Checkbox key={option.value} value={option.value} label={option.label} />
              ))}
            </Group>
          </Checkbox.Group>
        </Stack>

        <Divider label={form.values.type === 'fixed' ? t('form.fixed.heading') : t('form.flexible.heading')} labelPosition="center" />

        {form.values.type === 'fixed' ? (
          <FixedKitBuilder
            value={form.values.boundAssets || []}
            onChange={(value) => form.setFieldValue('boundAssets', value)}
          />
        ) : (
          <FlexibleKitBuilder
            value={form.values.poolRequirements || []}
            onChange={(value) => form.setFieldValue('poolRequirements', value)}
          />
        )}

        <Group justify="flex-end">
          {onCancel && (
            <Button variant="subtle" onClick={onCancel}>
              {t('form.actions.cancel')}
            </Button>
          )}
          <Button type="submit" loading={createKit.isPending || updateKit.isPending}>
            {kit ? t('form.actions.update') : t('form.actions.create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
