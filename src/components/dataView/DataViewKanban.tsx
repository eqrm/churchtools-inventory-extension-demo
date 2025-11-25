import type { ReactNode } from 'react';
import { Card, Group, ScrollArea, Stack, Text } from '@mantine/core';
import type { ViewRecord } from './types';

export interface DataViewKanbanColumn<TRecord extends ViewRecord> {
    key: string;
    title: string;
    records: TRecord[];
}

export interface DataViewKanbanProps<TRecord extends ViewRecord> {
    columns: DataViewKanbanColumn<TRecord>[];
    emptyState?: ReactNode;
    renderCard?: (record: TRecord) => ReactNode;
}

export function DataViewKanban<TRecord extends ViewRecord>({
    columns,
    emptyState,
    renderCard,
}: DataViewKanbanProps<TRecord>) {
    const hasRecords = columns.some((column) => column.records.length > 0);

    if (!hasRecords) {
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
        <ScrollArea offsetScrollbars>
            <Group align="flex-start" gap="md" wrap="nowrap">
                {columns.map((column) => (
                    <Card key={column.key} withBorder w={300} miw={260} p="sm">
                        <Stack gap="sm">
                            <Text fw={600}>{column.title}</Text>
                            <Stack gap="sm">
                                {column.records.map((record) => (
                                    <Card key={record.id} withBorder shadow="xs">
                                        {renderCard ? (
                                            renderCard(record)
                                        ) : (
                                            <Stack gap="xs">
                                                <Text fw={500}>{record.title}</Text>
                                                {record.subtitle && (
                                                    <Text size="sm" c="dimmed">
                                                        {record.subtitle}
                                                    </Text>
                                                )}
                                                {record.description && (
                                                    <Text size="sm">{record.description}</Text>
                                                )}
                                            </Stack>
                                        )}
                                    </Card>
                                ))}
                            </Stack>
                        </Stack>
                    </Card>
                ))}
            </Group>
        </ScrollArea>
    );
}
