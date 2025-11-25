import { Stack, Text } from '@mantine/core';

interface PlaceholderPageProps {
    title?: string;
    description?: string;
}

/**
 * Lightweight placeholder component for planned routes that are not yet implemented.
 * Keeps the router structure aligned with the specification without breaking builds.
 */
export function PlaceholderPage({
    title = 'Feature coming soon',
    description = 'This route has been defined but the implementation is tracked in later tasks.',
}: PlaceholderPageProps) {
    return (
        <Stack gap="xs">
            <Text fw={600}>{title}</Text>
            <Text c="dimmed" size="sm">
                {description}
            </Text>
        </Stack>
    );
}
