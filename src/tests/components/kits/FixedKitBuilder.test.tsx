import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../types/entities';
import { FixedKitBuilder, buildSelectableKitAssets } from '../../../components/kits/FixedKitBuilder';

const mockUseAssets = vi.fn();

vi.mock('../../../hooks/useAssets', () => ({
  useAssets: (...args: unknown[]) => mockUseAssets(...args),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params || Object.keys(params).length === 0) {
        return key;
      }
      const serialized = Object.entries(params)
        .map(([paramKey, value]) => `${paramKey}:${value}`)
        .join(',');
      return `${key}(${serialized})`;
    },
  }),
}));

let assetCounter = 0;

function buildAsset(overrides: Partial<Asset> = {}): Asset {
  const generatedId = `asset-${assetCounter += 1}`;
  return {
    id: overrides.id ?? generatedId,
    assetNumber: overrides.assetNumber ?? 'AST-001',
    name: overrides.name ?? 'Demo Asset',
    assetType: overrides.assetType ?? { id: 'type-1', name: 'Demo Type' },
    status: overrides.status ?? 'available',
    bookable: true,
    isParent: false,
    barcode: overrides.barcode ?? 'AST-001',
    qrCode: overrides.qrCode ?? 'AST-001',
    customFieldValues: overrides.customFieldValues ?? {},
    createdBy: overrides.createdBy ?? 'user-1',
    createdByName: overrides.createdByName ?? 'Tester',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    lastModifiedBy: overrides.lastModifiedBy ?? 'user-1',
    lastModifiedByName: overrides.lastModifiedByName ?? 'Tester',
    lastModifiedAt: overrides.lastModifiedAt ?? '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Asset;
}

describe('buildSelectableKitAssets', () => {
  it('excludes deleted assets, kit records, and assets bound to other kits', () => {
    const assets = [
      buildAsset({ id: 'a1' }),
      buildAsset({ id: 'a2', status: 'deleted' }),
      buildAsset({ id: 'a3', kitId: 'other-kit' }),
      buildAsset({ id: 'a4', isKit: true as const }),
      buildAsset({ id: 'a5', kitId: 'kit-123' }),
    ];

    const filtered = buildSelectableKitAssets(assets, 'kit-123');

    expect(filtered.map((asset) => asset.id)).toEqual(['a1', 'a5']);
  });
});

describe('FixedKitBuilder', () => {
  beforeEach(() => {
    mockUseAssets.mockReset();
  });

  it('shows a warning banner for bound assets that are not available', () => {
    const inUseAsset = buildAsset({ id: 'asset-1', assetNumber: 'AUD-100', status: 'in-use' });
    mockUseAssets.mockReturnValue({ data: [inUseAsset] });

    render(
      <MantineProvider>
        <FixedKitBuilder
          value={[{ assetId: 'asset-1', assetNumber: 'AUD-100', name: 'Wireless Pack' }]}
          onChange={() => undefined}
        />
      </MantineProvider>,
    );

    expect(screen.getByTestId('kit-bound-status-warning')).toBeInTheDocument();
  });

  it('informs the user when assets are hidden because they belong to other kits', () => {
    const available = buildAsset({ id: 'asset-1' });
    const blocked = buildAsset({ id: 'asset-2', kitId: 'other-kit' });
    mockUseAssets.mockReturnValue({ data: [available, blocked] });

    render(
      <MantineProvider>
        <FixedKitBuilder value={[]} onChange={() => undefined} />
      </MantineProvider>,
    );

    const hint = screen.getByTestId('kit-blocked-assets-hint');
    expect(hint).toHaveTextContent('form.fixed.kitAssignmentHint');
  });
});
