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
  initialData?: {
    name: string;
    icon?: string;
    customFields: Omit<CustomFieldDefinition, 'id'>[];
  };
  onSuccess?: (assetType: AssetType) => void;
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
      name: category?.name ?? initialData?.name ?? '',
      icon: category?.icon ?? initialData?.icon ?? '',
      assetNameTemplate: category?.assetNameTemplate ?? '%Manufacturer% %Model% %Asset Number%',
      customFields:
        category?.customFields ??
        initialData?.customFields.map((field, index) => ({
          ...field,
          id: `field-${Date.now().toString()}-${index.toString()}`,
        })) ??
        [],
    },
    validate: {
      name: (value) => {
        if (!value.trim()) return 'Asset-Typ-Name ist erforderlich';
        if (value.length < 2) return 'Asset-Typ-Name muss mindestens 2 Zeichen lang sein';
        if (value.length > 100) return 'Asset-Typ-Name darf 100 Zeichen nicht überschreiten';
        return null;
      },
      customFields: {
        name: (value) => {
          if (!value || !value.trim()) return 'Feldname ist erforderlich';
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
          customFields: values.customFields,
        };

        const updated = await updateAssetType.mutateAsync({
          id: category.id,
          data: payload,
        });

        notifications.show({
          title: 'Erfolgreich',
          message: `Asset-Typ "${updated.name}" wurde aktualisiert`,
          color: 'green',
        });
        onSuccess?.(updated);
      } else {
        const payload: AssetTypeCreate = {
          name: values.name,
          icon: values.icon || undefined,
          assetNameTemplate: values.assetNameTemplate || undefined,
          customFields: values.customFields,
        };

        const created = await createAssetType.mutateAsync(payload);
        notifications.show({
          title: 'Erfolgreich',
          message: `Asset-Typ "${created.name}" wurde erstellt`,
          color: 'green',
        });
        form.reset();
        onSuccess?.(created);
      }
    } catch (err) {
      notifications.show({
        title: 'Fehler',
        message: err instanceof Error ? err.message : 'Asset-Typ konnte nicht gespeichert werden',
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
          label="Asset-Typ-Name"
          placeholder="z. B. Audio, Kameras, Mikrofone"
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
            Optionales Icon zur besseren Identifikation des Asset-Typs
          </Text>
        </Stack>

        <Divider label="Asset-Namen" labelPosition="left" mt="md" />

        <Text size="sm" c="dimmed">
          Lege fest, wie Asset-Namen für diesen Asset-Typ generiert werden. Verfügbare Variablen sind
          %Manufacturer%, %Model%, %Asset Number%, %Serial Number% sowie eigene Feldnamen (z. B.
          %Color%). Beispiel: <code>%Manufacturer% %Model% %Asset Number%</code>
        </Text>

        {prefixesLoading ? (
          <Text size="xs" c="dimmed">
            Lade Standardpräfixe …
          </Text>
        ) : autoNumberPreview?.nextAssetNumber ? (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Vorschau automatische Inventarnummer:
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
            Füge unter Einstellungen ein Prefix hinzu, um automatische Nummerierung zu aktivieren.
          </Text>
        )}

        <Group align="flex-start">
          <TextInput
            label="Template für Asset-Namen"
            placeholder="%Manufacturer% %Model% %Asset Number%"
            {...form.getInputProps('assetNameTemplate')}
            style={{ flex: 1 }}
          />
          <Tooltip
            label={
              <div>
                <div>
                  <strong>Verfügbare Variablen</strong>
                </div>
                <div>%Manufacturer%</div>
                <div>%Model%</div>
                <div>%Asset Number%</div>
                <div>%Serial Number%</div>
                <div>Eigene Feldnamen, z. B. %Color%</div>
              </div>
            }
            withArrow
          >
            <ActionIcon variant="light">
              <IconInfoCircle size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider label="Eigene Felder" labelPosition="left" mt="xl" />

        <Text size="sm" c="dimmed">
          Definiere zusätzliche Felder, die für alle Assets dieses Asset-Typs verfügbar sind.
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
            Eigenes Feld hinzufügen
          </Button>
        </Stack>

        {form.values.customFields.length > 0 && (
          <>
            <Divider label="Vorschau" labelPosition="left" mt="xl" />
            <CustomFieldPreview fields={form.values.customFields} />
          </>
        )}

        <Group justify="flex-end" mt="xl">
          {onCancel && (
            <Button variant="default" onClick={onCancel} disabled={isPending}>
              Abbrechen
            </Button>
          )}
          <Button type="submit" loading={isPending}>
            {isEditing ? 'Asset-Typ aktualisieren' : 'Asset-Typ erstellen'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function describeAutoNumberingSource(source: AutoNumberingSource): string {
  switch (source) {
    case 'person-default':
      return 'Basierend auf deinem gespeicherten Präfix.';
    case 'module-default':
      return 'Verwendet das Modul-Standardpräfix.';
    case 'collection-first':
      return 'Verwendet das erste verfügbare Präfix.';
    case 'explicit':
      return 'Verwendet das ausgewählte Präfix.';
    default:
      return 'Noch kein Präfix konfiguriert.';
  }
}
