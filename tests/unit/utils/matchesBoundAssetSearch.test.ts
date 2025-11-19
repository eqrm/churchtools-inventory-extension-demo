import { describe, expect, it } from 'vitest';
import type { AssetSelectOption } from '../../../src/components/kits/FixedKitBuilder';
import { matchesBoundAssetSearch } from '../../../src/utils/matchesBoundAssetSearch';

const baseOption: AssetSelectOption = {
  value: 'asset-1',
  label: 'ASSET-1 - Stage Mic',
  assetNumber: 'ASSET-1',
  assetName: 'Stage Mic',
  assetDescription: 'Wireless microphone',
  assetLocation: 'Main Hall',
};

describe('matchesBoundAssetSearch', () => {
  it('returns true for empty search value', () => {
    expect(matchesBoundAssetSearch('', baseOption)).toBe(true);
  });

  it('matches asset number fragments', () => {
    expect(matchesBoundAssetSearch('asset-1', baseOption)).toBe(true);
  });

  it('matches asset name fragments', () => {
    expect(matchesBoundAssetSearch('stage', baseOption)).toBe(true);
  });

  it('matches asset description fragments', () => {
    expect(matchesBoundAssetSearch('wireless', baseOption)).toBe(true);
  });

  it('matches location fragments', () => {
    expect(matchesBoundAssetSearch('main', baseOption)).toBe(true);
  });

  it('is case insensitive', () => {
    expect(matchesBoundAssetSearch('STagE', baseOption)).toBe(true);
  });

  it('handles non-string search values', () => {
    expect(matchesBoundAssetSearch(undefined, baseOption)).toBe(true);
    expect(matchesBoundAssetSearch(123, baseOption)).toBe(false);
  });

  it('handles options with missing metadata', () => {
    const partialOption = {
      ...baseOption,
      assetNumber: undefined,
      assetName: undefined,
      assetDescription: 'Stage microphone',
    } as unknown as AssetSelectOption;
    expect(matchesBoundAssetSearch('stage', partialOption)).toBe(true);
    expect(matchesBoundAssetSearch('drum', partialOption)).toBe(false);
  });

  it('tolerates undefined option objects', () => {
    expect(matchesBoundAssetSearch('anything', undefined)).toBe(true);
  });

  it('returns false when no fields match', () => {
    expect(matchesBoundAssetSearch('drum', baseOption)).toBe(false);
  });
});
