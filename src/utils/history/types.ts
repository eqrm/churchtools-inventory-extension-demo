import type { QueryKey } from '@tanstack/react-query';

export type HistoryEntityType =
    | 'asset'
    | 'booking'
    | 'maintenance'
    | 'category'
    | 'kit'
    | 'stocktake'
    | 'asset-prefix';

export type HistoryEventKind =
    | 'created'
    | 'updated'
    | 'status-change'
    | 'assignment'
    | 'maintenance-stage'
    | 'note'
    | 'system';

export interface HistoryEventActor {
    id: string;
    name: string;
    avatarUrl?: string | null;
}

export interface HistoryEventTag {
    id: string;
    label: string;
    color?: string;
}

export interface HistoryEventMetadata {
    [key: string]: unknown;
}

export interface HistoryEvent {
    id: string;
    entityId: string;
    entityType: HistoryEntityType;
    occurredAt: string; // ISO timestamp
    kind: HistoryEventKind;
    title: string;
    description?: string;
    actor?: HistoryEventActor;
    tags?: HistoryEventTag[];
    metadata?: HistoryEventMetadata;
}

export interface HistoryEventGroup {
    /** ISO date (YYYY-MM-DD) used for grouping */
    date: string;
    events: HistoryEvent[];
}

export type HistoryEventAdapter<TInput> = (input: TInput) => HistoryEvent;

export interface HistoryEventSource {
    /** Unique query key for TanStack Query */
    queryKey: QueryKey;
    /** Fetch function returning normalized history events */
    queryFn: () => Promise<HistoryEvent[]>;
    /** Optional stale time override */
    staleTime?: number;
    /** Optional flag to disable fetching */
    enabled?: boolean;
}

export interface UseHistoryEventsOptions {
    /** Sources to resolve for this entity */
    sources: HistoryEventSource[];
    /** Sort direction. Defaults to descending (newest first). */
    sortDirection?: 'asc' | 'desc';
    /** Group events by day when true (default). */
    groupByDay?: boolean;
}

export interface UseHistoryEventsResult {
    events: HistoryEvent[];
    groups: HistoryEventGroup[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => Promise<unknown[]>;
}
