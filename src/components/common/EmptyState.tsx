import { Center, Stack, Text } from '@mantine/core';
import { IconMoodEmpty } from '@tabler/icons-react';

interface EmptyStateProps {
    title?: string;
    message: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

/**
 * Empty State Component
 * Shows an empty state with icon and message
 */
export function EmptyState({
    title = 'No data',
    message,
    icon = <IconMoodEmpty size={48} stroke={1.5} />,
    action,
}: EmptyStateProps) {
    return (
        <Center h="100%" w="100%" p="xl">
            <Stack align="center" gap="md">
                {icon}
                <Stack align="center" gap="xs">
                    <Text fw={600} size="lg">{title}</Text>
                    <Text c="dimmed" ta="center">{message}</Text>
                </Stack>
                {action}
            </Stack>
        </Center>
    );
}
