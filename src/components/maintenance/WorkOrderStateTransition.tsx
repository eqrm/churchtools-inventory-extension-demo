/**
 * Work Order State Transition Component (T148)
 * 
 * Shows allowed next states with validation errors and transition buttons.
 */

import { useState } from 'react';
import { Button, Group, Stack, Text, Alert, TextInput } from '@mantine/core';
import { DateInput, DateTimePicker } from '@mantine/dates';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type {
  WorkOrder,
  InternalWorkOrderState,
  ExternalWorkOrderState,
} from '../../types/maintenance';
import type { InternalWorkOrderEvent } from '../../services/machines/InternalWorkOrderMachine';
import type { ExternalWorkOrderEvent } from '../../services/machines/ExternalWorkOrderMachine';

interface WorkOrderStateTransitionProps {
  workOrder: WorkOrder;
  onTransition: (event: InternalWorkOrderEvent | ExternalWorkOrderEvent) => Promise<void>;
  isLoading?: boolean;
}

interface TransitionOption {
  event: InternalWorkOrderEvent | ExternalWorkOrderEvent;
  label: string;
  color: string;
  requiresInput?: 'assignedTo' | 'scheduledStart' | 'actualEnd' | 'companyId' | 'approvalResponsible';
}

export function WorkOrderStateTransition({
  workOrder,
  onTransition,
  isLoading = false,
}: WorkOrderStateTransitionProps) {
  const { t } = useTranslation(['maintenance', 'common']);
  const [inputValue, setInputValue] = useState('');
  const [dateValue, setDateValue] = useState<Date | null>(null);

  const getAvailableTransitions = (): TransitionOption[] => {
    const { state, type } = workOrder;

    // Internal work order transitions
    if (type === 'internal') {
      switch (state as InternalWorkOrderState) {
        case 'backlog':
          return [
            {
              event: { type: 'ASSIGN', assignedTo: '' },
              label: t('maintenance:transitions.assign'),
              color: 'blue',
              requiresInput: 'assignedTo',
            },
            {
              event: { type: 'ABORT' },
              label: t('maintenance:transitions.abort'),
              color: 'red',
            },
            {
              event: { type: 'MARK_OBSOLETE' },
              label: t('maintenance:transitions.markObsolete'),
              color: 'gray',
            },
          ];
        case 'assigned':
          return [
            {
              event: { type: 'PLAN', scheduledStart: '' },
              label: t('maintenance:transitions.plan'),
              color: 'cyan',
              requiresInput: 'scheduledStart',
            },
            {
              event: { type: 'ABORT' },
              label: t('maintenance:transitions.abort'),
              color: 'red',
            },
            {
              event: { type: 'MARK_OBSOLETE' },
              label: t('maintenance:transitions.markObsolete'),
              color: 'gray',
            },
          ];
        case 'planned':
          return [
            {
              event: { type: 'START' },
              label: t('maintenance:transitions.start'),
              color: 'green',
            },
            {
              event: { type: 'ABORT' },
              label: t('maintenance:transitions.abort'),
              color: 'red',
            },
            {
              event: { type: 'MARK_OBSOLETE' },
              label: t('maintenance:transitions.markObsolete'),
              color: 'gray',
            },
          ];
        case 'in-progress':
          return [
            {
              event: { type: 'COMPLETE', actualEnd: '' },
              label: t('maintenance:transitions.complete'),
              color: 'green',
              requiresInput: 'actualEnd',
            },
            {
              event: { type: 'ABORT' },
              label: t('maintenance:transitions.abort'),
              color: 'red',
            },
          ];
        case 'completed':
          return [
            {
              event: { type: 'APPROVE' },
              label: t('maintenance:transitions.approve'),
              color: 'green',
            },
            {
              event: { type: 'REOPEN' },
              label: t('maintenance:transitions.reopen'),
              color: 'orange',
            },
          ];
        default:
          return [];
      }
    }

    // External work order transitions
    switch (state as ExternalWorkOrderState) {
      case 'backlog':
        return [
          {
            event: { type: 'REQUEST_OFFER', companyId: '' },
            label: t('maintenance:transitions.requestOffer'),
            color: 'blue',
            requiresInput: 'companyId',
          },
          {
            event: { type: 'ABORT' },
            label: t('maintenance:transitions.abort'),
            color: 'red',
          },
          {
            event: { type: 'MARK_OBSOLETE' },
            label: t('maintenance:transitions.markObsolete'),
            color: 'gray',
          },
        ];
      case 'offer-requested':
        return [
          {
            event: { type: 'ABORT' },
            label: t('maintenance:transitions.abort'),
            color: 'red',
          },
          {
            event: { type: 'MARK_OBSOLETE' },
            label: t('maintenance:transitions.markObsolete'),
            color: 'gray',
          },
        ];
      case 'offer-received':
        return [
          {
            event: { type: 'PLAN', scheduledStart: '' },
            label: t('maintenance:transitions.plan'),
            color: 'cyan',
            requiresInput: 'scheduledStart',
          },
          {
            event: { type: 'REQUEST_MORE_OFFERS' },
            label: t('maintenance:transitions.requestMoreOffers'),
            color: 'blue',
          },
          {
            event: { type: 'ABORT' },
            label: t('maintenance:transitions.abort'),
            color: 'red',
          },
          {
            event: { type: 'MARK_OBSOLETE' },
            label: t('maintenance:transitions.markObsolete'),
            color: 'gray',
          },
        ];
      case 'planned':
        return [
          {
            event: { type: 'START' },
            label: t('maintenance:transitions.start'),
            color: 'green',
          },
          {
            event: { type: 'ABORT' },
            label: t('maintenance:transitions.abort'),
            color: 'red',
          },
          {
            event: { type: 'MARK_OBSOLETE' },
            label: t('maintenance:transitions.markObsolete'),
            color: 'gray',
          },
        ];
      case 'in-progress':
        return [
          {
            event: { type: 'COMPLETE', actualEnd: '' },
            label: t('maintenance:transitions.complete'),
            color: 'green',
            requiresInput: 'actualEnd',
          },
          {
            event: { type: 'ABORT' },
            label: t('maintenance:transitions.abort'),
            color: 'red',
          },
        ];
      case 'completed':
        return [
          {
            event: { type: 'APPROVE' },
            label: t('maintenance:transitions.approve'),
            color: 'green',
          },
          {
            event: { type: 'REOPEN' },
            label: t('maintenance:transitions.reopen'),
            color: 'orange',
          },
        ];
      default:
        return [];
    }
  };

  const handleTransition = async (option: TransitionOption) => {
    let finalEvent: InternalWorkOrderEvent | ExternalWorkOrderEvent = option.event;

    // Add required input to event - rebuild with correct type
    if (option.requiresInput === 'assignedTo' && option.event.type === 'ASSIGN') {
      finalEvent = { type: 'ASSIGN', assignedTo: inputValue };
    } else if (option.requiresInput === 'scheduledStart' && option.event.type === 'PLAN') {
      finalEvent = { type: 'PLAN', scheduledStart: dateValue?.toISOString().split('T')[0] || '' };
    } else if (option.requiresInput === 'actualEnd' && option.event.type === 'COMPLETE') {
      finalEvent = { type: 'COMPLETE', actualEnd: dateValue?.toISOString() || '' };
    } else if (option.requiresInput === 'companyId' && option.event.type === 'REQUEST_OFFER') {
      finalEvent = { type: 'REQUEST_OFFER', companyId: inputValue };
    }

    await onTransition(finalEvent);
    setInputValue('');
    setDateValue(null);
  };

  const availableTransitions = getAvailableTransitions();

  // Check completion prerequisites
  const canComplete = workOrder.lineItems.every((item) => item.completionStatus === 'completed');
  const hasApprovalResponsible = !!workOrder.approvalResponsibleId;

  return (
    <Stack gap="md">
      <Text size="sm" fw={500}>
        {t('maintenance:fields.currentState')}: <strong>{workOrder.state}</strong>
      </Text>

      {workOrder.state === 'in-progress' && !canComplete && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange">
          {t('maintenance:warnings.notAllAssetsCompleted')}
        </Alert>
      )}

      {workOrder.state === 'completed' && !hasApprovalResponsible && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange">
          {t('maintenance:warnings.noApprovalResponsible')}
        </Alert>
      )}

      {availableTransitions.length > 0 ? (
        <Stack gap="sm">
          {availableTransitions.map((option, index) => {
            const isDisabled =
              (option.event.type === 'COMPLETE' && !canComplete) ||
              (option.event.type === 'APPROVE' && !hasApprovalResponsible);

            return (
              <Group key={index} align="flex-start">
                {option.requiresInput === 'assignedTo' && (
                  <TextInput
                    placeholder={t('maintenance:placeholders.assignedTo')}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                )}
                {option.requiresInput === 'companyId' && (
                  <TextInput
                    placeholder={t('maintenance:placeholders.companyId')}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                )}
                {option.requiresInput === 'scheduledStart' && (
                  <DateInput
                    placeholder={t('maintenance:placeholders.scheduledStart')}
                    value={dateValue}
                    onChange={setDateValue}
                    style={{ flex: 1 }}
                  />
                )}
                {option.requiresInput === 'actualEnd' && (
                  <DateTimePicker
                    placeholder={t('maintenance:placeholders.actualEnd')}
                    value={dateValue}
                    onChange={setDateValue}
                    style={{ flex: 1 }}
                    withSeconds={false}
                  />
                )}
                <Button
                  color={option.color}
                  onClick={() => handleTransition(option)}
                  loading={isLoading}
                  disabled={isDisabled}
                  leftSection={option.event.type === 'APPROVE' ? <IconCheck size={16} /> : undefined}
                >
                  {option.label}
                </Button>
              </Group>
            );
          })}
        </Stack>
      ) : (
        <Alert icon={<IconCheck size={16} />} color="green">
          {t('maintenance:info.workOrderInTerminalState')}
        </Alert>
      )}
    </Stack>
  );
}
