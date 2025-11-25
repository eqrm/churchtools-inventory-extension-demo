import '@testing-library/jest-dom/vitest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, userEvent } from '../../../src/tests/utils/custom-render';
import { initI18n } from '../../../src/i18n/config';
import { AssetModelList } from '../../../src/pages/AssetModelList';
import { useAssetModels } from '../../../src/hooks/useAssetModels';
import { useCategories } from '../../../src/hooks/useCategories';
import { useAssets } from '../../../src/hooks/useAssets';
import type { AssetModel } from '../../../src/types/model';
import type { Asset, AssetType } from '../../../src/types/entities';

vi.mock('../../../src/hooks/useAssetModels', () => ({
  useAssetModels: vi.fn(),
}));

vi.mock('../../../src/hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('../../../src/hooks/useAssets', () => ({
  useAssets: vi.fn(),
}));

vi.mock('@mantine/notifications', async () => {
  const actual = await vi.importActual<typeof import('@mantine/notifications')>(
    '@mantine/notifications',
  );

  return {
    ...actual,
    notifications: {
      ...(actual.notifications ?? {}),
      show: vi.fn(),
    },
  };
});

type MockFn = ReturnType<typeof vi.fn>;

const mockedUseAssetModels = useAssetModels as unknown as MockFn;
const mockedUseCategories = useCategories as unknown as MockFn;
const mockedUseAssets = useAssets as unknown as MockFn;

const baseTimestamp = '2024-01-01T00:00:00.000Z';

const createAssetType = (overrides: Partial<AssetType>): AssetType => ({
  id: `type-${Math.random().toString(36).slice(2, 7)}`,
  name: 'Default Type',
  customFields: [],
  createdBy: 'user-1',
  createdByName: 'User One',
  createdAt: baseTimestamp,
  lastModifiedBy: 'user-1',
  lastModifiedByName: 'User One',
  lastModifiedAt: baseTimestamp,
  ...overrides,
});

const createAssetModel = (overrides: Partial<AssetModel>): AssetModel => ({
  id: `model-${Math.random().toString(36).slice(2, 7)}`,
  name: 'Model A',
  assetTypeId: 'type-a',
  defaultValues: {},
  tagIds: [],
  createdBy: 'user-1',
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  ...overrides,
});

const createAsset = (overrides: Partial<Asset>): Asset => ({
  id: `asset-${Math.random().toString(36).slice(2, 7)}`,
  assetNumber: 'EQ-01',
  name: 'Asset A',
  assetType: { id: 'type-a', name: 'Default Type' },
  status: 'available',
  bookable: true,
  customFieldValues: {},
  barcode: 'barcode-1',
  qrCode: 'qr-1',
  isParent: false,
  createdBy: 'user-1',
  createdByName: 'User One',
  createdAt: baseTimestamp,
  lastModifiedBy: 'user-1',
  lastModifiedByName: 'User One',
  lastModifiedAt: baseTimestamp,
  ...overrides,
});

describe('AssetModelList', () => {
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    const assetTypes: AssetType[] = [
      createAssetType({ id: 'type-a', name: 'Cameras' }),
      createAssetType({ id: 'type-b', name: 'Mixers' }),
    ];

    const models: AssetModel[] = [
      createAssetModel({
        id: 'model-camera',
        name: 'Studio Camera Body',
        manufacturer: 'Canon',
        modelNumber: 'C200',
        assetTypeId: 'type-a',
      }),
      createAssetModel({
        id: 'model-mixer',
        name: 'Mixing Console X32',
        manufacturer: 'Behringer',
        modelNumber: 'X32',
        assetTypeId: 'type-b',
      }),
    ];

    const assets: Asset[] = [
      createAsset({ id: 'asset-1', modelId: 'model-camera', assetType: { id: 'type-a', name: 'Cameras' } }),
      createAsset({ id: 'asset-2', modelId: 'model-camera', assetType: { id: 'type-a', name: 'Cameras' } }),
      createAsset({ id: 'asset-3', modelId: 'model-mixer', assetType: { id: 'type-b', name: 'Mixers' } }),
    ];

    mockedUseAssetModels.mockReturnValue({
      models,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createModel: vi.fn(),
      updateModel: vi.fn(),
      deleteModel: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    });

    mockedUseCategories.mockReturnValue({
      data: assetTypes,
      isLoading: false,
      isPending: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    mockedUseAssets.mockReturnValue({
      data: assets,
      isLoading: false,
      isPending: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders asset models as cards with type badge and counts', () => {
    render(<AssetModelList />);

    const modelTitle = screen.getByText('Studio Camera Body');
    expect(modelTitle).toBeInTheDocument();
    expect(screen.getAllByText('Cameras').length).toBeGreaterThan(0);

    const modelCard = modelTitle.closest('[data-with-border="true"]') as HTMLElement | null;
    expect(modelCard).not.toBeNull();
    expect(modelCard).toHaveTextContent('2 assets using this model');
  });

  it('filters models by search input', async () => {
    render(<AssetModelList />);
    const [searchInput] = screen.getAllByRole('textbox');

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'Mixing');

    expect(screen.getByText('Mixing Console X32')).toBeInTheDocument();
    expect(screen.queryByText('Studio Camera Body')).not.toBeInTheDocument();
  });

  it('shows filtered empty state and clears filters', async () => {
    render(<AssetModelList />);
    const [searchInput] = screen.getAllByRole('textbox');

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'No match');

    expect(screen.getByText('No asset models match your filters')).toBeInTheDocument();

    const clearButtons = screen.getAllByRole('button', { name: /Clear filters/i });
    await userEvent.click(clearButtons[0]);

    expect(screen.queryByText('No asset models match your filters')).not.toBeInTheDocument();
    expect(screen.getByText('Studio Camera Body')).toBeInTheDocument();
  });
});
