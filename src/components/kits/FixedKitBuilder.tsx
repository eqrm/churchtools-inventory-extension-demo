/**
 * FixedKitBuilder Component
 * UI for selecting specific assets for fixed kits
 */

import { useMemo, useState } from 'react';
import type { SelectItem, SelectProps } from '@mantine/core';
import { Stack, Text, Button, Group, Select, ActionIcon, Paper } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useAssets } from '../../hooks/useAssets';
import { useTranslation } from 'react-i18next';
import type { Asset } from '../../types/entities';

interface BoundAsset {
  assetId: string;
  assetNumber: string;
  name: string;
}

interface FixedKitBuilderProps {
  value: BoundAsset[];
  onChange: (value: BoundAsset[]) => void;
}

export interface AssetSelectOption extends SelectItem {
  assetNumber: string;
  assetName: string;
  assetDescription: string;
  assetLocation: string;
}

export function matchesBoundAssetSearch(value: unknown, option?: AssetSelectOption | null) {
  if (!option) {
    return true;
  }

  const query = String(value ?? '').trim().toLowerCase();
  if (query.length === 0) {
    return true;
  }

  const haystack = [
    option.assetNumber,
    option.assetName,
    option.assetDescription,
    option.assetLocation,
  ];

  return haystack.some((field) => (field ?? '').toLowerCase().includes(query));
}

export function FixedKitBuilder({ value, onChange }: FixedKitBuilderProps) {
  const { data: assets } = useAssets({ status: 'available' });
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const { t } = useTranslation('kits');
  const assetOptions = useMemo<AssetSelectOption[]>(() => {
    // Keep a definitive array reference so Mantine sees iterable `data`
    const sourceAssets = Array.isArray(assets) ? assets : [];
    return sourceAssets.map((asset) => ({
      value: asset.id,
      label: `${asset.assetNumber} - ${asset.name}`,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
      assetDescription: asset.description ?? '',
      assetLocation: asset.location ?? '',
    }));
  }, [assets]);

  const assetSelectFilter = useMemo<NonNullable<SelectProps['filter']>>(
    () => ({ options, search, limit }) => {
      const normalizedSearch = String(search ?? '').trim();
      const maxItems = typeof limit === 'number' ? limit : options.length;

      if (!normalizedSearch) {
        return options.slice(0, maxItems);
      }

      const filtered: typeof options = [];
      let added = 0;

      for (const option of options) {
        if ('group' in option) {
          const matchingItems = option.items.filter((item) =>
            matchesBoundAssetSearch(normalizedSearch, item as AssetSelectOption),
          );
          const remaining = maxItems - added;
          if (matchingItems.length > 0 && remaining > 0) {
            filtered.push({ ...option, items: matchingItems.slice(0, remaining) });
            added += Math.min(matchingItems.length, remaining);
          }
        } else if (matchesBoundAssetSearch(normalizedSearch, option as AssetSelectOption)) {
          filtered.push(option);
          added += 1;
        }

        if (added >= maxItems) {
          break;
        }
      }

      return filtered;
    },
    [],
  );

  const handleAddAsset = () => {
    if (!selectedAssetId) return;
    
    const asset = assets?.find(a => a.id === selectedAssetId);
    if (!asset) return;

    // Check if already added
    if (value.some(ba => ba.assetId === asset.id)) {
      return;
    }

    onChange([
      ...value,
      {
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        name: asset.name,
      },
    ]);
    setSelectedAssetId('');
  };

  const handleRemoveAsset = (assetId: string) => {
    onChange(value.filter(ba => ba.assetId !== assetId));
  };

  return (
    <Stack gap="sm">
      <Text fw={500}>{t('form.fixed.heading')}</Text>
      
      {value.length > 0 && (
        <Stack gap="xs">
          {value.map((asset) => (
            <Paper key={asset.assetId} p="xs" withBorder>
              <Group justify="space-between">
                <Text size="sm">
                  {asset.assetNumber} - {asset.name}
                </Text>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => handleRemoveAsset(asset.assetId)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      <Group>
        <Select
          placeholder={t('form.fixed.selectPlaceholder')}
          data={assetOptions}
          value={selectedAssetId}
          onChange={(val) => setSelectedAssetId(val || '')}
          searchable
          filter={assetSelectFilter}
          style={{ flex: 1 }}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAddAsset}
          disabled={!selectedAssetId}
        >
          {t('form.actions.addAsset')}
        </Button>
      </Group>

      {value.length === 0 && (
        <Text size="sm" c="dimmed">
          {t('form.fixed.emptyState')}
        </Text>
      )}
    </Stack>
  );
}
