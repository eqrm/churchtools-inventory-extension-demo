/**
 * Tests for RegenerateWorkOrdersModal component (T6.3.3)
 * 
 * Modal to confirm regeneration of scheduled work orders when rule changes
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { RegenerateWorkOrdersModal } from '../../../components/maintenance/RegenerateWorkOrdersModal';
import type { MaintenanceRule } from '../../../types/maintenance';
import type { UUID } from '../../../types/entities';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'maintenance:regenerateModal.message' && options?.count) {
        return `Changing this rule will regenerate ${options.count} scheduled work orders.`;
      }
      const keys: Record<string, string> = {
        'maintenance:regenerateModal.title': 'Regenerate Work Orders',
        'maintenance:regenerateModal.cancel': 'Cancel',
        'maintenance:regenerateModal.confirm': 'Regenerate',
        'maintenance:regenerateModal.warning': 'This will delete existing scheduled work orders and create new ones based on the updated schedule.',
      };
      return keys[key] || key;
    },
  }),
}));

// Sample rule for testing
const mockRule: MaintenanceRule = {
  id: 'rule-1' as UUID,
  name: 'Monthly Inspection',
  isInternal: true,
  workType: 'inspection',
  targets: [{ type: 'asset', ids: ['asset-1' as UUID] }],
  intervalType: 'months',
  intervalValue: 1,
  startDate: '2025-01-01',
  nextDueDate: '2025-02-01',
  leadTimeDays: 7,
  rescheduleMode: 'actual-completion',
  createdBy: 'user-1' as UUID,
  createdByName: 'Test User',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('RegenerateWorkOrdersModal Component', () => {
  const renderModal = (props: Partial<{
    opened: boolean;
    rule: MaintenanceRule;
    affectedCount: number;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
  }> = {}) => {
    const defaultProps = {
      opened: true,
      rule: mockRule,
      affectedCount: 60,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      isLoading: false,
      ...props,
    };
    
    return render(
      <MantineProvider>
        <RegenerateWorkOrdersModal {...defaultProps} />
      </MantineProvider>
    );
  };

  it('should render the modal when opened', () => {
    renderModal();
    
    expect(screen.getByText('Regenerate Work Orders')).toBeInTheDocument();
  });

  it('should show the affected count in the message (T6.3.3)', () => {
    renderModal({ affectedCount: 60 });
    
    expect(screen.getByText(/60 scheduled work orders/i)).toBeInTheDocument();
  });

  it('should show warning message about deletion', () => {
    renderModal();
    
    expect(screen.getByText(/delete existing scheduled work orders/i)).toBeInTheDocument();
  });

  it('should call onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderModal({ onCancel });
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when Regenerate button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderModal({ onConfirm });
    
    const confirmButton = screen.getByRole('button', { name: /regenerate/i });
    await user.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when loading', () => {
    renderModal({ isLoading: true });
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /regenerate/i });
    
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('should show loading indicator on confirm button when loading', () => {
    renderModal({ isLoading: true });
    
    const confirmButton = screen.getByRole('button', { name: /regenerate/i });
    // Mantine shows loading state on the button
    expect(confirmButton).toHaveAttribute('data-loading');
  });

  it('should not render when opened is false', () => {
    renderModal({ opened: false });
    
    expect(screen.queryByText('Regenerate Work Orders')).not.toBeInTheDocument();
  });

  it('should show rule name in the modal', () => {
    renderModal();
    
    expect(screen.getByText(/Monthly Inspection/i)).toBeInTheDocument();
  });
});
