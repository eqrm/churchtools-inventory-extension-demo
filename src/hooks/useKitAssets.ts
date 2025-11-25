import { useMemo } from 'react';
import type { AssetFilters } from '../types/entities';
import { useFeatureSettingsStore } from '../stores';
import { useKits } from './useKits';
import { kitMatchesAssetFilters, mapKitToAsset } from '../utils/kitAssets';

export interface UseKitAssetsOptions {
  enabled?: boolean;
  force?: boolean;
}

export function useKitAssets(filters?: AssetFilters, options?: UseKitAssetsOptions) {
  const kitsEnabled = useFeatureSettingsStore((state) => state.kitsEnabled);
  const shouldFetch = options?.force ?? options?.enabled ?? kitsEnabled;
  const kitQuery = useKits({ enabled: shouldFetch });

  const kitAssets = useMemo(() => {
    if (!shouldFetch || !kitQuery.data || kitQuery.data.length === 0) {
      return [];
    }

    return kitQuery.data
      .filter((kit) => kitMatchesAssetFilters(kit, filters))
      .map(mapKitToAsset);
  }, [shouldFetch, kitQuery.data, filters]);

  return {
    kitAssets,
    kitsEnabled,
    shouldFetch,
    isLoading: shouldFetch ? kitQuery.isLoading : false,
    isFetching: shouldFetch ? kitQuery.isFetching : false,
    error: kitQuery.error,
    refetch: kitQuery.refetch,
  };
}
