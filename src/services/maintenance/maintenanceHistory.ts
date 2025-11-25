import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';
import type { MaintenancePlanInternalState, MaintenancePlanAssetState } from '../../state/maintenance/planStore';

export type MaintenanceStatus = MaintenancePlanAssetState['status'];

interface MaintenanceStatusChangeOptions {
    asset: MaintenancePlanAssetState;
    plan: Pick<MaintenancePlanInternalState, 'planId' | 'name'>;
    nextStatus: MaintenanceStatus;
    previousStatus: MaintenanceStatus;
    occurredAt?: string;
    notes?: string;
    actor?: {
        id: string;
        name: string;
    };
}

function normalizeTimestamp(timestamp?: string): string {
    if (!timestamp) {
        return new Date().toISOString();
    }

    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function resolveActorName(actor: { id: string; name: string | null | undefined }): string {
    if (actor.name && actor.name.trim().length > 0) {
        return actor.name;
    }

    return 'Maintenance automation';
}

export async function recordMaintenanceStatusChange(options: MaintenanceStatusChangeOptions): Promise<void> {
    try {
        const provider = getChurchToolsStorageProvider();

        let actorId = options.actor?.id;
        let actorName = options.actor?.name;

        if (!actorId || !actorName) {
            const currentUser = await provider.getCurrentUser();
            actorId = currentUser.id;
            actorName = currentUser.name ?? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim();
        }

        const occurredAt = normalizeTimestamp(options.occurredAt);
        const planName = options.plan.name || 'Maintenance plan';

        await provider.recordChange({
            entityType: 'asset',
            entityId: options.asset.assetId,
            entityName: options.asset.assetName,
            action: 'maintenance-performed',
            changedBy: actorId,
            changedByName: resolveActorName({ id: actorId, name: actorName }),
            changes: [
                {
                    field: 'maintenanceStatus',
                    oldValue: options.previousStatus,
                    newValue: options.nextStatus,
                },
                {
                    field: 'maintenancePlan',
                    oldValue: options.plan.planId ?? '',
                    newValue: planName,
                },
                options.notes
                    ? {
                          field: 'maintenanceNotes',
                          oldValue: '',
                          newValue: options.notes,
                      }
                    : undefined,
                {
                    field: 'occurredAt',
                    oldValue: options.asset.completedAt ?? '',
                    newValue: occurredAt,
                },
            ].filter(Boolean) as Array<{ field: string; oldValue: string; newValue: string }>,
        });
    } catch (error) {
        // History events are non-critical; log for diagnostics but do not block UI flow.
        console.error('[MaintenanceHistory] Failed to record maintenance status change', error);
    }
}
