import { describe, expect, it } from 'vitest';
import { getAssetDetailPath } from '../../utils/assetNavigation';

describe('getAssetDetailPath', () => {
  it('returns the asset route for non-kit assets', () => {
    const path = getAssetDetailPath({ id: 'asset-123', isKit: false, kitId: undefined });
    expect(path).toBe('/assets/asset-123');
  });

  it('routes kits with explicit kitId to the kits page', () => {
    const path = getAssetDetailPath({ id: 'kit-abc', isKit: true, kitId: 'abc' } as const);
    expect(path).toBe('/kits/abc');
  });

  it('sanitizes kit-prefixed ids when kitId is missing', () => {
    const path = getAssetDetailPath({ id: 'kit-9999', isKit: true, kitId: undefined });
    expect(path).toBe('/kits/9999');
  });
});
