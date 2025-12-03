/**
 * T2.1.1-T2.1.2 - KitForm Tests
 * 
 * Tests for KitForm component after removing flexible kit support.
 * Verifies that the form only supports fixed kits and removes type selection.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all hooks before importing component
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../hooks/useKits', () => ({
  useCreateKit: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateKit: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../../hooks/useMasterDataNames', () => ({
  useMasterData: () => ({
    names: [],
    addItem: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useAssets', () => ({
  useAssets: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Import after mocks are set up
import { KitForm } from '../../../components/kits/KitForm';

describe('KitForm - Fixed Kit Only (T2.1.1-T2.1.2)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderForm = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <KitForm />
        </MantineProvider>
      </QueryClientProvider>
    );
  };

  it('should NOT render kit type select field', () => {
    renderForm();
    
    // The type select should NOT be present - look for the flexible option text
    expect(screen.queryByText('form.fields.typeOptions.flexible')).not.toBeInTheDocument();
  });

  it('should render FixedKitBuilder section by default', () => {
    renderForm();
    
    // Fixed kit heading should be shown (looking for translation key)
    expect(screen.getByText('form.fixed.heading')).toBeInTheDocument();
  });

  it('should NOT render FlexibleKitBuilder section', () => {
    renderForm();
    
    // Flexible kit builder heading should NOT be shown
    expect(screen.queryByText('form.flexible.heading')).not.toBeInTheDocument();
  });

  it('should render name input field', () => {
    renderForm();
    
    // Name label should be present
    expect(screen.getByText('form.fields.nameLabel')).toBeInTheDocument();
  });

  it('should render inheritance checkboxes', () => {
    renderForm();
    
    expect(screen.getByText('form.inheritance.heading')).toBeInTheDocument();
  });
});
