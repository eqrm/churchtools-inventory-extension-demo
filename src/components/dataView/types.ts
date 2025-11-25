import type { ReactNode } from 'react';

export type DataViewMode = 'table' | 'gallery' | 'kanban' | 'calendar';

export interface ViewStatusDescriptor {
    label: string;
    color?: string;
    variant?: 'light' | 'filled' | 'outline';
    icon?: ReactNode;
}

export interface ViewTagDescriptor {
    label: string;
    color?: string;
    icon?: ReactNode;
}

export interface ViewRecord<TSource = unknown> {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    status?: ViewStatusDescriptor;
    tags?: ViewTagDescriptor[];
    metadata?: Record<string, unknown>;
    primaryDate?: string;
    secondaryDate?: string;
    groupKey?: string;
    avatarUrl?: string;
    thumbnailUrl?: string;
    source: TSource;
    undo?: ViewRecordUndoMetadata<TSource>;
}

export interface ViewRecordUndoMetadata<TSource = unknown> {
    entityId?: string;
    entityType?: string;
    field?: string;
    metadata?: Record<string, unknown>;
    beforeState?: Record<string, unknown>;
    buildStates?: (context: {
        record: ViewRecord<TSource>;
        fromKey: string;
        toKey: string;
    }) => {
        before: Record<string, unknown>;
        after: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        entityId?: string;
        entityType?: string;
    } | null | undefined;
}
