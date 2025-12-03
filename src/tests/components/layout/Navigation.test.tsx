import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Navigation } from '../../../components/layout/Navigation';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'navigation:title': 'Inventory Manager',
        'navigation:items.dashboard': 'Dashboard',
        'navigation:items.categories': 'Asset Types',
        'navigation:items.assets': 'Assets',
        'navigation:items.assetModels': 'Asset Models',
        'navigation:items.kits': 'Kits',
        'navigation:items.bookings': 'Bookings',
        'navigation:items.stockTake': 'Stock Take',
        'navigation:items.reports': 'Reports',
        'navigation:items.maintenance': 'Maintenance',
        'navigation:items.quickScan': 'Quick Scan',
        'navigation:items.settings': 'Settings',
        'navigation:quickScanDescription': 'Scan barcode',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock stores
vi.mock('../../../stores', () => ({
  useFeatureSettingsStore: vi.fn((selector) => {
    const state = {
      bookingsEnabled: false,
      maintenanceEnabled: false,
      kitsEnabled: false,
    };
    return selector(state);
  }),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock useUndo hook
vi.mock('../../../hooks/useUndo', () => ({
  useUndoHistory: () => ({
    history: [],
    undoAction: vi.fn(),
    isMutating: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const renderNavigation = () => {
  return render(
    <MantineProvider>
      <BrowserRouter>
        <Navigation>
          <div>Test content</div>
        </Navigation>
      </BrowserRouter>
    </MantineProvider>
  );
};

describe('Navigation component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Global Undo History removal', () => {
    it('should NOT render undo history button in header', () => {
      renderNavigation();
      
      // The undo history button should not be present in header
      const header = document.querySelector('header');
      expect(header).toBeTruthy();
      
      // Look for the old undo history icon button
      const undoHistoryButton = screen.queryByRole('button', { name: /undo|history/i });
      
      // Should not find any button with undo/history in header
      expect(undoHistoryButton).toBeNull();
    });

    it('should NOT render undo history modal', () => {
      renderNavigation();
      
      // The modal title "Undo History" should not appear anywhere
      expect(screen.queryByText(/Undo History/i)).toBeNull();
    });

    it('should render navigation items correctly', () => {
      renderNavigation();
      
      // Basic navigation items should be present (check by data attributes which are always present)
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeTruthy();
      expect(screen.getByRole('link', { name: /assets/i })).toBeTruthy();
      expect(screen.getByRole('link', { name: /settings/i })).toBeTruthy();
    });

    it('should render header with app title', () => {
      renderNavigation();
      
      // Title is rendered as heading level 3
      expect(screen.getByRole('heading', { level: 3 })).toBeTruthy();
    });
  });
});
