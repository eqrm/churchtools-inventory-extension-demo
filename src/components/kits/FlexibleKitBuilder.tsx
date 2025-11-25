/**
 * FlexibleKitBuilder Component
 * UI for defining pool requirements for flexible kits
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Stack,
  Text,
  Button,
  Group,
  Select,
  NumberInput,
  ActionIcon,
  Paper,
  SegmentedControl,
  Badge,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useCategories } from '../../hooks/useCategories';
import { useAssets } from '../../hooks/useAssets';
import type { Kit } from '../../types/entities';

type PoolRequirement = NonNullable<Kit['poolRequirements']>[number];
type SelectionMode = 'assetType' | 'parentAsset';

interface FlexibleKitBuilderProps {
  value: PoolRequirement[];
  onChange: (value: PoolRequirement[]) => void;
}

export function FlexibleKitBuilder({ value, onChange }: FlexibleKitBuilderProps) {
  const { data: assetTypes } = useCategories();
  const { data: parentAssets = [] } = useAssets({ isParent: true });
  const [mode, setMode] = useState<SelectionMode>('assetType');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState<string>('');
  const [selectedParentAssetId, setSelectedParentAssetId] = useState<string>('');

  useEffect(() => {
    setSelectedAssetTypeId('');
    setSelectedParentAssetId('');
  }, [mode]);

  const parentAssetOptions = useMemo(
    () =>
      parentAssets.map((asset) => ({
        value: asset.id,
        label: `${asset.name} (${asset.assetNumber})`,
        assetTypeId: asset.assetType.id,
        assetTypeName: asset.assetType.name,
      })),
    [parentAssets],
  );

  const parentAssetLookup = useMemo(
    () => new Map(parentAssets.map((asset) => [asset.id, asset])),
    [parentAssets],
  );

  const handleAddPool = () => {
    if (quantity < 1) {
      return;
    }

    if (mode === 'assetType') {
      if (!selectedAssetTypeId) return;
      const assetType = assetTypes?.find((type) => type.id === selectedAssetTypeId);
      if (!assetType) return;

      if (
        value.some((pr) => {
          const parentFilterRaw = pr.filters?.['parentAssetId'];
          const parentFilter = typeof parentFilterRaw === 'string' ? parentFilterRaw : undefined;
          return !parentFilter && pr.assetTypeId === assetType.id;
        })
      ) {
        return;
      }

      onChange([
        ...value,
        {
          assetTypeId: assetType.id,
          assetTypeName: assetType.name,
          quantity,
        },
      ]);
      setSelectedAssetTypeId('');
    } else {
      if (!selectedParentAssetId) return;
      const parentAssetOption = parentAssetOptions.find((opt) => opt.value === selectedParentAssetId);
      const parentAsset = parentAssetLookup.get(selectedParentAssetId);
      if (!parentAssetOption || !parentAsset) return;

      if (
        value.some((pr) => {
          const parentFilterRaw = pr.filters?.['parentAssetId'];
          const parentFilter = typeof parentFilterRaw === 'string' ? parentFilterRaw : undefined;
          return parentFilter === selectedParentAssetId;
        })
      ) {
        return;
      }

      onChange([
        ...value,
        {
          assetTypeId: parentAssetOption.assetTypeId,
          assetTypeName: parentAssetOption.assetTypeName,
          quantity,
          filters: { parentAssetId: selectedParentAssetId },
        },
      ]);
      setSelectedParentAssetId('');
    }

    setQuantity(1);
  };

  const handleRemovePool = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  return (
    <Stack gap="sm">
      <Text fw={500}>Pool-Anforderungen</Text>

      <SegmentedControl
        value={mode}
        onChange={(val) => setMode(val as SelectionMode)}
        data={[
          { label: 'Nach Asset-Typ', value: 'assetType' },
          { label: 'Eltern-Asset', value: 'parentAsset' },
        ]}
        size="xs"
      />

      {value.length > 0 && (
        <Stack gap="xs">
          {value.map((pool, index) => {
            const parentFilterRaw = pool.filters?.['parentAssetId'];
            const parentAssetId = typeof parentFilterRaw === 'string' ? parentFilterRaw : undefined;
            const parentAsset = parentAssetId ? parentAssetLookup.get(parentAssetId) : undefined;
            const displayLabel = parentAsset
              ? `${pool.quantity}x ${parentAsset.name}`
              : `${pool.quantity}x ${pool.assetTypeName}`;

            return (
              <Paper key={parentAssetId ?? `${pool.assetTypeId}-${index}`} p="xs" withBorder>
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm">{displayLabel}</Text>
                    {parentAsset && (
                      <Group gap={6}>
                        <Badge size="xs" color="blue">
                          Parent-Asset
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Asset-Typ: {pool.assetTypeName}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                  <ActionIcon color="red" variant="subtle" onClick={() => handleRemovePool(index)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Group wrap="nowrap">
        <NumberInput
          placeholder="Anzahl"
          min={1}
          value={quantity}
          onChange={(val) => setQuantity(typeof val === 'number' ? val : 1)}
          style={{ width: 100 }}
        />
        {mode === 'assetType' ? (
          <Select
            placeholder="Asset-Typ auswählen"
            data={assetTypes?.map((type) => ({ value: type.id, label: type.name })) || []}
            value={selectedAssetTypeId}
            onChange={(val) => setSelectedAssetTypeId(val || '')}
            searchable
            style={{ flex: 1 }}
          />
        ) : (
          <Select
            placeholder="Eltern-Asset auswählen"
            data={parentAssetOptions}
            value={selectedParentAssetId}
            onChange={(val) => setSelectedParentAssetId(val || '')}
            searchable
            nothingFoundMessage="Keine passenden Assets"
            style={{ flex: 1 }}
          />
        )}
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAddPool}
          disabled={
            quantity < 1 || (mode === 'assetType' ? !selectedAssetTypeId : !selectedParentAssetId)
          }
        >
          Hinzufügen
        </Button>
      </Group>

      {value.length === 0 && (
        <Text size="sm" c="dimmed">
          Noch keine Pool-Anforderungen definiert
        </Text>
      )}
    </Stack>
  );
}
