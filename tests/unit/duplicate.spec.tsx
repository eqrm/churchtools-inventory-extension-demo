import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';

import { AssetDetailPage } from '../../src/pages/AssetDetailPage';

const navigateMock = vi.fn();

// Mock react-router hooks used by AssetDetailPage
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'asset-1' }),
    useNavigate: () => navigateMock,
  };
});

// Mock the notifications module (simple factory, no external references)
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

// Provide a sample asset used for initialData
const sampleAsset = {
  id: 'asset-1',
  assetNumber: 'EQRM-006',
  prefix: 'EQRM',
  name: 'Comfee RG57A1',
  barcode: 'BAR-12345',
  status: 'installed',
  assetGroup: null,
} as unknown as any;

// Mock useAsset hook to return our sample asset
vi.mock('../../src/hooks/useAssets', () => ({
  useAsset: (_id: string) => ({ data: sampleAsset, isLoading: false }),
  // other hooks used by the page are not required for this test
}));

// Ensure feature settings store reports bookings are disabled so the booking modal never renders
vi.mock('../../src/stores', () => ({
  useFeatureSettingsStore: (selector: (state: any) => any) =>
    selector({
      bookingsEnabled: false,
      kitsEnabled: false,
      maintenanceEnabled: false,
      setModuleEnabled: () => {},
    }),
}));

// Mock the heavy AssetDetail component: it will render a button that triggers onDuplicate
vi.mock('../../src/components/assets/AssetDetail', () => ({
  AssetDetail: ({ onEdit, onDuplicate }: any) => {
    return (
      <div>
        <button data-testid="mock-duplicate" onClick={() => onDuplicate && onDuplicate()}>
          Mock Duplicate Trigger
        </button>
        <button data-testid="mock-edit" onClick={() => onEdit && onEdit()}>
          Mock Edit
        </button>
      </div>
    );
  },
}));

vi.mock('../../src/components/assets/AssetBookingIndicator', () => ({
  AssetBookingIndicator: ({ onBookAsset }: any) => (
    <button data-testid="mock-book" onClick={onBookAsset}>
      Book Asset
    </button>
  ),
}));

vi.mock('../../src/components/bookings/BookAssetModal', () => ({
  BookAssetModal: ({ opened, onClose }: any) =>
    opened ? (
      <div data-testid="mock-book-modal">
        <button data-testid="mock-book-modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Mock AssetForm to show the initialData it receives and provide a Create button that calls onSuccess
vi.mock('../../src/components/assets/AssetForm', () => ({
  AssetForm: ({ initialData, asset, onSuccess, onCancel }: any) => {
    return (
      <div>
        <div data-testid="assetform-initial">
          {initialData ? JSON.stringify(initialData) : JSON.stringify(asset)}
        </div>
        <button
          data-testid="assetform-create"
          onClick={() => onSuccess && onSuccess({ id: 'new-1', assetNumber: 'EQRM-007' })}
        >
          Create
        </button>
        <button data-testid="assetform-cancel" onClick={() => onCancel && onCancel()}>
          Cancel
        </button>
      </div>
    );
  },
}));

// Mock minimal Mantine components used by AssetDetailPage to avoid provider and media-query issues
vi.mock('@mantine/core', () => {
  const React = require('react');
  const passthrough = (CompName: string) => (props: any) => {
    const { children, leftSection, rightSection, ...rest } = props;
    return React.createElement('div', { 'data-mantine': CompName, ...rest }, children);
  };
  const Grid = passthrough('Grid');
  (Grid as any).Col = passthrough('Grid.Col');

  return {
    __esModule: true,
    Button: passthrough('Button'),
    Container: passthrough('Container'),
    Group: passthrough('Group'),
    Modal: ({ opened, children }: any) =>
      opened ? React.createElement('div', { 'data-mantine': 'Modal' }, children) : null,
    Stack: passthrough('Stack'),
    Title: passthrough('Title'),
    Grid,
    'default': {},
  };
});

describe('Asset duplication flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the duplicate modal with pre-filled asset data and creates a new asset', async () => {
    render(<AssetDetailPage />);

    await userEvent.click(screen.getByTestId('mock-duplicate'));

    const initial = await screen.findByTestId('assetform-initial');
    const text = initial.textContent ?? '';

    expect(text).toContain('BAR-12345');
    expect(text).toContain('EQRM-006');
    expect(text).toContain('installed');
    expect(text).toContain('EQRM');

    await userEvent.click(screen.getByTestId('assetform-create'));

    const notif = await import('@mantine/notifications');
    await waitFor(() => {
      expect(notif.notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Asset duplicated',
          message: expect.stringContaining('Created EQRM-007'),
        })
      );
    });

    expect(navigateMock).toHaveBeenCalledWith('/assets/new-1');
    expect(screen.queryByTestId('assetform-initial')).toBeNull();
  });

  it('closes the duplicate modal when the user cancels without side effects', async () => {
    render(<AssetDetailPage />);

    await userEvent.click(screen.getByTestId('mock-duplicate'));
    await screen.findByTestId('assetform-initial');

    await userEvent.click(screen.getByTestId('assetform-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('assetform-initial')).toBeNull();
    });

    const notif = await import('@mantine/notifications');
    expect(notif.notifications.show).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
