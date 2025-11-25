import { Button, Group, Modal, Text } from '@mantine/core';

interface ConfirmDialogProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: string;
    loading?: boolean;
}

/**
 * Confirm Dialog Component
 * Reusable confirmation dialog
 */
export function ConfirmDialog({
    opened,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmColor = 'blue',
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={title}
            centered
        >
            <Text size="sm" mb="md">{message}</Text>
            <Group justify="flex-end" gap="sm">
                <Button
                    variant="subtle"
                    onClick={onClose}
                    disabled={loading}
                >
                    {cancelLabel}
                </Button>
                <Button
                    color={confirmColor}
                    onClick={onConfirm}
                    loading={loading}
                >
                    {confirmLabel}
                </Button>
            </Group>
        </Modal>
    );
}
