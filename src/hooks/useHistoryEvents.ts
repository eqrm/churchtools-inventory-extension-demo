import { useCallback, useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import type {
    HistoryEvent,
    HistoryEventGroup,
    UseHistoryEventsOptions,
    UseHistoryEventsResult,
} from '../utils/history/types';

const DEFAULT_STALE_TIME = 2 * 60 * 1000; // 2 minutes

function sortEvents(events: HistoryEvent[], direction: 'asc' | 'desc'): HistoryEvent[] {
    return [...events].sort((a, b) => {
        const timeA = new Date(a.occurredAt).getTime();
        const timeB = new Date(b.occurredAt).getTime();

        if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
            return direction === 'asc'
                ? a.occurredAt.localeCompare(b.occurredAt)
                : b.occurredAt.localeCompare(a.occurredAt);
        }

        return direction === 'asc' ? timeA - timeB : timeB - timeA;
    });
}

function groupEventsByDay(events: HistoryEvent[]): HistoryEventGroup[] {
    const groups = new Map<string, HistoryEvent[]>();

    events.forEach(event => {
        const parsed = new Date(event.occurredAt);
        const dayKey = Number.isNaN(parsed.getTime())
            ? (event.occurredAt.split('T')[0] ?? event.occurredAt)
            : parsed.toISOString().slice(0, 10);

        if (!groups.has(dayKey)) {
            groups.set(dayKey, []);
        }

        groups.get(dayKey)?.push(event);
    });

    return Array.from(groups.entries())
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([date, items]) => ({
            date,
            events: items,
        }));
}

function dedupeEvents(events: HistoryEvent[]): HistoryEvent[] {
    const seen = new Map<string, HistoryEvent>();

    events.forEach(event => {
        seen.set(event.id, event);
    });

    return Array.from(seen.values());
}

export function useHistoryEvents(options: UseHistoryEventsOptions): UseHistoryEventsResult {
    const { sources, sortDirection = 'desc', groupByDay = true } = options;

    const queries = useMemo(
        () =>
            sources.map(source => ({
                queryKey: source.queryKey,
                queryFn: source.queryFn,
                enabled: source.enabled ?? true,
                staleTime: source.staleTime ?? DEFAULT_STALE_TIME,
            })),
        [sources],
    );

    const queryResults = useQueries({ queries }) as UseQueryResult<HistoryEvent[]>[];

    const events = useMemo(() => {
        const collected = queryResults.flatMap(result => result.data ?? []);
        const deduped = dedupeEvents(collected);
        return sortEvents(deduped, sortDirection);
    }, [queryResults, sortDirection]);

    const groups = useMemo(() => (groupByDay ? groupEventsByDay(events) : []), [events, groupByDay]);

    const isLoading = queryResults.some(result => result.isLoading);
    const isError = queryResults.some(result => result.isError);
    const error = queryResults.find(result => result.error)?.error ?? null;

    const refetch = useCallback(() => Promise.all(queryResults.map(result => result.refetch())), [queryResults]);

    return {
        events,
        groups,
        isLoading,
        isError,
        error,
        refetch,
    };
}
