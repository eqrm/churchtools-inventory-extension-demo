import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

/**
 * Error State Component
 * Shows an error message with optional retry button
 */
export function ErrorState({ 
    title,
    message,
    onRetry,
}: ErrorStateProps) {
    const { t } = useTranslation('common');
    const resolvedTitle = title ?? t('app.error');
    return (
        <Stack gap="md" p="md">
            <Alert
                icon={<IconAlertCircle size={16} />}
                title={resolvedTitle}
                color="red"
                variant="light"
            >
                <Text size="sm">{message}</Text>
            </Alert>
            {onRetry && (
                <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={onRetry}
                    variant="light"
                >
                    {t('actions.retry')}
                </Button>
            )}
        </Stack>
    );
}
