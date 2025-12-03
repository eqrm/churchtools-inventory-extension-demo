import { describe, expect, it } from 'vitest';
import { getAssetDetailPath } from '../../utils/assetNavigation';

describe('getAssetDetailPath', () => {
  it('returns the asset route for non-kit assets', () => {
    const path = getAssetDetailPath({ id: 'asset-123', isKit: false });
    expect(path).toBe('/assets/asset-123');
  });

  // T2.2.1: Kit assets now navigate to /assets route, kit info shown inline
  it('routes kit assets to the assets page (kit info shown inline)', () => {
    const path = getAssetDetailPath({ id: 'kit-abc', isKit: true });
    expect(path).toBe('/assets/kit-abc');
  });

  it('kit assets always use /assets route regardless of id format', () => {
    const path = getAssetDetailPath({ id: 'kit-9999', isKit: true });
    expect(path).toBe('/assets/kit-9999');
  });
});
