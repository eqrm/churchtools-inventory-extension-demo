/**
 * Tag Propagation Confirmation Component
 * 
 * Modal dialog that asks whether to propagate tag changes to related entities
 * (e.g., from kit to sub-assets, or from model to created assets).
 */

import { Modal, Text, Stack, Group, Button, Progress, Alert } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface TagPropagationConfirmationProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when user confirms propagation */
  onConfirm: () => void;
  /** Callback when user skips propagation */
  onSkip: () => void;
  /** Type of entity being updated */
  entityType: 'kit' | 'model';
  /** Number of related entities that will be affected */
  affectedCount: number;
  /** Whether propagation is in progress */
  isLoading?: boolean;
  /** Current progress (for showing during propagation) */
  progress?: {
    current: number;
    total: number;
  };
  /** Error message if propagation failed */
  error?: string;
}

export function TagPropagationConfirmation({
  opened,
  onClose,
  onConfirm,
  onSkip,
  entityType,
  affectedCount,
  isLoading = false,
  progress,
  error,
}: TagPropagationConfirmationProps) {
  const { t } = useTranslation(['tags', 'common']);

  const entityTypeLabel = entityType === 'kit' ? t('tags:kit') : t('tags:model');
  const targetTypeLabel = entityType === 'kit' ? t('tags:subAssets') : t('tags:assets');

  return (
    <Modal
      opened={opened}
      onClose={isLoading ? () => {} : onClose}
      title={t('tags:tagPropagation.title')}
      centered
      closeOnClickOutside={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Stack gap="md">
        {/* Main message */}
        {!isLoading && !progress && (
          <Text size="sm">
            {t('tags:tagPropagation.message', {
              count: affectedCount,
              entityType: entityTypeLabel,
              targetType: targetTypeLabel,
            })}
          </Text>
        )}

        {/* Progress indicator */}
        {isLoading && progress && (
          <Stack gap="xs">
            <Text size="sm">
              {t('tags:tagPropagation.updatingAssets', {
                current: progress.current,
                total: progress.total,
              })}
            </Text>
            <Progress
              value={(progress.current / progress.total) * 100}
              animated
              striped
              color="blue"
            />
          </Stack>
        )}

        {/* Error alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title={t('common:error')} color="red">
            {error}
          </Alert>
        )}

        {/* Informational note */}
        {!isLoading && !progress && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text size="xs">
              {t('tags:tagPropagation.note', {
                targetType: targetTypeLabel,
              })}
            </Text>
          </Alert>
        )}

        {/* Action buttons */}
        <Group justify="flex-end" gap="sm">
          {!isLoading && !progress && (
            <>
              <Button
                variant="subtle"
                color="gray"
                onClick={onSkip}
                leftSection={<IconX size={16} />}
              >
                {t('tags:tagPropagation.skipUpdate')}
              </Button>
              <Button
                onClick={onConfirm}
                leftSection={<IconCheck size={16} />}
              >
                {t('tags:tagPropagation.applyToAll')}
              </Button>
            </>
          )}

          {(isLoading || progress) && (
            <Button variant="subtle" disabled>
              {t('common:processing')}
            </Button>
          )}

          {error && (
            <Button onClick={onClose}>
              {t('common:close')}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Simple confirmation variant for quick yes/no decisions
 */
interface SimpleTagPropagationConfirmProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  affectedCount: number;
  entityType: 'kit' | 'model';
}

export function SimpleTagPropagationConfirm({
  opened,
  onClose,
  onConfirm,
  affectedCount,
  entityType,
}: SimpleTagPropagationConfirmProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <TagPropagationConfirmation
      opened={opened}
      onClose={onClose}
      onConfirm={handleConfirm}
      onSkip={onClose}
      entityType={entityType}
      affectedCount={affectedCount}
    />
  );
}
