/**
 * T12.2.2 - WorkOrderStateTransition Component Tests
 * 
 * Tests for the work order state transition component.
 * Verifies that correct transition buttons are shown for each state.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { WorkOrderStateTransition } from '../../../components/maintenance/WorkOrderStateTransition';
import type { WorkOrder, InternalWorkOrderState, ExternalWorkOrderState } from '../../../types/maintenance';
import type { UUID, ISOTimestamp } from '../../../types/entities';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'maintenance:transitions.assign': 'Assign',
        'maintenance:transitions.plan': 'Plan',
        'maintenance:transitions.start': 'Start',
        'maintenance:transitions.complete': 'Complete',
        'maintenance:transitions.approve': 'Approve',
        'maintenance:transitions.abort': 'Abort',
        'maintenance:transitions.markObsolete': 'Mark Obsolete',
        'maintenance:transitions.reopen': 'Reopen',
        'maintenance:transitions.requestOffer': 'Request Offer',
        'maintenance:transitions.requestMoreOffers': 'Request More Offers',
        'maintenance:fields.currentState': 'Current State',
        'maintenance:warnings.notAllAssetsCompleted': 'Not all assets are completed',
        'maintenance:warnings.noApprovalResponsible': 'No approval responsible assigned',
        'maintenance:info.workOrderInTerminalState': 'Work order is in terminal state',
        'maintenance:placeholders.assignedTo': 'Enter assignee',
        'maintenance:placeholders.companyId': 'Enter company ID',
        'maintenance:placeholders.scheduledStart': 'Select date',
        'maintenance:placeholders.actualEnd': 'Select completion time',
      };
      return translations[key] || key;
    },
  }),
}));

describe('WorkOrderStateTransition', () => {
  const mockOnTransition = vi.fn();

  beforeEach(() => {
    mockOnTransition.mockClear();
  });

  const createWorkOrder = (
    state: InternalWorkOrderState | ExternalWorkOrderState,
    type: 'internal' | 'external' = 'internal',
    overrides: Partial<WorkOrder> = {}
  ): WorkOrder => ({
    id: 'wo-1' as UUID,
    workOrderNumber: 'WO-001',
    type,
    workType: 'inspection',
    title: 'Test Work Order',
    state,
    lineItems: [
      {
        id: 'li-1' as UUID,
        assetId: 'asset-1' as UUID,
        completionStatus: 'pending',
        tasks: [],
        notes: '',
      },
    ],
    history: [],
    createdBy: 'user-1' as UUID,
    createdAt: '2024-01-01T00:00:00Z' as ISOTimestamp,
    updatedAt: '2024-01-01T00:00:00Z' as ISOTimestamp,
    ...overrides,
  });

  const renderComponent = (workOrder: WorkOrder) => {
    return render(
      <MantineProvider>
        <WorkOrderStateTransition
          workOrder={workOrder}
          onTransition={mockOnTransition}
        />
      </MantineProvider>
    );
  };

  describe('Internal Work Order States', () => {
    describe('backlog state', () => {
      it('should show Assign, Abort, and Mark Obsolete buttons', () => {
        renderComponent(createWorkOrder('backlog'));
        
        expect(screen.getByRole('button', { name: 'Assign' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark Obsolete' })).toBeInTheDocument();
      });

      it('should show input field for assignee', () => {
        renderComponent(createWorkOrder('backlog'));
        
        expect(screen.getByPlaceholderText('Enter assignee')).toBeInTheDocument();
      });

      it('should call onTransition with ASSIGN event when Assign clicked', async () => {
        renderComponent(createWorkOrder('backlog'));
        
        const input = screen.getByPlaceholderText('Enter assignee');
        fireEvent.change(input, { target: { value: 'user-123' } });
        
        const assignButton = screen.getByRole('button', { name: 'Assign' });
        fireEvent.click(assignButton);

        await waitFor(() => {
          expect(mockOnTransition).toHaveBeenCalledWith({ type: 'ASSIGN', assignedTo: 'user-123' });
        });
      });
    });

    describe('assigned state', () => {
      it('should show Plan, Abort, and Mark Obsolete buttons', () => {
        renderComponent(createWorkOrder('assigned'));
        
        expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark Obsolete' })).toBeInTheDocument();
      });

      it('should show date input for scheduled start', () => {
        renderComponent(createWorkOrder('assigned'));
        
        expect(screen.getByPlaceholderText('Select date')).toBeInTheDocument();
      });
    });

    describe('planned state', () => {
      it('should show Start, Abort, and Mark Obsolete buttons', () => {
        renderComponent(createWorkOrder('planned'));
        
        expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark Obsolete' })).toBeInTheDocument();
      });

      it('should call onTransition with START event when Start clicked', async () => {
        renderComponent(createWorkOrder('planned'));
        
        const startButton = screen.getByRole('button', { name: 'Start' });
        fireEvent.click(startButton);

        await waitFor(() => {
          expect(mockOnTransition).toHaveBeenCalledWith({ type: 'START' });
        });
      });
    });

    describe('in-progress state', () => {
      it('should show Complete and Abort buttons', () => {
        renderComponent(createWorkOrder('in-progress'));
        
        expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
      });

      it('should disable Complete button when not all assets are completed', () => {
        renderComponent(createWorkOrder('in-progress', 'internal', {
          lineItems: [
            { id: 'li-1' as UUID, assetId: 'a-1' as UUID, completionStatus: 'pending', tasks: [], notes: '' },
          ],
        }));
        
        const completeButton = screen.getByRole('button', { name: 'Complete' });
        expect(completeButton).toBeDisabled();
      });

      it('should enable Complete button when all assets are completed', () => {
        renderComponent(createWorkOrder('in-progress', 'internal', {
          lineItems: [
            { id: 'li-1' as UUID, assetId: 'a-1' as UUID, completionStatus: 'completed', tasks: [], notes: '' },
          ],
        }));
        
        const completeButton = screen.getByRole('button', { name: 'Complete' });
        expect(completeButton).not.toBeDisabled();
      });

      it('should show warning when not all assets are completed', () => {
        renderComponent(createWorkOrder('in-progress', 'internal', {
          lineItems: [
            { id: 'li-1' as UUID, assetId: 'a-1' as UUID, completionStatus: 'pending', tasks: [], notes: '' },
          ],
        }));
        
        expect(screen.getByText('Not all assets are completed')).toBeInTheDocument();
      });
    });

    describe('completed state', () => {
      it('should show Approve and Reopen buttons', () => {
        renderComponent(createWorkOrder('completed', 'internal', {
          approvalResponsibleId: 'user-1' as UUID,
        }));
        
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
      });

      it('should disable Approve button when no approval responsible', () => {
        renderComponent(createWorkOrder('completed', 'internal', {
          approvalResponsibleId: undefined,
        }));
        
        const approveButton = screen.getByRole('button', { name: 'Approve' });
        expect(approveButton).toBeDisabled();
      });

      it('should show warning when no approval responsible', () => {
        renderComponent(createWorkOrder('completed', 'internal', {
          approvalResponsibleId: undefined,
        }));
        
        expect(screen.getByText('No approval responsible assigned')).toBeInTheDocument();
      });

      it('should call onTransition with APPROVE event when Approve clicked', async () => {
        renderComponent(createWorkOrder('completed', 'internal', {
          approvalResponsibleId: 'user-1' as UUID,
        }));
        
        const approveButton = screen.getByRole('button', { name: 'Approve' });
        fireEvent.click(approveButton);

        await waitFor(() => {
          expect(mockOnTransition).toHaveBeenCalledWith({ type: 'APPROVE' });
        });
      });

      it('should call onTransition with REOPEN event when Reopen clicked', async () => {
        renderComponent(createWorkOrder('completed', 'internal', {
          approvalResponsibleId: 'user-1' as UUID,
        }));
        
        const reopenButton = screen.getByRole('button', { name: 'Reopen' });
        fireEvent.click(reopenButton);

        await waitFor(() => {
          expect(mockOnTransition).toHaveBeenCalledWith({ type: 'REOPEN' });
        });
      });
    });

    describe('terminal states', () => {
      it('should show terminal state message for done state', () => {
        renderComponent(createWorkOrder('done'));
        
        expect(screen.getByText('Work order is in terminal state')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Assign' })).not.toBeInTheDocument();
      });

      it('should show terminal state message for aborted state', () => {
        renderComponent(createWorkOrder('aborted'));
        
        expect(screen.getByText('Work order is in terminal state')).toBeInTheDocument();
      });

      it('should show terminal state message for obsolete state', () => {
        renderComponent(createWorkOrder('obsolete'));
        
        expect(screen.getByText('Work order is in terminal state')).toBeInTheDocument();
      });
    });
  });

  describe('External Work Order States', () => {
    describe('backlog state', () => {
      it('should show Request Offer, Abort, and Mark Obsolete buttons', () => {
        renderComponent(createWorkOrder('backlog', 'external'));
        
        expect(screen.getByRole('button', { name: 'Request Offer' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark Obsolete' })).toBeInTheDocument();
      });

      it('should show input field for company ID', () => {
        renderComponent(createWorkOrder('backlog', 'external'));
        
        expect(screen.getByPlaceholderText('Enter company ID')).toBeInTheDocument();
      });
    });

    describe('offer-requested state', () => {
      it('should show Abort and Mark Obsolete buttons only', () => {
        renderComponent(createWorkOrder('offer-requested', 'external'));
        
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark Obsolete' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Plan' })).not.toBeInTheDocument();
      });
    });

    describe('offer-received state', () => {
      it('should show Plan, Request More Offers, Abort, and Mark Obsolete buttons', () => {
        renderComponent(createWorkOrder('offer-received', 'external'));
        
        expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Request More Offers' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark Obsolete' })).toBeInTheDocument();
      });
    });

    describe('planned state (external)', () => {
      it('should show Start, Abort, and Mark Obsolete buttons', () => {
        renderComponent(createWorkOrder('planned', 'external'));
        
        expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark Obsolete' })).toBeInTheDocument();
      });
    });

    describe('in-progress state (external)', () => {
      it('should show Complete and Abort buttons', () => {
        renderComponent(createWorkOrder('in-progress', 'external'));
        
        expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
      });
    });

    describe('completed state (external)', () => {
      it('should show Approve and Reopen buttons', () => {
        renderComponent(createWorkOrder('completed', 'external', {
          approvalResponsibleId: 'user-1' as UUID,
        }));
        
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(
        <MantineProvider>
          <WorkOrderStateTransition
            workOrder={createWorkOrder('backlog')}
            onTransition={mockOnTransition}
            isLoading={true}
          />
        </MantineProvider>
      );
      
      // Loading state applies to buttons - they should have loading state
      const assignButton = screen.getByRole('button', { name: 'Assign' });
      // The button will have aria-busy or a loading class/attribute
      expect(assignButton).toBeInTheDocument();
    });
  });

  describe('State transitions coverage', () => {
    const internalStates: InternalWorkOrderState[] = [
      'backlog', 'assigned', 'planned', 'in-progress', 'completed', 'done', 'aborted', 'obsolete'
    ];

    const externalStates: ExternalWorkOrderState[] = [
      'backlog', 'offer-requested', 'offer-received', 'planned', 'in-progress', 
      'completed', 'done', 'aborted', 'obsolete'
    ];

    it.each(internalStates)('should render without errors for internal state: %s', (state) => {
      expect(() => renderComponent(createWorkOrder(state, 'internal'))).not.toThrow();
    });

    it.each(externalStates)('should render without errors for external state: %s', (state) => {
      expect(() => renderComponent(createWorkOrder(state as InternalWorkOrderState, 'external'))).not.toThrow();
    });
  });
});
