import type { ReactNode } from 'react';
import { Card, SimpleGrid, Stack, Text } from '@mantine/core';
import type { ViewRecord } from './types';

export interface DataViewGalleryProps<TRecord extends ViewRecord> {
    records: TRecord[];
    emptyState?: ReactNode;
    renderItem?: (record: TRecord) => ReactNode;
}

export function DataViewGallery<TRecord extends ViewRecord>({
    records,
    emptyState,
    renderItem,
}: DataViewGalleryProps<TRecord>) {
    if (records.length === 0) {
        return (
            emptyState ?? (
                <Card withBorder>
                    <Text c="dimmed" ta="center">
                        No records available
                    </Text>
                </Card>
            )
        );
    }

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {records.map((record) => (
                <Card key={record.id} withBorder>
                    {renderItem ? (
                        renderItem(record)
                    ) : (
                        <Stack gap="xs">
                            <Text fw={600}>{record.title}</Text>
                            {record.subtitle && (
                                <Text size="sm" c="dimmed">
                                    {record.subtitle}
                                </Text>
                            )}
                            {record.description && <Text size="sm">{record.description}</Text>}
                        </Stack>
                    )}
                </Card>
            ))}
        </SimpleGrid>
    );
}
