import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';
import type { MaintenancePlanInternalState, MaintenancePlanAssetState } from '../../state/maintenance/planStore';
import type { MaintenanceCalendarHold } from '../../types/entities';
import type { IStorageProvider } from '../../types/storage';

export interface MaintenanceHoldSyncResult {
    created: MaintenanceCalendarHold[];
    released: MaintenanceCalendarHold[];
}

const DEFAULT_HOLD_COLOR = '#fab005';

function resolvePlanContext(plan: MaintenancePlanInternalState): {
    planId: string;
    startDate: string;
    endDate: string;
} {
    const { startDate, endDate } = plan.schedule;

    if (!startDate || !endDate) {
        throw new Error('Maintenance schedule requires both start and end dates to publish holds.');
    }

    if (!plan.planId) {
        throw new Error('Maintenance plan requires an identifier before publishing holds.');
    }

    return {
        planId: plan.planId,
        startDate,
        endDate,
    };
}

async function createHoldForAsset(
    provider: IStorageProvider,
    plan: MaintenancePlanInternalState,
    asset: MaintenancePlanAssetState,
): Promise<MaintenanceCalendarHold> {
    const context = resolvePlanContext(plan);

    const user = await provider.getCurrentUser();
    const actorId = user.id;
    const actorName = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Maintenance Team';

    const booking = await provider.createBooking({
        asset: {
            id: asset.assetId,
            assetNumber: asset.assetNumber,
            name: asset.assetName,
        },
        bookingMode: 'date-range',
        startDate: context.startDate,
        endDate: context.endDate,
        purpose: plan.name ? `Maintenance hold · ${plan.name}` : 'Scheduled maintenance hold',
        notes: plan.notes ?? undefined,
        bookedById: actorId,
        bookedByName: actorName,
        bookingForId: actorId,
        bookingForName: actorName,
        requestedBy: actorId,
        requestedByName: actorName,
        status: 'maintenance-hold',
    });

    return provider.createMaintenanceHold({
        planId: context.planId,
        assetId: asset.assetId,
        startDate: context.startDate,
        endDate: context.endDate,
        bookingId: booking.id,
        holdColor: plan.schedule.holdColor ?? DEFAULT_HOLD_COLOR,
    });
}

async function releaseHold(
    provider: IStorageProvider,
    hold: MaintenanceCalendarHold,
    releasedAt?: string,
): Promise<MaintenanceCalendarHold> {
    if (hold.bookingId) {
        await provider.updateBooking(hold.bookingId, {
            status: 'cancelled',
            notes: 'Maintenance window released',
        });
    }

    return provider.releaseMaintenanceHold(hold.id, {
        releasedAt: releasedAt ?? new Date().toISOString(),
    });
}

export async function syncMaintenancePlanHolds(
    plan: MaintenancePlanInternalState,
): Promise<MaintenanceHoldSyncResult> {
    if (!plan.planId) {
        return { created: [], released: [] };
    }

    const provider = getChurchToolsStorageProvider();

    const activeHolds = await provider.getMaintenanceHolds({ planId: plan.planId, status: 'active' });
    const holdByAsset = new Map(activeHolds.map(hold => [hold.assetId, hold] as const));

    const created: MaintenanceCalendarHold[] = [];
    const released: MaintenanceCalendarHold[] = [];

    const requiresHold = plan.stage === 'planned';
    const desiredHoldColor = plan.schedule.holdColor ?? DEFAULT_HOLD_COLOR;
    const planContext = requiresHold ? resolvePlanContext(plan) : null;

    for (const asset of plan.assets) {
        const existing = holdByAsset.get(asset.assetId);
        if (existing) {
            holdByAsset.delete(asset.assetId);
        }

        const shouldHold = requiresHold && asset.status === 'pending';

        if (shouldHold) {
            if (existing) {
                const requiresUpdate =
                    existing.startDate !== planContext?.startDate ||
                    existing.endDate !== planContext?.endDate ||
                    (existing.holdColor ?? DEFAULT_HOLD_COLOR) !== desiredHoldColor;

                if (requiresUpdate) {
                    const releasedHold = await releaseHold(provider, existing);
                    released.push(releasedHold);

                    const newHold = await createHoldForAsset(provider, plan, asset);
                    created.push(newHold);
                }
            } else {
                const newHold = await createHoldForAsset(provider, plan, asset);
                created.push(newHold);
            }
        } else if (existing) {
            const releasedHold = await releaseHold(provider, existing);
            released.push(releasedHold);
        }
    }

    if (holdByAsset.size > 0) {
        for (const danglingHold of holdByAsset.values()) {
            const releasedHold = await releaseHold(provider, danglingHold);
            released.push(releasedHold);
        }
    }

    return { created, released };
}

export function applyHoldSyncResult(
    result: MaintenanceHoldSyncResult,
    updateHold: (assetId: string, holdId: string | null) => void,
): void {
    result.created.forEach(hold => {
        updateHold(hold.assetId, hold.id);
    });

    result.released.forEach(hold => {
        updateHold(hold.assetId, null);
    });
}
