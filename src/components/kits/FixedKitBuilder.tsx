/**
 * FixedKitBuilder Component
 * UI for selecting specific assets for fixed kits
 */

import { useMemo, useState } from 'react';
import type { SelectItem, SelectProps } from '@mantine/core';
import { Stack, Text, Button, Group, Select, ActionIcon, Paper, Badge, Alert, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconScan } from '@tabler/icons-react';
import { useAssets } from '../../hooks/useAssets';
import { useTranslation } from 'react-i18next';
import { matchesBoundAssetSearch } from '../../utils/matchesBoundAssetSearch';
import { ASSET_STATUS_KANBAN_COLORS, ASSET_STATUS_LABELS } from '../../constants/assetStatuses';
import type { Asset } from '../../types/entities';
import { findAssetByScanValue } from '../../utils/scanUtils';

interface BoundAsset {
  assetId: string;
  assetNumber: string;
  name: string;
}

interface FixedKitBuilderProps {
  value: BoundAsset[];
  onChange: (value: BoundAsset[]) => void;
  kitId?: string;
}

export interface AssetSelectOption extends SelectItem {
  assetNumber: string;
  assetName: string;
  assetDescription: string;
  assetLocation: string;
}

export function buildSelectableKitAssets(assets: Asset[] | undefined, kitId?: string): Asset[] {
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets.filter((asset) => {
    if (asset.status === 'deleted') {
      return false;
    }
    if (asset.isKit) {
      return false;
    }
    if (asset.kitId && asset.kitId !== kitId) {
      return false;
    }
    return true;
  });
}

export function FixedKitBuilder({ value, onChange, kitId }: FixedKitBuilderProps) {
  const { data: assets } = useAssets();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [scanValue, setScanValue] = useState('');
  const { t } = useTranslation('kits');
  const selectableAssets = useMemo(() => buildSelectableKitAssets(assets, kitId), [assets, kitId]);
  const blockedAssetCount = useMemo(() => {
    if (!Array.isArray(assets)) {
      return 0;
    }
    return assets.filter((asset) => {
      if (asset.status === 'deleted' || asset.isKit) {
        return false;
      }
      return Boolean(asset.kitId && asset.kitId !== kitId);
    }).length;
  }, [assets, kitId]);

  const assetLookup = useMemo(() => {
    const lookup = new Map<string, (typeof selectableAssets)[number]>();
    for (const asset of selectableAssets) {
      lookup.set(asset.id, asset);
    }
    return lookup;
  }, [selectableAssets]);

  const assetOptions = useMemo<AssetSelectOption[]>(() => {
    // Keep a definitive array reference so Mantine sees iterable `data`
    return selectableAssets.map((asset) => {
      const statusSuffix = asset.status && asset.status !== 'available' ? ` (${asset.status})` : '';
      return {
        value: asset.id,
        label: `${asset.assetNumber} - ${asset.name}${statusSuffix}`,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        assetDescription: asset.description ?? '',
        assetLocation: asset.location ?? '',
      } satisfies AssetSelectOption;
    });
  }, [selectableAssets]);

  const nonAvailableBindings = useMemo(() => {
    return value
      .map((bound) => {
        const asset = assetLookup.get(bound.assetId);
        const status = asset?.status;
        if (!status || status === 'available') {
          return null;
        }
        return {
          assetId: bound.assetId,
          assetNumber: bound.assetNumber,
          status,
        };
      })
      .filter((entry): entry is { assetId: string; assetNumber: string; status: Asset['status'] } => entry !== null);
  }, [assetLookup, value]);

  const selectedAsset = useMemo(() => {
    return selectableAssets.find((asset) => asset.id === selectedAssetId);
  }, [selectableAssets, selectedAssetId]);

  const notifyAssetStatus = (assetNumber: string, status?: string) => {
    notifications.show({
      color: 'orange',
      title: t('form.fixed.assetStatusTitle'),
      message: t('form.fixed.assetStatusMessage', {
        assetNumber,
        status: status ?? t('form.fixed.assetStatusUnknown'),
      }),
    });
  };

  const handleScan = () => {
    if (!scanValue.trim()) return;
    
    // Use all assets for lookup, but check selectability later
    const found = findAssetByScanValue(assets || [], scanValue);
    
    if (found) {
      // Check if selectable (not deleted, not kit, not in another kit)
      const isSelectable = selectableAssets.some(a => a.id === found.id);
      
      if (!isSelectable) {
        // Provide specific feedback why it's not selectable
        if (found.status === 'deleted') {
          notifications.show({ color: 'red', message: 'Asset is deleted.' });
        } else if (found.isKit) {
          notifications.show({ color: 'red', message: 'Cannot add a kit to a kit.' });
        } else if (found.kitId && found.kitId !== kitId) {
          notifications.show({ color: 'red', message: 'Asset belongs to another kit.' });
        }
        setScanValue('');
        return;
      }

      // Check if already added
      if (value.some((ba) => ba.assetId === found.id)) {
        notifications.show({
          color: 'yellow',
          message: t('form.fixed.scanAlreadyAdded', { name: found.name }),
        });
        setScanValue('');
        return;
      }

      // Check status
      if (found.status !== 'available') {
         notifyAssetStatus(found.assetNumber, found.status);
      }

      // Add directly
      onChange([
        ...value,
        {
          assetId: found.id,
          assetNumber: found.assetNumber,
          name: found.name,
        },
      ]);
      notifications.show({
        color: 'green',
        message: t('form.fixed.scanSuccess', { name: found.name }),
      });
      setScanValue('');
    } else {
      notifications.show({
        color: 'red',
        message: t('form.fixed.scanNotFound', { value: scanValue }),
      });
    }
  };

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
    if (!selectedAsset) return;

    if (selectedAsset.status !== 'available') {
      notifyAssetStatus(selectedAsset.assetNumber, selectedAsset.status);
    }

    // Check if already added
    if (value.some((ba) => ba.assetId === selectedAsset.id)) {
      return;
    }

    onChange([
      ...value,
      {
        assetId: selectedAsset.id,
        assetNumber: selectedAsset.assetNumber,
        name: selectedAsset.name,
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
          {value.map((asset) => {
            const assetMeta = assetLookup.get(asset.assetId);
            const status = assetMeta?.status;
            return (
              <Paper key={asset.assetId} p="xs" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text size="sm" fw={500}>
                      {asset.assetNumber} - {asset.name}
                    </Text>
                    {status && (
                      <Badge
                        size="xs"
                        color={ASSET_STATUS_KANBAN_COLORS[status] ?? 'gray'}
                        variant="light"
                      >
                        {ASSET_STATUS_LABELS[status] ?? status}
                      </Badge>
                    )}
                    {!status && (
                      <Text size="xs" c="dimmed">
                        {t('form.fixed.assetStatusUnknownInline')}
                      </Text>
                    )}
                  </Stack>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveAsset(asset.assetId)}
                    aria-label={t('form.fixed.removeAssetAria', { name: asset.name })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      {nonAvailableBindings.length > 0 && (
        <Alert
          color="orange"
          title={t('form.fixed.nonAvailableWarningTitle', { count: nonAvailableBindings.length })}
          data-testid="kit-bound-status-warning"
        >
          <Stack gap={2}>
            {nonAvailableBindings.map((entry) => (
              <Text key={entry.assetId} size="sm">
                {t('form.fixed.nonAvailableWarningItem', {
                  assetNumber: entry.assetNumber,
                  status: entry.status ?? t('form.fixed.assetStatusUnknown'),
                })}
              </Text>
            ))}
            <Text size="xs" c="dimmed">
              {t('form.fixed.nonAvailableWarningFootnote')}
            </Text>
          </Stack>
        </Alert>
      )}

      <Group align="flex-end">
        <Select
          placeholder={t('form.fixed.selectPlaceholder')}
          data={assetOptions}
          value={selectedAssetId}
          onChange={(val) => setSelectedAssetId(val || '')}
          searchable
          filter={assetSelectFilter}
          style={{ flex: 1 }}
        />
        <TextInput
          placeholder={t('form.fixed.scanPlaceholder')}
          value={scanValue}
          onChange={(e) => setScanValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleScan();
            }
          }}
          rightSection={
            <ActionIcon variant="subtle" onClick={handleScan} disabled={!scanValue}>
              <IconScan size={16} />
            </ActionIcon>
          }
          style={{ width: 200 }}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAddAsset}
          disabled={!selectedAssetId}
        >
          {t('form.actions.addAsset')}
        </Button>
      </Group>

      {blockedAssetCount > 0 && (
        <Text size="xs" c="dimmed" data-testid="kit-blocked-assets-hint">
          {t('form.fixed.kitAssignmentHint', { count: blockedAssetCount })}
        </Text>
      )}

      {selectedAsset && selectedAsset.status !== 'available' ? (
        <Text size="xs" c="orange.6">
          {t('form.fixed.assetStatusInline', {
            status: selectedAsset.status ?? t('form.fixed.assetStatusUnknown'),
          })}
        </Text>
      ) : null}

      {value.length === 0 && (
        <Text size="sm" c="dimmed">
          {t('form.fixed.emptyState')}
        </Text>
      )}
    </Stack>
  );
}
