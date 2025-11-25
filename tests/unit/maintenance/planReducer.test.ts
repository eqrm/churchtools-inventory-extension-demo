import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createInitialPlanState,
    maintenancePlanReducer,
    type MaintenancePlanInternalState,
} from '../../../src/state/maintenance/planStore';

function addDefaultAsset(state: MaintenancePlanInternalState): MaintenancePlanInternalState {
    return maintenancePlanReducer(state, {
        type: 'addAssets',
        assets: [
            {
                assetId: 'asset-1',
                assetNumber: 'AS-001',
                assetName: 'Camera A',
            },
        ],
    });
}

describe('maintenancePlanReducer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('blocks transition to planned without schedule and surfaces warnings', () => {
        let state = createInitialPlanState();
        state = addDefaultAsset(state);

        state = maintenancePlanReducer(state, { type: 'advanceStage', stage: 'planned' });

        expect(state.stage).toBe('draft');
        expect(state.stageWarnings).toContain('Start date and end date are required to plan maintenance.');
    });

    it('allows transition to planned when requirements are met', () => {
        let state = createInitialPlanState();
        state = addDefaultAsset(state);
        state = maintenancePlanReducer(state, {
            type: 'updateSchedule',
            schedule: { startDate: '2024-02-01', endDate: '2024-02-05' },
        });

        vi.setSystemTime(new Date('2024-02-01T08:30:00.000Z'));
        state = maintenancePlanReducer(state, { type: 'advanceStage', stage: 'planned' });

        expect(state.stage).toBe('planned');
        expect(state.stageWarnings).toHaveLength(0);
        expect(state.lastTransitionAt).toBe('2024-02-01T08:30:00.000Z');
    });

    it('prevents completion until every asset is completed or skipped', () => {
        let state = createInitialPlanState();
        state = addDefaultAsset(state);
        state = maintenancePlanReducer(state, {
            type: 'updateSchedule',
            schedule: { startDate: '2024-02-01', endDate: '2024-02-05' },
        });
        state = maintenancePlanReducer(state, { type: 'advanceStage', stage: 'planned' });

        state = maintenancePlanReducer(state, { type: 'advanceStage', stage: 'completed' });

        expect(state.stage).toBe('planned');
        expect(state.stageWarnings).toContain('All assets must be completed or skipped before closing maintenance.');
    });

    it('auto-completes the plan once all assets are marked completed', () => {
        let state = createInitialPlanState();
        state = addDefaultAsset(state);
        state = maintenancePlanReducer(state, {
            type: 'updateSchedule',
            schedule: { startDate: '2024-02-01', endDate: '2024-02-05' },
        });
        state = maintenancePlanReducer(state, { type: 'advanceStage', stage: 'planned' });

        vi.setSystemTime(new Date('2024-02-03T10:15:00.000Z'));
        state = maintenancePlanReducer(state, {
            type: 'markAssetCompleted',
            assetId: 'asset-1',
            completedBy: { id: 'user-1', name: 'Alex' },
            occurredAt: '2024-02-03T10:00:00.000Z',
            notes: 'Checked and cleaned',
        });

        expect(state.stage).toBe('completed');
        expect(state.stageWarnings).toHaveLength(0);
        expect(state.completedAt).toBe('2024-02-03T10:00:00.000Z');
        expect(state.assets[0]?.status).toBe('completed');
        expect(state.assets[0]?.completedByName).toBe('Alex');
    });

    it('reverts to planned and clears completion when asset returns to pending', () => {
        let state = createInitialPlanState();
        state = addDefaultAsset(state);
        state = maintenancePlanReducer(state, {
            type: 'updateSchedule',
            schedule: { startDate: '2024-02-01', endDate: '2024-02-05' },
        });
        state = maintenancePlanReducer(state, { type: 'advanceStage', stage: 'planned' });
        state = maintenancePlanReducer(state, {
            type: 'markAssetCompleted',
            assetId: 'asset-1',
            occurredAt: '2024-02-03T10:00:00.000Z',
        });

        vi.setSystemTime(new Date('2024-02-04T09:00:00.000Z'));
        state = maintenancePlanReducer(state, {
            type: 'markAssetPending',
            assetId: 'asset-1',
            reason: 'Follow-up inspection required',
            timestamp: '2024-02-04T09:00:00.000Z',
        });

        expect(state.stage).toBe('planned');
        expect(state.completedAt).toBeUndefined();
        expect(state.stageWarnings).toContain('All assets must be completed or skipped before closing maintenance.');
        expect(state.assets[0]?.status).toBe('pending');
        expect(state.assets[0]?.completedAt).toBeUndefined();
    });
});
