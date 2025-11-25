/**
 * Model Template Selector Component
 * 
 * Dropdown for selecting an asset model template when creating assets.
 * Pre-fills form fields with model defaults.
 */

import { Select, Text, Group, Stack } from '@mantine/core';
import { IconTemplate } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { AssetModel } from '../../types/model';

interface ModelTemplateSelectorProps {
  models: AssetModel[];
  selectedModelId?: string | null;
  onSelect: (modelId: string | null) => void;
  assetTypeId?: string;
  disabled?: boolean;
}

export function ModelTemplateSelector({
  models,
  selectedModelId,
  onSelect,
  assetTypeId,
  disabled = false,
}: ModelTemplateSelectorProps) {
  const { t } = useTranslation(['models', 'common']);

  // Filter models by asset type if specified
  const filteredModels = assetTypeId
    ? models.filter((model) => model.assetTypeId === assetTypeId)
    : models;

  const modelOptions = filteredModels.map((model) => ({
    value: model.id,
    label: model.name,
    description: model.manufacturer || undefined,
  }));

  const selectedModel = filteredModels.find((m) => m.id === selectedModelId);

  return (
    <Stack gap="xs">
      <Select
        label={
          <Group gap="xs">
            <IconTemplate size={16} />
            <Text size="sm" fw={500}>
              {t('models:selectModel')}
            </Text>
          </Group>
        }
        placeholder={t('models:noModelSelected')}
        data={modelOptions}
        value={selectedModelId || null}
        onChange={onSelect}
        disabled={disabled}
        searchable
        clearable
        leftSection={<IconTemplate size={16} />}
      />

      {selectedModel && (
        <Text size="xs" c="dimmed">
          {t('models:useAsTemplate')}: {selectedModel.manufacturer && `${selectedModel.manufacturer} `}
          {selectedModel.modelNumber || ''}
        </Text>
      )}
    </Stack>
  );
}
