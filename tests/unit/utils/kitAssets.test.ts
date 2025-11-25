import { describe, expect, it } from 'vitest';
import type { AssetFilters, Kit } from '../../../src/types/entities';
import { kitMatchesAssetFilters } from '../../../src/utils/kitAssets';

const BASE_TIMESTAMP = '2025-11-17T00:00:00.000Z';

function createKit(overrides?: Partial<Kit>): Kit {
  return {
    id: overrides?.id ?? 'kit-001',
    name: overrides?.name ?? 'Stage Kit',
    type: overrides?.type ?? 'fixed',
    location: overrides?.location,
    status: overrides?.status,
    tags: overrides?.tags,
    inheritedProperties: overrides?.inheritedProperties,
    completenessStatus: overrides?.completenessStatus,
    assemblyDate: overrides?.assemblyDate,
    disassemblyDate: overrides?.disassemblyDate,
    boundAssets: overrides?.boundAssets,
    poolRequirements: overrides?.poolRequirements,
    createdBy: overrides?.createdBy ?? 'user-1',
    createdByName: overrides?.createdByName ?? 'Alex Example',
    createdAt: overrides?.createdAt ?? BASE_TIMESTAMP,
    lastModifiedBy: overrides?.lastModifiedBy ?? 'user-1',
    lastModifiedByName: overrides?.lastModifiedByName ?? 'Alex Example',
    lastModifiedAt: overrides?.lastModifiedAt ?? BASE_TIMESTAMP,
    schemaVersion: overrides?.schemaVersion,
  };
}

describe('kitMatchesAssetFilters', () => {
  it('matches when the search term targets the generated kit asset number', () => {
    const kit = createKit({
      boundAssets: [
        {
          assetId: 'asset-1',
          assetNumber: 'MAIN-001',
          name: 'Main Speaker',
        },
      ],
    });

    const filters: AssetFilters = { search: 'main-001' };
    expect(kitMatchesAssetFilters(kit, filters)).toBe(true);
  });

  it('matches when the search term targets the kit barcode', () => {
    const kit = createKit({ id: 'abc-123' });
    const filters: AssetFilters = { search: `kit-${kit.id}` };
    expect(kitMatchesAssetFilters(kit, filters)).toBe(true);
  });
});
