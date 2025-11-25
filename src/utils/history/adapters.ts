import type { ChangeAction, ChangeHistoryEntry, FieldChange } from '../../types/entities';
import type { HistoryEvent, HistoryEventKind, HistoryEventTag } from './types';

const ENTITY_LABELS: Record<string, string> = {
    asset: 'Asset',
    booking: 'Booking',
    maintenance: 'Maintenance',
    category: 'Category',
    kit: 'Kit',
    stocktake: 'Stock take',
    'asset-prefix': 'Asset prefix',
};

function mapActionToKind(action: ChangeAction, changes: FieldChange[] | undefined): HistoryEventKind {
    if (action === 'status-changed') {
        return 'status-change';
    }

    if (action === 'maintenance-performed') {
        return 'maintenance-stage';
    }

    if (action === 'scanned') {
        return 'system';
    }

    if (action === 'booked' || action === 'checked-out' || action === 'checked-in') {
        return 'assignment';
    }

    if (action === 'created') {
        return 'created';
    }

    if (action === 'deleted') {
        return 'system';
    }

    if (changes && changes.some(change => change.field === 'notes' || change.field === 'description')) {
        return 'note';
    }

    return 'updated';
}

function buildTitleFromEntry(entry: ChangeHistoryEntry): string {
    const label = ENTITY_LABELS[entry.entityType] ?? 'Record';

    if (entry.action === 'created') {
        return `${label} created`;
    }

    if (entry.action === 'deleted') {
        return `${label} deleted`;
    }

    const statusChange = entry.changes?.find(change => change.field === 'status');
    if (statusChange) {
        return `Status changed to ${statusChange.newValue}`;
    }

    if (entry.action === 'checked-out') {
        return `${label} checked out`;
    }

    if (entry.action === 'checked-in') {
        return `${label} checked in`;
    }

    if (entry.action === 'booked') {
        return `${label} booked`;
    }

    if (entry.action === 'maintenance-performed') {
        const completed = entry.changes?.find(change => change.field === 'completionStatus');
        if (completed) {
            return `Maintenance marked ${completed.newValue}`;
        }
        return 'Maintenance updated';
    }

    if (entry.changes && entry.changes.length > 0) {
        const fields = entry.changes.map(change => change.field).join(', ');
        return `${label} updated (${fields})`;
    }

    return `${label} ${entry.action}`;
}

function buildDescription(entry: ChangeHistoryEntry): string | undefined {
    if (!entry.changes || entry.changes.length === 0) {
        return undefined;
    }

    const statusChange = entry.changes.find(change => change.field === 'status');
    if (statusChange) {
        return `${statusChange.oldValue ?? 'unknown'} → ${statusChange.newValue ?? 'unknown'}`;
    }

    if (entry.changes.length === 1) {
        const [change] = entry.changes;
        if (change) {
            return `${change.oldValue ?? '—'} → ${change.newValue ?? '—'}`;
        }
    }

    return `${entry.changes.length} fields updated`;
}

function buildTags(entry: ChangeHistoryEntry): HistoryEventTag[] | undefined {
    if (!entry.changes || entry.changes.length === 0) {
        return undefined;
    }

    return entry.changes.map(change => ({
        id: `${entry.id}-${change.field}`,
        label: change.field,
    }));
}

function normalizeEntityType(entityType: ChangeHistoryEntry['entityType']): HistoryEvent['entityType'] {
    if (entityType === 'stocktake') {
        return 'asset';
    }

    if (entityType === 'asset-prefix') {
        return 'category';
    }

    return entityType as HistoryEvent['entityType'];
}

export function changeHistoryEntryToHistoryEvent(entry: ChangeHistoryEntry): HistoryEvent {
    const kind = mapActionToKind(entry.action, entry.changes);

    return {
        id: entry.id,
        entityId: entry.entityId,
        entityType: normalizeEntityType(entry.entityType),
        occurredAt: entry.changedAt,
        kind,
        title: buildTitleFromEntry(entry),
        description: buildDescription(entry),
        actor: entry.changedBy
            ? {
                  id: entry.changedBy,
                  name: entry.changedByName,
              }
            : undefined,
        tags: buildTags(entry),
        metadata: {
            action: entry.action,
            changeCount: entry.changes?.length ?? 0,
        },
    };
}

export function changeHistoryEntriesToEvents(entries: ChangeHistoryEntry[]): HistoryEvent[] {
    return entries.map(changeHistoryEntryToHistoryEvent);
}
