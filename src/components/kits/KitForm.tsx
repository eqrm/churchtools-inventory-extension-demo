/**
 * KitForm Component
 * Form for creating and editing equipment kits
 * 
 * T2.1.1-T2.1.2: Removed flexible kit support - only fixed kits are supported
 */

import { useMemo } from 'react';
import { useForm } from '@mantine/form';
import { Stack, TextInput, Textarea, Select, Button, Group, Checkbox, Text, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useCreateKit, useUpdateKit } from '../../hooks/useKits';
import type { Kit, KitCreate, KitInheritanceProperty } from '../../types/entities';
import { ASSET_STATUS_OPTIONS } from '../../constants/assetStatuses';
import { FixedKitBuilder } from './FixedKitBuilder';
// T2.1.1: Removed FlexibleKitBuilder import - flexible kits no longer supported
import { MasterDataSelectInput } from '../common/MasterDataSelectInput';
import { useMasterData } from '../../hooks/useMasterDataNames';
import { MASTER_DATA_DEFINITIONS, normalizeMasterDataName } from '../../utils/masterData';

interface KitFormProps {
  kit?: Kit;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function KitForm({ kit, onSuccess, onCancel }: KitFormProps) {
  const createKit = useCreateKit();
  const updateKit = useUpdateKit();
  const { t } = useTranslation('kits');
  const { names: locationNames, addItem: addLocation } = useMasterData(MASTER_DATA_DEFINITIONS.locations);

  // T2.1.1-T2.1.2: Removed typeOptions - only fixed kits are supported

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
          type: 'fixed' as const, // T2.1.2: Always fixed
          boundAssets: kit.boundAssets,
          poolRequirements: [], // T2.1.2: Always empty
          location: kit.location ?? '',
          status: kit.status,
          inheritedProperties: kit.inheritedProperties ?? [],
        }
      : {
          name: '',
          description: '',
          type: 'fixed' as const, // T2.1.2: Always fixed
          boundAssets: [],
          poolRequirements: [], // T2.1.2: Always empty
          location: '',
          status: undefined,
          inheritedProperties: ['location', 'status'] satisfies KitInheritanceProperty[],
        },
    validate: {
      name: (value: string) => (!value ? t('form.validation.nameRequired') : null),
      // T2.1.2: Removed type validation - always fixed
    },
  });

  // T2.1.2: Removed useEffect that reset builder fields when type changes

  const handleSubmit = async (values: KitCreate) => {
    try {
      if (values.location) {
        await addLocation(values.location);
      }

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

        {/* T2.1.2: Removed type Select - only fixed kits are supported */}

        <Textarea
          label={t('form.fields.descriptionLabel')}
          placeholder={t('form.fields.descriptionPlaceholder')}
          rows={3}
          {...form.getInputProps('description')}
        />

        <MasterDataSelectInput
          names={locationNames}
          label={t('form.fields.locationLabel')}
          placeholder={t('form.fields.locationPlaceholder')}
          description={t('form.fields.locationDescription')}
          value={form.values.location ?? ''}
          onChange={(next) => form.setFieldValue('location', next)}
          nothingFound={t('form.fields.locationEmpty')}
          onCreateOption={async (name) => {
            const created = await addLocation(name);
            return created?.name ?? normalizeMasterDataName(name);
          }}
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

        <Divider label={t('form.fixed.heading')} labelPosition="center" />

        {/* T2.1.2: Always render FixedKitBuilder - flexible kits removed */}
        <FixedKitBuilder
          value={form.values.boundAssets || []}
          onChange={(value) => form.setFieldValue('boundAssets', value)}
          kitId={kit?.id}
        />

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
