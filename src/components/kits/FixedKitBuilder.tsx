/**
 * FixedKitBuilder Component
 * UI for selecting specific assets for fixed kits
 * T3.2.1: Now uses AssetSelectionModal for asset selection
 */

import { useMemo, useState } from 'react';
import { Stack, Text, Button, Group, ActionIcon, Paper, Badge, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useAssets } from '../../hooks/useAssets';
import { useTranslation } from 'react-i18next';
import { ASSET_STATUS_KANBAN_COLORS, ASSET_STATUS_LABELS } from '../../constants/assetStatuses';
import type { Asset } from '../../types/entities';
import { buildSelectableKitAssets } from '../../utils/kitAssets';
import { AssetSelectionModal } from '../common/AssetSelectionModal';

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

export function FixedKitBuilder({ value, onChange, kitId }: FixedKitBuilderProps) {
  const { data: assets } = useAssets();
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
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

  // Get IDs of already bound assets to exclude from selection
  const excludeAssetIds = useMemo(() => {
    const boundIds = value.map((ba) => ba.assetId);
    // Also exclude assets that aren't selectable (in other kits, deleted, etc.)
    const nonSelectableIds = (assets ?? [])
      .filter((asset) => !selectableAssets.some((sa) => sa.id === asset.id))
      .map((asset) => asset.id);
    return [...boundIds, ...nonSelectableIds];
  }, [value, assets, selectableAssets]);

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

  // T3.2.1: Handle assets selected from modal
  const handleAssetsSelected = (selectedAssets: Asset[]) => {
    // Notify about non-available assets
    selectedAssets
      .filter((asset) => asset.status !== 'available')
      .forEach((asset) => notifyAssetStatus(asset.assetNumber, asset.status));

    // Convert to bound assets and add to existing
    const newBoundAssets: BoundAsset[] = selectedAssets.map((asset) => ({
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
    }));

    onChange([...value, ...newBoundAssets]);
    setSelectionModalOpen(false);
  };

  const handleRemoveAsset = (assetId: string) => {
    onChange(value.filter(ba => ba.assetId !== assetId));
  };

  return (
    <Stack gap="sm">
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

      {/* T3.2.1: Add Assets button opens AssetSelectionModal */}
      <Button
        leftSection={<IconPlus size={16} />}
        onClick={() => setSelectionModalOpen(true)}
        variant="light"
      >
        {t('form.actions.addAsset')}
      </Button>

      <AssetSelectionModal
        opened={selectionModalOpen}
        onClose={() => setSelectionModalOpen(false)}
        onConfirm={handleAssetsSelected}
        mode="multi"
        excludeAssetIds={excludeAssetIds}
      />

      {blockedAssetCount > 0 && (
        <Text size="xs" c="dimmed" data-testid="kit-blocked-assets-hint">
          {t('form.fixed.kitAssignmentHint', { count: blockedAssetCount })}
        </Text>
      )}

      {value.length === 0 && (
        <Text size="sm" c="dimmed">
          {t('form.fixed.emptyState')}
        </Text>
      )}
    </Stack>
  );
}
