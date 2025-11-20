import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../types/entities';
import type { AssetType } from '../../types/entities';
import type { AssetModel } from '../../types/model';
import { AssetModelList } from '../../pages/AssetModelList';

const mockUseAssetModels = vi.fn();
const mockUseCategories = vi.fn();
const mockUseAssets = vi.fn();
const assetFormInitialDataSpy = vi.fn();

vi.mock('../../hooks/useAssetModels', () => ({
  useAssetModels: (...args: unknown[]) => mockUseAssetModels(...args),
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => mockUseCategories(...args),
}));

vi.mock('../../hooks/useAssets', () => ({
  useAssets: (...args: unknown[]) => mockUseAssets(...args),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('../../components/assets/AssetForm', () => ({
  AssetForm: ({ initialData }: { initialData?: Partial<Asset> }) => {
    assetFormInitialDataSpy(initialData);
    return <div data-testid="asset-form">{initialData?.name}</div>;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params || Object.keys(params).length === 0) {
        return key;
      }
      const mapped = Object.entries(params)
        .map(([paramKey, value]) => `${paramKey}:${value}`)
        .join(',');
      return `${key}(${mapped})`;
    },
  }),
}));

function buildAssetType(overrides: Partial<AssetType> = {}): AssetType {
  return {
    id: overrides.id ?? 'type-1',
    name: overrides.name ?? 'Lighting',
    icon: overrides.icon,
    assetNameTemplate: overrides.assetNameTemplate,
    mainImage: overrides.mainImage,
    defaultBookable: overrides.defaultBookable ?? true,
    customFields: overrides.customFields ?? [],
    createdBy: overrides.createdBy ?? 'user-1',
    createdByName: overrides.createdByName ?? 'Tester',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    lastModifiedBy: overrides.lastModifiedBy ?? 'user-1',
    lastModifiedByName: overrides.lastModifiedByName ?? 'Tester',
    lastModifiedAt: overrides.lastModifiedAt ?? '2024-01-02T00:00:00.000Z',
    schemaVersion: overrides.schemaVersion,
  };
}

function buildAssetModel(overrides: Partial<AssetModel> = {}): AssetModel {
  return {
    id: overrides.id ?? 'model-1',
    name: overrides.name ?? 'Camera Rig',
    assetTypeId: overrides.assetTypeId ?? 'type-1',
    manufacturer: overrides.manufacturer ?? 'Canon',
    modelNumber: overrides.modelNumber ?? 'CR-100',
    defaultWarrantyMonths: overrides.defaultWarrantyMonths ?? 24,
    defaultBookable: overrides.defaultBookable ?? true,
    defaultValues: overrides.defaultValues ?? { resolution: '4K' },
    tagIds: overrides.tagIds ?? [],
    createdBy: overrides.createdBy ?? 'user-1',
    createdByName: overrides.createdByName ?? 'Tester',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-02T00:00:00.000Z',
  };
}

function buildAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: overrides.id ?? 'asset-1',
    assetNumber: overrides.assetNumber ?? 'AST-001',
    name: overrides.name ?? 'Live Camera',
    assetType: overrides.assetType ?? { id: 'type-1', name: 'Lighting' },
    status: overrides.status ?? 'available',
    barcode: overrides.barcode ?? 'AST-001',
    qrCode: overrides.qrCode ?? 'AST-001',
    bookable: overrides.bookable ?? true,
    isParent: overrides.isParent ?? false,
    customFieldValues: overrides.customFieldValues ?? {},
    createdBy: overrides.createdBy ?? 'user-1',
    createdByName: overrides.createdByName ?? 'Tester',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    lastModifiedBy: overrides.lastModifiedBy ?? 'user-1',
    lastModifiedByName: overrides.lastModifiedByName ?? 'Tester',
    lastModifiedAt: overrides.lastModifiedAt ?? '2024-01-02T00:00:00.000Z',
    modelId: overrides.modelId,
    ...overrides,
  } as Asset;
}

function setupMocks({
  models = [buildAssetModel()],
  assetTypes = [buildAssetType()],
  assets = [],
}: {
  models?: AssetModel[];
  assetTypes?: AssetType[];
  assets?: Asset[];
} = {}) {
  mockUseAssetModels.mockReturnValue({
    models,
    isLoading: false,
    error: null,
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deleteModel: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  mockUseCategories.mockReturnValue({ data: assetTypes, isLoading: false });
  mockUseAssets.mockReturnValue({ data: assets, isLoading: false });
}

function renderPage() {
  return render(
    <MantineProvider>
      <AssetModelList />
    </MantineProvider>,
  );
}

describe('AssetModelList', () => {
  beforeEach(() => {
    mockUseAssetModels.mockReset();
    mockUseCategories.mockReset();
    mockUseAssets.mockReset();
    assetFormInitialDataSpy.mockReset();
  });

  it('shows quick-create action and opens the asset form with model defaults', async () => {
    setupMocks({
      models: [buildAssetModel()],
      assets: [buildAsset({ id: 'asset-1', modelId: 'model-1' })],
    });

    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'models:card.quickCreate' }));

    expect(screen.getByTestId('asset-form')).toHaveTextContent('Camera Rig');
    expect(assetFormInitialDataSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Camera Rig',
        manufacturer: 'Canon',
        model: 'CR-100',
        modelId: 'model-1',
      }),
    );
  });

  it('filters asset models by manufacturer', async () => {
    setupMocks({
      models: [
        buildAssetModel({ id: 'model-1', name: 'Canon Cam', manufacturer: 'Canon' }),
        buildAssetModel({ id: 'model-2', name: 'Sony Stage', manufacturer: 'Sony' }),
      ],
    });

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('models:filters.manufacturerLabel'), 'canon');

    expect(screen.getByText('Canon Cam')).toBeInTheDocument();
    expect(screen.queryByText('Sony Stage')).not.toBeInTheDocument();
  });

  it('shows the global empty state when no models are available', () => {
    setupMocks({ models: [] });

    renderPage();

    expect(screen.getByText('models:emptyState.title')).toBeInTheDocument();
    expect(screen.getByText('models:emptyState.description')).toBeInTheDocument();
  });

  it('shows a filtered empty state when search criteria exclude all models', async () => {
    setupMocks({ models: [buildAssetModel({ name: 'Lighting Package' })] });

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('models:filters.searchLabel'), 'router');

    expect(screen.getByText('models:emptyState.filteredTitle')).toBeInTheDocument();
    expect(screen.getByText('models:emptyState.filteredDescription')).toBeInTheDocument();
  });
});
