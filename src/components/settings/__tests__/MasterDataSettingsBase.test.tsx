import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../tests/utils/custom-render';
import { MasterDataSettingsBase } from '../MasterDataSettingsBase';
import { MASTER_DATA_DEFINITIONS } from '../../../utils/masterData';
import { IconBuilding } from '@tabler/icons-react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../hooks/useAssets', () => ({
  useAssets: () => ({
    data: [
      { id: '1', manufacturer: 'Apple' },
      { id: '2', manufacturer: 'Apple' },
      { id: '3', manufacturer: 'Dell' },
    ],
  }),
}));

vi.mock('../../../hooks/useMasterDataNames', () => ({
  useMasterData: () => ({
    items: [
      { id: 'm1', name: 'Apple' },
      { id: 'm2', name: 'Dell' },
      { id: 'm3', name: 'HP' },
    ],
    isLoading: false,
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  }),
}));

describe('MasterDataSettingsBase', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to AssetList with filters when badge is clicked', () => {
    render(
      <MasterDataSettingsBase
        definition={MASTER_DATA_DEFINITIONS.manufacturers}
        title="Manufacturers"
        description="Manage manufacturers"
        placeholder="e.g. Apple"
        entityLabel="Manufacturer"
        emptyStateMessage="No manufacturers"
        noteMessage="Note"
        icon={IconBuilding}
      />
    );

    // Apple has 2 assets
    const appleBadge = screen.getByText('2');
    fireEvent.click(appleBadge);

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/assets?filters='));
    
    // Decode the filter to verify
    const call = mockNavigate.mock.calls[0][0];
    const filterParam = new URLSearchParams(call.split('?')[1]).get('filters');
    expect(filterParam).toBeTruthy();
    const decoded = JSON.parse(atob(filterParam || ''));
    
    // The structure of decoded filter group
    // It should be a group with one child condition
    expect(decoded.children[0].field).toBe('manufacturer');
    expect(decoded.children[0].value).toBe('Apple');
  });

  it('does not navigate when count is 0', () => {
    render(
      <MasterDataSettingsBase
        definition={MASTER_DATA_DEFINITIONS.manufacturers}
        title="Manufacturers"
        description="Manage manufacturers"
        placeholder="e.g. Apple"
        entityLabel="Manufacturer"
        emptyStateMessage="No manufacturers"
        noteMessage="Note"
        icon={IconBuilding}
      />
    );

    // HP has 0 assets
    const hpBadge = screen.getByText('0');
    fireEvent.click(hpBadge);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
