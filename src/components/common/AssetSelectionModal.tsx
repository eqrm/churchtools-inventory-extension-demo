/**
 * AssetSelectionModal Component
 * T3.1.1-T3.1.8: Unified asset selection with search and scanner support
 * 
 * Features:
 * - Search by name, asset number, description, barcode
 * - Scanner input detection (rapid keystrokes)
 * - Single or multi-select mode
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Selected assets displayed as chips
 * - Filter by status, exclude specific assets
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Badge,
  Button,
  Center,
  Checkbox,
  CloseButton,
  Group,
  Modal,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPackageOff, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Asset, AssetFilters } from '../../types/entities';
import { useAssets } from '../../hooks/useAssets';
import { AssetStatusBadge } from '../assets/AssetStatusBadge';

export interface AssetSelectionModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (assets: Asset[]) => void;
  selectedAssets?: Asset[];
  mode: 'single' | 'multi';
  filter?: Pick<AssetFilters, 'status' | 'assetTypeId' | 'location'>;
  excludeAssetIds?: string[];
  title?: string;
}

interface AssetSelectionRowProps {
  asset: Asset;
  selected: boolean;
  highlighted: boolean;
  onToggle: () => void;
  mode: 'single' | 'multi';
}

function AssetSelectionRow({ asset, selected, highlighted, onToggle, mode }: AssetSelectionRowProps) {
  return (
    <UnstyledButton
      onClick={onToggle}
      data-testid={`asset-row-${asset.id}`}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: '4px',
        backgroundColor: highlighted ? 'var(--mantine-color-blue-0)' : 'transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!highlighted) {
          e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
        }
      }}
      onMouseLeave={(e) => {
        if (!highlighted) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <Group gap="sm" wrap="nowrap">
        {mode === 'multi' && (
          <Checkbox
            checked={selected}
            onChange={() => {}} // Handled by parent click
            tabIndex={-1}
            style={{ pointerEvents: 'none' }}
          />
        )}
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} truncate>
            {asset.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {asset.assetNumber}
          </Text>
        </Stack>
        <AssetStatusBadge status={asset.status} size="xs" />
      </Group>
    </UnstyledButton>
  );
}

// Hook to detect barcode scanner input (rapid keystrokes)
function useScannerDetection(onScan: (value: string) => void) {
  const bufferRef = useRef<string>('');
  const lastKeystrokeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input (scanner input goes to focused input)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKeystroke = now - lastKeystrokeRef.current;

      // If more than 100ms since last keystroke, start fresh buffer
      if (timeSinceLastKeystroke > 100) {
        bufferRef.current = '';
      }

      lastKeystrokeRef.current = now;

      // Only capture printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      } else if (e.key === 'Enter' && bufferRef.current.length >= 3) {
        // Enter key with buffer content = scan complete
        const scannedValue = bufferRef.current;
        bufferRef.current = '';
        onScan(scannedValue);
        e.preventDefault();
        return;
      }

      // Clear buffer after 100ms of no activity
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        // If buffer has content and it was typed very fast (scanner), trigger scan
        if (bufferRef.current.length >= 5) {
          const scannedValue = bufferRef.current;
          bufferRef.current = '';
          onScan(scannedValue);
        } else {
          bufferRef.current = '';
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onScan]);
}

export function AssetSelectionModal({
  opened,
  onClose,
  onConfirm,
  selectedAssets: initialSelectedAssets = [],
  mode,
  filter,
  excludeAssetIds = [],
  title,
}: AssetSelectionModalProps) {
  const { t } = useTranslation('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>(initialSelectedAssets);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Build filters for useAssets hook
  const assetFilters = useMemo<AssetFilters>(() => {
    const filters: AssetFilters = {
      search: debouncedQuery || undefined,
    };
    if (filter?.status) {
      filters.status = filter.status;
    }
    if (filter?.assetTypeId) {
      filters.assetTypeId = filter.assetTypeId;
    }
    if (filter?.location) {
      filters.location = filter.location;
    }
    return filters;
  }, [debouncedQuery, filter]);

  const { data: assets = [], isLoading } = useAssets(assetFilters);

  // Filter out excluded assets and apply local search
  const filteredAssets = useMemo(() => {
    const excludeSet = new Set(excludeAssetIds);
    return assets.filter((asset) => {
      if (excludeSet.has(asset.id)) return false;
      // Additional local search filtering
      if (debouncedQuery) {
        const query = debouncedQuery.toLowerCase();
        return (
          asset.name.toLowerCase().includes(query) ||
          asset.assetNumber.toLowerCase().includes(query) ||
          (asset.description?.toLowerCase().includes(query) ?? false) ||
          asset.barcode.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [assets, excludeAssetIds, debouncedQuery]);

  // Reset state when modal opens
  useEffect(() => {
    if (opened) {
      setSearchQuery('');
      setSelectedAssets(initialSelectedAssets);
      setHighlightedIndex(0);
      // Focus search input after modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [opened, initialSelectedAssets]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredAssets.length]);

  // Handle scanner input
  const handleScan = useCallback(
    (scannedValue: string) => {
      const asset = filteredAssets.find(
        (a) => a.barcode === scannedValue || a.assetNumber === scannedValue
      );

      if (!asset) {
        notifications.show({
          title: t('selection.scanNotFound', { value: scannedValue }),
          message: t('selection.scanNotFoundMessage'),
          color: 'red',
        });
        return;
      }

      const isAlreadySelected = selectedAssets.some((a) => a.id === asset.id);
      if (isAlreadySelected) {
        notifications.show({
          title: t('selection.scanAlreadySelected', { name: asset.name }),
          message: t('selection.scanAlreadySelectedMessage'),
          color: 'blue',
        });
        return;
      }

      if (mode === 'single') {
        setSelectedAssets([asset]);
      } else {
        setSelectedAssets((prev) => [...prev, asset]);
      }

      notifications.show({
        title: t('selection.scanSuccess', { name: asset.name }),
        message: t('selection.scanSuccessMessage'),
        color: 'green',
      });
    },
    [filteredAssets, selectedAssets, mode, t]
  );

  useScannerDetection(handleScan);

  // Toggle asset selection
  const toggleAsset = useCallback(
    (asset: Asset) => {
      if (mode === 'single') {
        setSelectedAssets([asset]);
        return;
      }

      setSelectedAssets((prev) => {
        const isSelected = prev.some((a) => a.id === asset.id);
        if (isSelected) {
          return prev.filter((a) => a.id !== asset.id);
        }
        return [...prev, asset];
      });
    },
    [mode]
  );

  // Remove asset from selection
  const removeFromSelection = useCallback((assetId: string) => {
    setSelectedAssets((prev) => prev.filter((a) => a.id !== assetId));
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, filteredAssets.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredAssets[highlightedIndex]) {
            toggleAsset(filteredAssets[highlightedIndex]);
          } else if (selectedAssets.length > 0 && searchQuery === '') {
            onConfirm(selectedAssets);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredAssets, highlightedIndex, toggleAsset, selectedAssets, searchQuery, onConfirm, onClose]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (resultsContainerRef.current && filteredAssets.length > 0) {
      const highlightedElement = resultsContainerRef.current.querySelector(
        `[data-testid="asset-row-${filteredAssets[highlightedIndex]?.id}"]`
      );
      highlightedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, filteredAssets]);

  const handleConfirm = () => {
    onConfirm(selectedAssets);
  };

  const defaultTitle = mode === 'single' 
    ? t('selection.titleSingle', 'Select Asset')
    : t('selection.titleMulti', 'Select Assets');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title ?? defaultTitle}
      size="lg"
      aria-label="Asset selection modal"
    >
      <Stack gap="md">
        {/* Search input */}
        <TextInput
          ref={searchInputRef}
          placeholder={t('selection.searchPlaceholder', 'Search by name, number, or barcode...')}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          data-testid="asset-search-input"
        />

        {/* Selected assets chips */}
        {selectedAssets.length > 0 && (
          <ScrollArea type="auto" offsetScrollbars>
            <Group gap="xs" wrap="nowrap" style={{ minHeight: 32 }}>
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {t('selection.selected', 'Selected')} ({selectedAssets.length}):
              </Text>
              {selectedAssets.map((asset) => (
                <Badge
                  key={asset.id}
                  variant="light"
                  rightSection={
                    <CloseButton
                      size="xs"
                      onClick={() => removeFromSelection(asset.id)}
                      aria-label={`Remove ${asset.name}`}
                    />
                  }
                  style={{ paddingRight: 4 }}
                >
                  {asset.assetNumber}
                </Badge>
              ))}
            </Group>
          </ScrollArea>
        )}

        {/* Results list */}
        <ScrollArea
          ref={resultsContainerRef}
          h={400}
          type="auto"
          role="listbox"
          aria-activedescendant={filteredAssets[highlightedIndex]?.id}
        >
          {isLoading ? (
            <Stack gap="xs">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} height={50} />
                ))}
            </Stack>
          ) : filteredAssets.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <IconPackageOff size={48} color="var(--mantine-color-gray-5)" />
                <Text fw={500}>{t('selection.noResults', 'No assets found')}</Text>
                <Text size="sm" c="dimmed">
                  {t('selection.noResultsHint', 'Try a different search or scan a barcode')}
                </Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap={2}>
              {filteredAssets.map((asset, index) => (
                <AssetSelectionRow
                  key={asset.id}
                  asset={asset}
                  selected={selectedAssets.some((a) => a.id === asset.id)}
                  highlighted={index === highlightedIndex}
                  onToggle={() => toggleAsset(asset)}
                  mode={mode}
                />
              ))}
            </Stack>
          )}
        </ScrollArea>

        {/* Footer with actions */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:actions.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedAssets.length === 0}
          >
            {t('selection.confirm', 'Confirm')} ({selectedAssets.length})
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
