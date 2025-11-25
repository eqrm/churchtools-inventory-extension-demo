/**
 * KitForm Component
 * Form for creating and editing equipment kits
 */

import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { Stack, TextInput, Textarea, Select, Button, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCreateKit, useUpdateKit } from '../../hooks/useKits';
import type { Kit, KitCreate } from '../../types/entities';
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

  const form = useForm<KitCreate>({
    initialValues: kit ? {
      name: kit.name,
      description: kit.description,
      type: kit.type,
      boundAssets: kit.boundAssets,
      poolRequirements: kit.poolRequirements,
    } : {
      name: '',
      description: '',
      type: 'fixed' as const,
      boundAssets: [],
      poolRequirements: [],
    },
    validate: {
      name: (value: string) => (!value ? 'Name erforderlich' : null),
      type: (value: KitCreate['type']) => (!value ? 'Typ erforderlich' : null),
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
        notifications.show({ title: 'Erfolg', message: 'Kit aktualisiert', color: 'green' });
      } else {
        await createKit.mutateAsync(values);
        notifications.show({ title: 'Erfolg', message: 'Kit erstellt', color: 'green' });
      }
      onSuccess?.();
    } catch (error) {
      notifications.show({ title: 'Fehler', message: (error as Error).message, color: 'red' });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="z.B. Sunday Service Audio"
          {...form.getInputProps('name')}
          required
        />
        
        <Select
          label="Kit-Typ"
          description={
            form.values.type === 'fixed'
              ? 'Spezifische Assets werden fest zugewiesen'
              : 'Assets werden aus Pools bei Buchung ausgewählt'
          }
          data={[
            { value: 'fixed', label: 'Fest (spezifische Assets)' },
            { value: 'flexible', label: 'Flexibel (Pool-basiert)' },
          ]}
          {...form.getInputProps('type')}
          required
        />

        <Textarea
          label="Beschreibung"
          placeholder="Beschreiben Sie den Verwendungszweck..."
          rows={3}
          {...form.getInputProps('description')}
        />

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
              Abbrechen
            </Button>
          )}
          <Button type="submit" loading={createKit.isPending || updateKit.isPending}>
            {kit ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
