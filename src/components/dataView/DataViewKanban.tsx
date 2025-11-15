import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Badge, Button, Card, Group, ScrollArea, Stack, Text } from '@mantine/core';
import {
    DndContext,
    useDroppable,
    useSensor,
    useSensors,
    PointerSensor,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUndo } from '../../hooks/useUndo';
import type { UndoableActionInput } from '../../services/UndoService';
import type { ViewRecord } from './types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type ViewsTranslationFn = TFunction<'views'>;

export interface DataViewKanbanColumn<TRecord extends ViewRecord> {
    key: string;
    title: string;
    records: TRecord[];
    description?: string;
    loadMoreLabel?: string;
}

export interface DataViewKanbanProps<TRecord extends ViewRecord> {
    columns: DataViewKanbanColumn<TRecord>[];
    emptyState?: ReactNode;
    renderCard?: (record: TRecord) => ReactNode;
    onCardDrop?: (event: DataViewKanbanCardDropEvent<TRecord>) => Promise<void> | void;
    isDragDisabled?: boolean;
    columnWidth?: number;
    dragActivationDistance?: number;
    renderColumnHeader?: (
        column: DataViewKanbanColumn<TRecord>,
        summary: { recordCount: number },
    ) => ReactNode;
    renderEmptyColumnPlaceholder?: (column: DataViewKanbanColumn<TRecord>) => ReactNode;
    defaultColumnVisibleCount?: number;
    columnLoadIncrement?: number;
    onColumnLoadMore?: (column: DataViewKanbanColumn<TRecord>) => void;
    columnLoadingState?: Record<string, boolean>;
    undoConfig?: DataViewKanbanUndoConfig<TRecord>;
    dropGuards?: DataViewKanbanDropGuards<TRecord>;
}

export function DataViewKanban<TRecord extends ViewRecord>({
    columns,
    emptyState,
    renderCard,
    onCardDrop,
    isDragDisabled,
    columnWidth = 300,
    dragActivationDistance = 8,
    renderColumnHeader,
    renderEmptyColumnPlaceholder,
    defaultColumnVisibleCount = 20,
    columnLoadIncrement,
    onColumnLoadMore,
    columnLoadingState,
    undoConfig,
    dropGuards,
}: DataViewKanbanProps<TRecord>) {
    const { t } = useTranslation('views');
    const dragEnabled = Boolean(onCardDrop) && !isDragDisabled;
    const { recordAction: recordUndoAction } = useUndo(1);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: dragActivationDistance },
        }),
    );

    const [visibleCounts, setVisibleCounts] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        setVisibleCounts((previous) => {
            const next = new Map<string, number>();
            for (const column of columns) {
                const current = previous.get(column.key);
                const limit = defaultColumnVisibleCount > 0 ? defaultColumnVisibleCount : column.records.length;
                const nextCount = current === undefined
                    ? Math.min(limit, column.records.length)
                    : Math.min(current, column.records.length);
                next.set(column.key, nextCount);
            }
            return next;
        });
    }, [columns, defaultColumnVisibleCount]);

    const columnByKey = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);
    const loadAmount = columnLoadIncrement ?? defaultColumnVisibleCount;

    const incrementVisibleCount = useCallback((columnKey: string) => {
        setVisibleCounts((previous) => {
            const column = columnByKey.get(columnKey);
            if (!column) {
                return previous;
            }

            const current = previous.get(columnKey) ?? Math.min(defaultColumnVisibleCount, column.records.length);
            const increment = loadAmount > 0 ? loadAmount : column.records.length;
            const nextCount = Math.min(column.records.length, current + increment);

            if (nextCount === current) {
                return previous;
            }

            const next = new Map(previous);
            next.set(columnKey, nextCount);
            return next;
        });
    }, [columnByKey, defaultColumnVisibleCount, loadAmount]);

    const processDrop = useCallback(async (event: DragEndEvent) => {
        if (!dragEnabled || !onCardDrop) {
            return;
        }

        const activeData = event.active.data.current as KanbanCardDragData<TRecord> | undefined;
        const overData = event.over?.data.current as KanbanCardDragData<TRecord> | KanbanColumnDragData | undefined;

        if (!activeData || activeData.type !== 'card') {
            return;
        }

        let destinationColumn = activeData.columnKey;
        let destinationIndex = activeData.index;

        if (overData) {
            if (overData.type === 'card') {
                destinationColumn = overData.columnKey;
                destinationIndex = overData.index;

                if (activeData.columnKey === destinationColumn && overData.index > activeData.index) {
                    destinationIndex = overData.index - 1;
                }
            } else if (overData.type === 'column') {
                destinationColumn = overData.columnKey;
                destinationIndex = overData.index;
            }
        }

        if (activeData.columnKey === destinationColumn && activeData.index === destinationIndex) {
            return;
        }

        const dropEvent: DataViewKanbanCardDropEvent<TRecord> = {
            record: activeData.record,
            fromColumn: activeData.columnKey,
            fromIndex: activeData.index,
            toColumn: destinationColumn,
            toIndex: destinationIndex,
        };

        const fromColumnData = columnByKey.get(dropEvent.fromColumn)
            ?? columns.find((column) => column.key === dropEvent.fromColumn)
            ?? ({ key: dropEvent.fromColumn, title: dropEvent.fromColumn, records: [] } as DataViewKanbanColumn<TRecord>);
        const toColumnData = columnByKey.get(dropEvent.toColumn)
            ?? columns.find((column) => column.key === dropEvent.toColumn)
            ?? ({ key: dropEvent.toColumn, title: dropEvent.toColumn, records: [] } as DataViewKanbanColumn<TRecord>);

        const dropContext: DataViewKanbanDropContext<TRecord> = {
            ...dropEvent,
            columns,
            fromColumnData,
            toColumnData,
        };

        if (dropGuards?.canDrop) {
            const guardResult = dropGuards.canDrop(dropContext);
            const allowed = typeof guardResult === 'boolean' ? guardResult : guardResult?.allowed !== false;
            const reason = typeof guardResult === 'object' && guardResult && 'reason' in guardResult
                ? guardResult.reason
                : undefined;

            if (!allowed) {
                dropGuards.onDropDenied?.({ ...dropContext, reason });
                return;
            }
        }

        try {
            await onCardDrop(dropEvent);

            const undoAction = undoConfig?.buildUndoAction?.(dropContext)
                ?? buildUndoActionFromMetadata(dropContext);

            if (undoAction) {
                const recordFn = undoConfig?.recordAction ?? recordUndoAction;
                void recordFn(undoAction)
                    .then((actionId) => {
                        undoConfig?.onRecorded?.(actionId, dropContext);
                    })
                    .catch((error) => {
                        handleUndoError(error, dropContext, undoConfig);
                    });
            }
        } catch (error) {
            handleUndoError(error, dropContext, undoConfig);
        }
    }, [columnByKey, columns, dragEnabled, dropGuards, onCardDrop, recordUndoAction, undoConfig]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        void processDrop(event);
    }, [processDrop]);

    const visibleColumnData = useMemo(() => columns.map((column) => {
        const visibleCount = visibleCounts.get(column.key) ?? Math.min(defaultColumnVisibleCount, column.records.length);
        const records = column.records.slice(0, visibleCount);
        const hasMore = visibleCount < column.records.length;
        const isLoading = columnLoadingState?.[column.key] ?? false;

        return {
            column,
            records,
            hasMore,
            isLoading,
        };
    }), [columns, columnLoadingState, defaultColumnVisibleCount, visibleCounts]);

    const handleColumnLoadMore = useCallback((column: DataViewKanbanColumn<TRecord>) => {
        incrementVisibleCount(column.key);
        onColumnLoadMore?.(column);
    }, [incrementVisibleCount, onColumnLoadMore]);

    const hasRecords = columns.some((column) => column.records.length > 0);

    if (!hasRecords) {
        return (
            emptyState ?? (
                <Card withBorder>
                    <Text c="dimmed" ta="center">
                        {t('kanban.empty')}
                    </Text>
                </Card>
            )
        );
    }

    const content = (
        <ScrollArea offsetScrollbars>
            <Group align="flex-start" gap="md" wrap="nowrap">
                {visibleColumnData.map(({ column, records, hasMore, isLoading }) => (
                    <KanbanColumn
                        key={column.key}
                        column={column}
                        records={records}
                        columnWidth={columnWidth}
                        renderCard={renderCard}
                        dragEnabled={dragEnabled}
                        renderColumnHeader={renderColumnHeader}
                        renderEmptyColumnPlaceholder={renderEmptyColumnPlaceholder}
                        onLoadMore={hasMore ? handleColumnLoadMore : undefined}
                        hasMore={hasMore}
                        isLoadingMore={isLoading}
                        t={t}
                    />
                ))}
            </Group>
        </ScrollArea>
    );

    if (!dragEnabled) {
        return content;
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {content}
        </DndContext>
    );
}

interface KanbanCardDragData<TRecord extends ViewRecord> {
    type: 'card';
    record: TRecord;
    columnKey: string;
    index: number;
}

interface KanbanColumnDragData {
    type: 'column';
    columnKey: string;
    index: number;
}

export interface DataViewKanbanCardDropEvent<TRecord extends ViewRecord> {
    record: TRecord;
    fromColumn: string;
    fromIndex: number;
    toColumn: string;
    toIndex: number;
}

export interface DataViewKanbanDropContext<TRecord extends ViewRecord> extends DataViewKanbanCardDropEvent<TRecord> {
    columns: DataViewKanbanColumn<TRecord>[];
    fromColumnData: DataViewKanbanColumn<TRecord>;
    toColumnData: DataViewKanbanColumn<TRecord>;
    reason?: string;
}

export interface DataViewKanbanUndoConfig<TRecord extends ViewRecord> {
    buildUndoAction: (context: DataViewKanbanDropContext<TRecord>) => UndoableActionInput | null | undefined;
    recordAction?: (action: UndoableActionInput) => Promise<string>;
    onRecorded?: (actionId: string, context: DataViewKanbanDropContext<TRecord>) => void;
    onError?: (error: unknown, context: DataViewKanbanDropContext<TRecord>) => void;
}

export interface DataViewKanbanDropGuards<TRecord extends ViewRecord> {
    canDrop?: (context: DataViewKanbanDropContext<TRecord>) => boolean | { allowed: boolean; reason?: string };
    onDropDenied?: (context: DataViewKanbanDropContext<TRecord>) => void;
}

function buildUndoActionFromMetadata<TRecord extends ViewRecord>(
    context: DataViewKanbanDropContext<TRecord>,
): UndoableActionInput | null {
    const metadata = context.record.undo;
    if (!metadata) {
        return null;
    }

    if (metadata.buildStates) {
        const result = metadata.buildStates({
            record: context.record,
            fromKey: context.fromColumn,
            toKey: context.toColumn,
        });

        if (!result) {
            return null;
        }

        return {
            entityType: result.entityType ?? metadata.entityType ?? 'data-view-record',
            entityId: result.entityId ?? metadata.entityId ?? context.record.id,
            actionType: 'status-change',
            beforeState: result.before,
            afterState: result.after,
            metadata: result.metadata ?? metadata.metadata,
        } satisfies UndoableActionInput;
    }

    const fieldName = metadata.field ?? (context.record.groupKey !== undefined ? 'groupKey' : undefined);

    if (!fieldName && !metadata.beforeState) {
        return null;
    }

    const before = metadata.beforeState
        ? { ...metadata.beforeState }
        : fieldName
            ? { [fieldName]: context.fromColumn }
            : { groupKey: context.fromColumn };

    const after = {
        ...before,
        ...(fieldName ? { [fieldName]: context.toColumn } : { groupKey: context.toColumn }),
    } satisfies Record<string, unknown>;

    return {
        entityType: metadata.entityType ?? 'data-view-record',
        entityId: metadata.entityId ?? context.record.id,
        actionType: 'status-change',
        beforeState: before,
        afterState: after,
        metadata: metadata.metadata,
    } satisfies UndoableActionInput;
}

function handleUndoError<TRecord extends ViewRecord>(
    error: unknown,
    context: DataViewKanbanDropContext<TRecord>,
    undoConfig?: DataViewKanbanUndoConfig<TRecord>,
): void {
    if (undoConfig?.onError) {
        undoConfig.onError(error, context);
        return;
    }

    console.warn('DataViewKanban failed to record undo action.', error, context);
}

interface KanbanColumnProps<TRecord extends ViewRecord> {
    column: DataViewKanbanColumn<TRecord>;
    records: TRecord[];
    renderCard?: (record: TRecord) => ReactNode;
    dragEnabled: boolean;
    columnWidth: number;
    renderColumnHeader?: (
        column: DataViewKanbanColumn<TRecord>,
        summary: { recordCount: number },
    ) => ReactNode;
    renderEmptyColumnPlaceholder?: (column: DataViewKanbanColumn<TRecord>) => ReactNode;
    onLoadMore?: (column: DataViewKanbanColumn<TRecord>) => void;
    hasMore: boolean;
    isLoadingMore?: boolean;
    t: ViewsTranslationFn;
}

function KanbanColumn<TRecord extends ViewRecord>({
    column,
    records,
    renderCard,
    dragEnabled,
    columnWidth,
    renderColumnHeader,
    renderEmptyColumnPlaceholder,
    onLoadMore,
    hasMore,
    isLoadingMore,
    t,
}: KanbanColumnProps<TRecord>) {
    const droppable = useDroppable({
        id: `column-${column.key}`,
        data: {
            type: 'column',
            columnKey: column.key,
            index: column.records.length,
        } satisfies KanbanColumnDragData,
        disabled: !dragEnabled,
    });

    const items = records.map((record, index) => (
        dragEnabled ? (
            <SortableKanbanCard
                key={record.id}
                record={record}
                columnKey={column.key}
                index={index}
                renderCard={renderCard}
            />
        ) : (
            <StaticKanbanCard key={record.id} record={record} renderCard={renderCard} />
        )
    ));

    const placeholder = renderEmptyColumnPlaceholder
        ? renderEmptyColumnPlaceholder(column)
        : (
            <Card withBorder radius="sm" bg="gray.1">
                <Text size="sm" c="dimmed" ta="center">
                    {t('kanban.columnEmpty')}
                </Text>
            </Card>
        );

    const columnHeader = renderColumnHeader
        ? renderColumnHeader(column, { recordCount: column.records.length })
        : (
            <Group justify="space-between" align="center" gap="xs">
                <Stack gap={2} flex={1}>
                    <Text fw={600}>{column.title}</Text>
                    {column.description && (
                        <Text size="xs" c="dimmed">
                            {column.description}
                        </Text>
                    )}
                </Stack>
                <Badge size="sm" variant="light" color="gray">
                    {column.records.length}
                </Badge>
            </Group>
        );

    const content = (
        <Stack
            gap="sm"
            ref={droppable.setNodeRef}
            style={droppable.isOver ? { backgroundColor: 'rgba(0, 113, 227, 0.08)', borderRadius: '8px' } : undefined}
        >
            {items.length > 0 ? items : placeholder}
        </Stack>
    );

    return (
        <Card withBorder w={columnWidth} miw={columnWidth} p="sm">
            <Stack gap="sm">
                {columnHeader}
                {dragEnabled ? (
                    <SortableContext items={records.map((record) => record.id)} strategy={verticalListSortingStrategy}>
                        {content}
                    </SortableContext>
                ) : (
                    content
                )}
                {hasMore && (
                    <Button
                        variant="light"
                        size="xs"
                        onClick={() => onLoadMore?.(column)}
                        disabled={isLoadingMore}
                    >
                        {column.loadMoreLabel ?? t('kanban.loadMore')}
                    </Button>
                )}
            </Stack>
        </Card>
    );
}

interface SortableKanbanCardProps<TRecord extends ViewRecord> {
    record: TRecord;
    columnKey: string;
    index: number;
    renderCard?: (record: TRecord) => ReactNode;
}

function SortableKanbanCard<TRecord extends ViewRecord>({
    record,
    columnKey,
    index,
    renderCard,
}: SortableKanbanCardProps<TRecord>) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: record.id,
        data: {
            type: 'card',
            record,
            columnKey,
            index,
        } satisfies KanbanCardDragData<TRecord>,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.75 : 1,
    };

    return (
        <Card
            withBorder
            shadow="xs"
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
        >
            {renderCard ? <>{renderCard(record)}</> : <DefaultKanbanCardContent record={record} />}
        </Card>
    );
}

interface StaticKanbanCardProps<TRecord extends ViewRecord> {
    record: TRecord;
    renderCard?: (record: TRecord) => ReactNode;
}

function StaticKanbanCard<TRecord extends ViewRecord>({ record, renderCard }: StaticKanbanCardProps<TRecord>) {
    return (
        <Card withBorder shadow="xs">
            {renderCard ? <>{renderCard(record)}</> : <DefaultKanbanCardContent record={record} />}
        </Card>
    );
}

function DefaultKanbanCardContent<TRecord extends ViewRecord>({ record }: { record: TRecord }) {
    return (
        <Stack gap="xs">
            <Text fw={500}>{record.title}</Text>
            {record.subtitle && (
                <Text size="sm" c="dimmed">
                    {record.subtitle}
                </Text>
            )}
            {record.description && <Text size="sm">{record.description}</Text>}
        </Stack>
    );
}
