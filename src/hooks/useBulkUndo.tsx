/**
 * T8.3.2 - useBulkUndo Hook
 *
 * Provides integration between bulk operations and the undo system.
 * Shows undo toast notifications with clickable undo action.
 */

import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { IconArrowBack, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useUpdateAsset } from './useAssets';
import {
  getBulkUndoService,
  executeBulkUndo,
  type BulkUndoActionType,
  type AffectedAsset,
  type BulkUndoResult,
} from '../services/BulkUndoService';

/**
 * Duration in milliseconds before undo toast auto-closes
 */
const UNDO_TOAST_DURATION = 10000; // 10 seconds

export interface UseBulkUndoReturn {
  /**
   * Register a bulk operation for potential undo and show notification
   */
  registerBulkAction: (
    type: BulkUndoActionType,
    description: string,
    affectedAssets: AffectedAsset[],
  ) => string;

  /**
   * Execute undo for a specific action
   */
  undoAction: (actionId: string) => Promise<BulkUndoResult>;
}

/**
 * Hook for managing bulk undo operations with toast notifications
 *
 * Usage:
 * ```tsx
 * const { registerBulkAction, undoAction } = useBulkUndo();
 *
 * // After bulk status change
 * const previousValues = assets.map(a => ({ assetId: a.id, previousValue: { status: a.status } }));
 * registerBulkAction('status', 'Changed status to available', previousValues);
 * ```
 */
export function useBulkUndo(): UseBulkUndoReturn {
  const { t } = useTranslation(['assets', 'common']);
  const updateAsset = useUpdateAsset();
  const service = getBulkUndoService();

  /**
   * Execute the undo by updating each affected asset
   */
  const executeUndo = useCallback(
    async (actionId: string): Promise<BulkUndoResult> => {
      const result = await executeBulkUndo(service, actionId, async (assetId, previousValue) => {
        await updateAsset.mutateAsync({
          id: assetId,
          data: previousValue,
        });
      });

      // Hide the original undo notification
      notifications.hide(`bulk-undo-${actionId}`);

      // Show result notification
      if (result.success) {
        notifications.show({
          id: `bulk-undo-success-${actionId}`,
          title: t('assets:bulkActions.undoSuccess'),
          message: t('assets:bulkActions.undoSuccessMessage', {
            count: result.successCount,
          }),
          color: 'green',
          icon: <IconCheck size={18} />,
          autoClose: 5000,
        });
      } else if (result.successCount > 0) {
        // Partial success
        notifications.show({
          id: `bulk-undo-partial-${actionId}`,
          title: t('assets:bulkActions.undoPartialSuccess'),
          message: t('assets:bulkActions.undoPartialMessage', {
            success: result.successCount,
            failed: result.failureCount,
          }),
          color: 'yellow',
          icon: <IconAlertCircle size={18} />,
          autoClose: 8000,
        });
      } else {
        // Complete failure
        notifications.show({
          id: `bulk-undo-failed-${actionId}`,
          title: t('assets:bulkActions.undoFailed'),
          message: result.error || t('assets:bulkActions.undoFailedMessage'),
          color: 'red',
          icon: <IconAlertCircle size={18} />,
          autoClose: 8000,
        });
      }

      return result;
    },
    [service, updateAsset, t],
  );

  /**
   * Register a bulk action and show undo notification
   */
  const registerBulkAction = useCallback(
    (type: BulkUndoActionType, description: string, affectedAssets: AffectedAsset[]): string => {
      // Register with the service
      const actionId = service.registerBulkUndo({
        type,
        description,
        affectedAssets,
      });

      // Show undo toast notification (T8.3.2)
      notifications.show({
        id: `bulk-undo-${actionId}`,
        title: description,
        message: t('assets:bulkActions.clickToUndo'),
        color: 'blue',
        icon: <IconArrowBack size={18} />,
        autoClose: UNDO_TOAST_DURATION,
        withCloseButton: true,
        onClick: () => {
          executeUndo(actionId);
        },
        styles: {
          root: {
            cursor: 'pointer',
          },
        },
      });

      // Set up auto-cleanup after timeout
      setTimeout(() => {
        service.removeAction(actionId);
      }, UNDO_TOAST_DURATION + 1000); // Add 1s buffer

      return actionId;
    },
    [service, t, executeUndo],
  );

  return {
    registerBulkAction,
    undoAction: executeUndo,
  };
}
