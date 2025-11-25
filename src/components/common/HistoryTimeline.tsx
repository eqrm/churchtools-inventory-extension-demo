import { Card, Stack, Timeline, Text, Group, Badge, Center, Loader, Alert, Button } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useHistoryEvents } from '../../hooks/useHistoryEvents';
import type { HistoryEvent, HistoryEventSource } from '../../utils/history/types';

type HistoryTimelineProps = {
    entityType: 'asset' | 'booking' | 'maintenance';
    entityId: string;
    sources: HistoryEventSource[];
    title?: string;
    emptyState?: string;
};

function formatDay(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(parsed);
}

function formatTime(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
    }).format(parsed);
}

function buildTitle(event: HistoryEvent): string {
    if (event.title) {
        return event.title;
    }

    const summary = event.metadata?.['summary'];
    if (typeof summary === 'string') {
        return summary;
    }

    return `${event.kind} event`;
}

export function HistoryTimeline({
    entityType,
    entityId,
    sources,
    title = 'History',
    emptyState = 'No history available yet.',
}: HistoryTimelineProps) {
    const historySources = useMemo(() => sources, [sources]);
    const { groups, isLoading, isError, error, refetch } = useHistoryEvents({
        sources: historySources,
        sortDirection: 'desc',
        groupByDay: true,
    });

    if (isLoading) {
        return (
            <Center py="lg">
                <Loader size="sm" />
            </Center>
        );
    }

    if (isError) {
        return (
            <Alert color="red" title="Unable to load history">
                <Stack gap="xs">
                    <Text size="sm">{error instanceof Error ? error.message : 'Unknown error'}</Text>
                    <Button
                        onClick={() => {
                            void refetch();
                        }}
                        leftSection={<IconRefresh size={16} />}
                        variant="light"
                        size="xs"
                    >
                        Retry
                    </Button>
                </Stack>
            </Alert>
        );
    }

    if (groups.length === 0) {
        return (
            <Card withBorder>
                <Stack gap="xs">
                    <Text fw={600}>{title}</Text>
                    <Text size="sm" c="dimmed">
                        {emptyState}
                    </Text>
                </Stack>
            </Card>
        );
    }

    return (
        <Card withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={0}>
                        <Text fw={600}>{title}</Text>
                        <Text size="xs" c="dimmed">
                            Showing timeline for {entityType} #{entityId}
                        </Text>
                    </Stack>
                    <Button
                        onClick={() => {
                            void refetch();
                        }}
                        leftSection={<IconRefresh size={16} />}
                        variant="subtle"
                        size="xs"
                    >
                        Refresh
                    </Button>
                </Group>

                <Timeline active={groups.length} bulletSize={18} lineWidth={2}>
                    {groups.map(group => (
                        <Timeline.Item key={group.date}>
                            <Stack gap="xs">
                                <Text fw={600} data-testid="history-group-date">
                                    {formatDay(group.date)}
                                </Text>
                                <Stack gap="sm">
                                    {group.events.map(event => (
                                        <Card key={event.id} withBorder padding="sm" radius="md">
                                            <Stack gap="xs">
                                                <Group justify="space-between" align="flex-start">
                                                    <Stack gap={0}>
                                                        <Text fw={500} data-testid="history-event-title">
                                                            {buildTitle(event)}
                                                        </Text>
                                                        {event.description ? (
                                                            <Text size="sm" c="dimmed">
                                                                {event.description}
                                                            </Text>
                                                        ) : null}
                                                    </Stack>
                                                    <Text size="xs" c="dimmed">
                                                        {formatTime(event.occurredAt)}
                                                    </Text>
                                                </Group>
                                                <Group gap="xs">
                                                    {event.actor?.name ? (
                                                        <Badge color="gray" variant="outline" size="sm">
                                                            {event.actor.name}
                                                        </Badge>
                                                    ) : null}
                                                    {event.tags?.map(tag => (
                                                        <Badge key={`${event.id}-${tag.id}`} color={tag.color ?? 'blue'} variant="light" size="sm">
                                                            {tag.label}
                                                        </Badge>
                                                    ))}
                                                </Group>
                                            </Stack>
                                        </Card>
                                    ))}
                                </Stack>
                            </Stack>
                        </Timeline.Item>
                    ))}
                </Timeline>
            </Stack>
        </Card>
    );
}
