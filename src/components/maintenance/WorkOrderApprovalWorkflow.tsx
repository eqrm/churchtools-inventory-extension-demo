/**
 * Work Order Approval Workflow Component (T164)
 * 
 * Manages approval workflow: assign approvalResponsible and show approval UI.
 */

import { Stack, Group, Text, Button, Alert, Badge, Select } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { WorkOrder } from '../../types/maintenance';
import type { UUID } from '../../types/entities';

interface Person {
  id: UUID;
  name: string;
}

interface WorkOrderApprovalWorkflowProps {
  workOrder: WorkOrder;
  availableApprovers: Person[];
  currentUserId?: UUID;
  onAssignApprover: (approverId: UUID) => void;
  onApprove: () => void;
  isLoading?: boolean;
}

export function WorkOrderApprovalWorkflow({
  workOrder,
  availableApprovers,
  currentUserId,
  onAssignApprover,
  onApprove,
  isLoading = false,
}: WorkOrderApprovalWorkflowProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  const canApprove =
    workOrder.state === 'completed' &&
    workOrder.approvalResponsibleId === currentUserId &&
    workOrder.lineItems.every((item) => item.completionStatus === 'completed');

  const allAssetsCompleted = workOrder.lineItems.every(
    (item) => item.completionStatus === 'completed'
  );

  const getApproverName = () => {
    const approver = availableApprovers.find((p) => p.id === workOrder.approvalResponsibleId);
    return approver?.name || t('maintenance:unknown');
  };

  // Not yet completed - show assignment only
  if (workOrder.state !== 'completed') {
    return (
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            {t('maintenance:fields.approvalResponsible')}
          </Text>
          {workOrder.approvalResponsibleId && (
            <Badge color="blue" leftSection={<IconUser size={14} />}>
              {getApproverName()}
            </Badge>
          )}
        </Group>

        {!workOrder.approvalResponsibleId && (
          <Select
            placeholder={t('maintenance:placeholders.approvalResponsible')}
            data={availableApprovers.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(value) => value && onAssignApprover(value)}
            disabled={isLoading}
          />
        )}

        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          {t('maintenance:info.approvalWorkflowInfo')}
        </Alert>
      </Stack>
    );
  }

  // Completed - show approval UI
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {t('maintenance:fields.approvalResponsible')}
        </Text>
        {workOrder.approvalResponsibleId && (
          <Badge color="green" leftSection={<IconUser size={14} />}>
            {getApproverName()}
          </Badge>
        )}
      </Group>

      {!allAssetsCompleted && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange">
          {t('maintenance:warnings.notAllAssetsCompleted')}
        </Alert>
      )}

      {!workOrder.approvalResponsibleId && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {t('maintenance:warnings.noApprovalResponsible')}
        </Alert>
      )}

      {canApprove && (
        <Button
          leftSection={<IconCheck size={16} />}
          color="green"
          onClick={onApprove}
          loading={isLoading}
          fullWidth
        >
          {t('maintenance:actions.approve')}
        </Button>
      )}

      {workOrder.approvalResponsibleId &&
        workOrder.approvalResponsibleId !== currentUserId && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            {t('maintenance:info.waitingForApproval', { approver: getApproverName() })}
          </Alert>
        )}
    </Stack>
  );
}
