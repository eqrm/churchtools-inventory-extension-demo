import type { ReactNode } from 'react';
import { Card, Stack, Text } from '@mantine/core';
import type { ViewRecord } from './types';

export interface DataViewCalendarEvent<TRecord extends ViewRecord> {
    date: string;
    records: TRecord[];
}

export interface DataViewCalendarProps<TRecord extends ViewRecord> {
    events: DataViewCalendarEvent<TRecord>[];
    renderEvent?: (record: TRecord) => ReactNode;
    emptyState?: ReactNode;
}

export function DataViewCalendar<TRecord extends ViewRecord>({
    events,
    renderEvent,
    emptyState,
}: DataViewCalendarProps<TRecord>) {
    if (events.length === 0) {
        return (
            emptyState ?? (
                <Card withBorder>
                    <Text c="dimmed" ta="center">
                        No scheduled records
                    </Text>
                </Card>
            )
        );
    }

    return (
        <Stack gap="md">
            {events.map((event) => (
                <Card key={event.date} withBorder>
                    <Stack gap="sm">
                        <Text fw={600}>{event.date}</Text>
                        <Stack gap="sm">
                            {event.records.map((record) => (
                                <Card key={record.id} withBorder shadow="xs">
                                    {renderEvent ? (
                                        renderEvent(record)
                                    ) : (
                                        <Stack gap="xs">
                                            <Text fw={500}>{record.title}</Text>
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
                        </Stack>
                    </Stack>
                </Card>
            ))}
        </Stack>
    );
}
