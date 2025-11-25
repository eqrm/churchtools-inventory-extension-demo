import { create } from 'zustand';
import type {
    ISOTimestamp,
    MaintenancePlanAssetStatus,
    MaintenancePlanSchedule,
    MaintenancePlanStage,
} from '../../types/entities';

type CompletionActor = {
    id: string;
    name: string;
};

type MaintenanceAssetInput = {
    assetId: string;
    assetNumber: string;
    assetName: string;
};

type Nullable<T> = T | null | undefined;

const PLANNED_MISSING_SCHEDULE_MESSAGE =
    'Start date and end date are required to plan maintenance.';
const PLANNED_MISSING_ASSETS_MESSAGE =
    'At least one asset must be selected before planning maintenance.';
const COMPLETION_INCOMPLETE_ASSETS_MESSAGE =
    'All assets must be completed or skipped before closing maintenance.';

export interface MaintenancePlanAssetState {
    assetId: string;
    assetNumber: string;
    assetName: string;
    status: MaintenancePlanAssetStatus;
    notes?: string;
    holdId?: string | null;
    completedAt?: ISOTimestamp;
    completedBy?: string;
    completedByName?: string;
}

export interface MaintenancePlanInternalState {
    planId: string | null;
    name: string;
    description: string;
    notes: string;
    stage: MaintenancePlanStage;
    maintenanceCompanyId?: string;
    maintenanceCompanyName?: string;
    intervalRule?: string;
    schedule: MaintenancePlanSchedule;
    assets: MaintenancePlanAssetState[];
    stageWarnings: string[];
    lastTransitionAt?: ISOTimestamp;
    completedAt?: ISOTimestamp;
}

type SetCompanyPayload =
    | { id: string; name: string }
    | undefined
    | null;

export type MaintenancePlanAction =
    | { type: 'reset' }
    | { type: 'hydrate'; payload: Partial<MaintenancePlanInternalState> }
    | { type: 'setName'; name: string }
    | { type: 'setDescription'; description: string }
    | { type: 'setNotes'; notes: string }
    | { type: 'setCompany'; company: SetCompanyPayload }
    | { type: 'setIntervalRule'; intervalRule?: string | null }
    | { type: 'updateSchedule'; schedule: MaintenancePlanSchedule }
    | { type: 'addAssets'; assets: MaintenanceAssetInput[]; replace?: boolean }
    | { type: 'removeAsset'; assetId: string }
    | { type: 'setAssetHold'; assetId: string; holdId: string | null }
    | {
          type: 'markAssetCompleted';
          assetId: string;
          completedBy?: CompletionActor;
          occurredAt?: string;
          notes?: string;
      }
    | { type: 'markAssetPending'; assetId: string; reason?: string; timestamp?: string }
    | { type: 'markAssetSkipped'; assetId: string; reason?: string; timestamp?: string }
    | { type: 'advanceStage'; stage: MaintenancePlanStage; timestamp?: string };

function nowIso(): string {
    return new Date().toISOString();
}

function generatePlanId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `plan-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneSchedule(current: MaintenancePlanSchedule, next?: MaintenancePlanSchedule): MaintenancePlanSchedule {
    return {
        ...current,
        ...(next ?? {}),
    };
}

function normalizeNotes(value: Nullable<string>): string {
    return typeof value === 'string' ? value : '';
}

function normalizeString(value: Nullable<string>): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function createInitialPlanState(): MaintenancePlanInternalState {
    return {
        planId: null,
        name: '',
        description: '',
        notes: '',
        stage: 'draft',
        maintenanceCompanyId: undefined,
        maintenanceCompanyName: undefined,
        intervalRule: undefined,
        schedule: {},
        assets: [],
        stageWarnings: [],
        lastTransitionAt: undefined,
        completedAt: undefined,
    };
}

function validateReadyForPlanned(state: MaintenancePlanInternalState): string[] {
    const messages: string[] = [];

    if (!state.schedule.startDate || !state.schedule.endDate) {
        messages.push(PLANNED_MISSING_SCHEDULE_MESSAGE);
    }

    if (state.assets.length === 0) {
        messages.push(PLANNED_MISSING_ASSETS_MESSAGE);
    }

    return messages;
}

function validateReadyForCompletion(state: MaintenancePlanInternalState): string[] {
    const incomplete = state.assets.filter((asset) => asset.status !== 'completed' && asset.status !== 'skipped');
    return incomplete.length > 0 ? [COMPLETION_INCOMPLETE_ASSETS_MESSAGE] : [];
}

function upsertAssets(
    existing: MaintenancePlanAssetState[],
    incoming: MaintenanceAssetInput[],
    replace: boolean | undefined,
): MaintenancePlanAssetState[] {
    if (replace) {
        return incoming.map((asset) => ({
            assetId: asset.assetId,
            assetNumber: asset.assetNumber,
            assetName: asset.assetName,
            status: 'pending',
            notes: undefined,
            holdId: null,
        }));
    }

    const existingById = new Map(existing.map((asset) => [asset.assetId, asset] as const));
    const merged = [...existing];

    incoming.forEach((asset) => {
        if (existingById.has(asset.assetId)) {
            return;
        }
        merged.push({
            assetId: asset.assetId,
            assetNumber: asset.assetNumber,
            assetName: asset.assetName,
            status: 'pending',
            notes: undefined,
            holdId: null,
        });
    });

    return merged;
}

function AutoCompleteIfFinished(
    state: MaintenancePlanInternalState,
    assets: MaintenancePlanAssetState[],
    occurredAt?: string,
): MaintenancePlanInternalState {
    const allCompleted = assets.every((asset) => asset.status === 'completed' || asset.status === 'skipped');

    if (!allCompleted) {
        const nextStage = state.stage === 'completed' ? 'planned' : state.stage;
        return {
            ...state,
            assets,
            stageWarnings: state.stage === 'completed' ? [COMPLETION_INCOMPLETE_ASSETS_MESSAGE] : [],
            stage: nextStage,
            completedAt: undefined,
        };
    }

    const completionTimestamp = occurredAt ?? nowIso();
    return {
        ...state,
        assets,
        stage: 'completed',
        stageWarnings: [],
        completedAt: completionTimestamp,
        lastTransitionAt: completionTimestamp,
    };
}

function mapAssetStatus(
    assets: MaintenancePlanAssetState[],
    assetId: string,
    updater: (asset: MaintenancePlanAssetState) => MaintenancePlanAssetState,
): MaintenancePlanAssetState[] {
    return assets.map((asset) => (asset.assetId === assetId ? updater(asset) : asset));
}

export function maintenancePlanReducer(
    state: MaintenancePlanInternalState,
    action: MaintenancePlanAction,
): MaintenancePlanInternalState {
    switch (action.type) {
        case 'reset':
            return createInitialPlanState();
        case 'hydrate': {
            const payload = action.payload;
            return {
                ...state,
                ...payload,
                schedule: cloneSchedule(state.schedule, payload.schedule),
                assets: payload.assets ? payload.assets.map((asset) => ({ ...asset })) : state.assets,
                stageWarnings: payload.stageWarnings ?? state.stageWarnings,
            };
        }
        case 'setName':
            return { ...state, name: normalizeString(action.name) };
        case 'setDescription':
            return { ...state, description: normalizeString(action.description) };
        case 'setNotes':
            return { ...state, notes: normalizeNotes(action.notes) };
        case 'setCompany': {
            const company = action.company;
            if (!company) {
                return { ...state, maintenanceCompanyId: undefined, maintenanceCompanyName: undefined };
            }
            return {
                ...state,
                maintenanceCompanyId: company.id,
                maintenanceCompanyName: company.name,
            };
        }
        case 'setIntervalRule':
            return { ...state, intervalRule: action.intervalRule ?? undefined };
        case 'updateSchedule':
            return { ...state, schedule: cloneSchedule(state.schedule, action.schedule) };
        case 'addAssets': {
            const assets = upsertAssets(state.assets, action.assets, action.replace);
            const baseState: MaintenancePlanInternalState = {
                ...state,
                assets,
            };

            if (state.stage === 'completed' && assets.some((asset) => asset.status === 'pending')) {
                return {
                    ...baseState,
                    stage: 'planned',
                    completedAt: undefined,
                    stageWarnings: [],
                };
            }

            if (state.stage !== 'draft' && assets.length === 0) {
                return {
                    ...baseState,
                    stage: 'draft',
                    completedAt: undefined,
                    stageWarnings: [PLANNED_MISSING_ASSETS_MESSAGE],
                };
            }

            return baseState;
        }
        case 'removeAsset': {
            const assets = state.assets.filter((asset) => asset.assetId !== action.assetId);
            if (assets.length === 0) {
                return {
                    ...state,
                    assets,
                    stage: 'draft',
                    stageWarnings: [PLANNED_MISSING_ASSETS_MESSAGE],
                    completedAt: undefined,
                };
            }

            return AutoCompleteIfFinished(state, assets);
        }
        case 'setAssetHold':
            return {
                ...state,
                assets: mapAssetStatus(state.assets, action.assetId, (asset) => ({
                    ...asset,
                    holdId: action.holdId,
                })),
            };
        case 'markAssetCompleted': {
            const occurredAt = action.occurredAt ?? nowIso();
            const assets = mapAssetStatus(state.assets, action.assetId, (asset) => ({
                ...asset,
                status: 'completed',
                completedAt: occurredAt,
                completedBy: action.completedBy?.id,
                completedByName: action.completedBy?.name,
                notes: action.notes ?? asset.notes,
            }));

            return AutoCompleteIfFinished(
                {
                    ...state,
                    stage: state.stage === 'draft' ? 'planned' : state.stage,
                    stageWarnings: [],
                },
                assets,
                occurredAt,
            );
        }
        case 'markAssetSkipped': {
            const occurredAt = action.timestamp ?? nowIso();
            const assets = mapAssetStatus(state.assets, action.assetId, (asset) => ({
                ...asset,
                status: 'skipped',
                completedAt: occurredAt,
                notes: action.reason ?? asset.notes,
            }));
            return AutoCompleteIfFinished(state, assets, occurredAt);
        }
        case 'markAssetPending': {
            const occurredAt = action.timestamp ?? nowIso();
            const assets = mapAssetStatus(state.assets, action.assetId, (asset) => ({
                ...asset,
                status: 'pending',
                completedAt: undefined,
                completedBy: undefined,
                completedByName: undefined,
                notes: action.reason ?? asset.notes,
            }));

            const baseState: MaintenancePlanInternalState = {
                ...state,
                assets,
                stageWarnings: [],
            };

            const remainingWarnings = validateReadyForCompletion(baseState);
            const stage: MaintenancePlanStage =
                baseState.stage === 'completed' ? 'planned' : baseState.stage;

            return {
                ...baseState,
                stage,
                completedAt: stage === baseState.stage ? baseState.completedAt : undefined,
                lastTransitionAt: stage === baseState.stage ? baseState.lastTransitionAt : occurredAt,
                stageWarnings: remainingWarnings,
            };
        }
        case 'advanceStage': {
            if (action.stage === 'draft') {
                return {
                    ...state,
                    stage: 'draft',
                    stageWarnings: [],
                    completedAt: undefined,
                    lastTransitionAt: action.timestamp ?? nowIso(),
                };
            }

            if (action.stage === 'planned') {
                const warnings = validateReadyForPlanned(state);
                if (warnings.length > 0) {
                    return { ...state, stageWarnings: warnings };
                }

                return {
                    ...state,
                    planId: state.planId ?? generatePlanId(),
                    stage: 'planned',
                    stageWarnings: [],
                    completedAt: undefined,
                    lastTransitionAt: action.timestamp ?? nowIso(),
                };
            }

            if (action.stage === 'completed') {
                const warnings = validateReadyForCompletion(state);
                if (warnings.length > 0) {
                    return { ...state, stageWarnings: warnings };
                }

                const completionTimestamp = action.timestamp ?? nowIso();
                return {
                    ...state,
                    stage: 'completed',
                    stageWarnings: [],
                    completedAt: completionTimestamp,
                    lastTransitionAt: completionTimestamp,
                };
            }

            return state;
        }
        default:
            return state;
    }
}

export interface MaintenancePlanStore {
    state: MaintenancePlanInternalState;
    dispatch: (action: MaintenancePlanAction) => void;
    resetPlan: () => void;
    setName: (name: string) => void;
    setDescription: (description: string) => void;
    setNotes: (notes: string) => void;
    setCompany: (company: SetCompanyPayload) => void;
    setIntervalRule: (intervalRule?: string | null) => void;
    updateSchedule: (schedule: MaintenancePlanSchedule) => void;
    addAssets: (assets: MaintenanceAssetInput[], replace?: boolean) => void;
    removeAsset: (assetId: string) => void;
    setAssetHold: (assetId: string, holdId: string | null) => void;
    markAssetCompleted: (payload: {
        assetId: string;
        completedBy?: CompletionActor;
        occurredAt?: string;
        notes?: string;
    }) => void;
    markAssetPending: (payload: { assetId: string; reason?: string; timestamp?: string }) => void;
    markAssetSkipped: (payload: { assetId: string; reason?: string; timestamp?: string }) => void;
    advanceStage: (stage: MaintenancePlanStage, timestamp?: string) => void;
}

export const useMaintenancePlanStore = create<MaintenancePlanStore>((set) => ({
    state: createInitialPlanState(),
    dispatch: (action) => {
        set((store) => ({
            state: maintenancePlanReducer(store.state, action),
        }));
    },
    resetPlan: () => set({ state: createInitialPlanState() }),
    setName: (name) => set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'setName', name }) })),
    setDescription: (description) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'setDescription', description }) })),
    setNotes: (notes) => set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'setNotes', notes }) })),
    setCompany: (company) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'setCompany', company }) })),
    setIntervalRule: (intervalRule) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'setIntervalRule', intervalRule }) })),
    updateSchedule: (schedule) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'updateSchedule', schedule }) })),
    addAssets: (assets, replace) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'addAssets', assets, replace }) })),
    removeAsset: (assetId) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'removeAsset', assetId }) })),
    setAssetHold: (assetId, holdId) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'setAssetHold', assetId, holdId }) })),
    markAssetCompleted: (payload) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'markAssetCompleted', ...payload }) })),
    markAssetPending: (payload) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'markAssetPending', ...payload }) })),
    markAssetSkipped: (payload) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'markAssetSkipped', ...payload }) })),
    advanceStage: (stage, timestamp) =>
        set((store) => ({ state: maintenancePlanReducer(store.state, { type: 'advanceStage', stage, timestamp }) })),
}));
