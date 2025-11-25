import { ActionIcon, Tooltip } from '@mantine/core';
import { IconRotateClockwise } from '@tabler/icons-react';

interface UndoButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;
  /** Whether undo operation is in progress */
  loading?: boolean;
  /** Whether button should be disabled */
  disabled?: boolean;
  /** Tooltip text to display on hover */
  tooltip?: string;
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * UndoButton Component
 * 
 * A simple action icon button to trigger undo of the most recent action.
 * Typically used inline next to save/submit buttons or in notification toasts.
 * 
 * @example
 * ```tsx
 * <UndoButton
 *   onClick={handleUndoLastAction}
 *   tooltip="Undo last change"
 *   loading={isUndoing}
 * />
 * ```
 */
export function UndoButton({
  onClick,
  loading = false,
  disabled = false,
  tooltip = 'Undo',
  size = 'md',
}: UndoButtonProps) {
  return (
    <Tooltip label={tooltip} position="bottom">
      <ActionIcon
        variant="subtle"
        color="gray"
        size={size}
        onClick={onClick}
        loading={loading}
        disabled={disabled || loading}
        aria-label={tooltip}
      >
        <IconRotateClockwise size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
      </ActionIcon>
    </Tooltip>
  );
}
