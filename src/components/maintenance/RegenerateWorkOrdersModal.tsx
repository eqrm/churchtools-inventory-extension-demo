/**
 * RegenerateWorkOrdersModal Component (T6.3.3)
 * 
 * Confirmation modal shown before regenerating scheduled work orders
 * when a maintenance rule's schedule is changed.
 */

import { useTranslation } from 'react-i18next';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Alert,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { MaintenanceRule } from '../../types/maintenance';

export interface RegenerateWorkOrdersModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** The maintenance rule being modified */
  rule: MaintenanceRule;
  /** Number of scheduled work orders that will be affected */
  affectedCount: number;
  /** Callback when user confirms regeneration */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether regeneration is in progress */
  isLoading?: boolean;
}

/**
 * Modal to confirm regeneration of scheduled work orders when a rule's schedule changes.
 * Shows the number of affected work orders and warns about deletion of existing ones.
 */
export function RegenerateWorkOrdersModal({
  opened,
  rule,
  affectedCount,
  onConfirm,
  onCancel,
  isLoading = false,
}: RegenerateWorkOrdersModalProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={t('maintenance:regenerateModal.title')}
      size="md"
      centered
    >
      <Stack gap="md">
        <Text>
          {t('maintenance:regenerateModal.message', { count: affectedCount })}
        </Text>

        <Alert
          icon={<IconAlertTriangle size={20} />}
          color="yellow"
          variant="light"
        >
          <Text size="sm">
            {t('maintenance:regenerateModal.warning')}
          </Text>
        </Alert>

        <Text size="sm" c="dimmed">
          {t('maintenance:fields.ruleName')}: <strong>{rule.name}</strong>
        </Text>

        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={onCancel}
            disabled={isLoading}
          >
            {t('maintenance:regenerateModal.cancel')}
          </Button>
          <Button
            color="red"
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
          >
            {t('maintenance:regenerateModal.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
