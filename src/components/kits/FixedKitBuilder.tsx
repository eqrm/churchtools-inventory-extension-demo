/**
 * FixedKitBuilder Component
 * UI for selecting specific assets for fixed kits
 */

import { useState } from 'react';
import { Stack, Text, Button, Group, Select, ActionIcon, Paper } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useAssets } from '../../hooks/useAssets';
import { useTranslation } from 'react-i18next';

interface BoundAsset {
  assetId: string;
  assetNumber: string;
  name: string;
}

interface FixedKitBuilderProps {
  value: BoundAsset[];
  onChange: (value: BoundAsset[]) => void;
}

export function FixedKitBuilder({ value, onChange }: FixedKitBuilderProps) {
  const { data: assets } = useAssets({ status: 'available' });
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const { t } = useTranslation('kits');

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
          data={assets?.map(a => ({ value: a.id, label: `${a.assetNumber} - ${a.name}` })) || []}
          value={selectedAssetId}
          onChange={(val) => setSelectedAssetId(val || '')}
          searchable
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
