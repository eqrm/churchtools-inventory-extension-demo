import { create } from 'zustand';
import type { DemoMetadataRecord } from './db';
import {
    initializeOfflineDb,
    loadDemoMetadata,
    saveDemoMetadata,
} from './db';

export type DemoMetadataStatus = 'idle' | 'loading' | 'ready' | 'error';

interface DemoMetadataState {
    status: DemoMetadataStatus;
    metadata: DemoMetadataRecord | null;
    error: unknown;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    markModalDismissed: () => Promise<void>;
    clearModalDismissed: () => Promise<void>;
}

async function fetchMetadata(): Promise<DemoMetadataRecord> {
    await initializeOfflineDb();
    return await loadDemoMetadata();
}

async function updateMetadata(patch: Partial<DemoMetadataRecord>): Promise<DemoMetadataRecord> {
    await saveDemoMetadata(patch);
    return await loadDemoMetadata();
}

export const useDemoMetadataStore = create<DemoMetadataState>((set, get) => ({
    status: 'idle',
    metadata: null,
    error: null,
    async load() {
        const currentStatus = get().status;
        if (currentStatus === 'loading') {
            return;
        }

        set({ status: 'loading', error: null });

        try {
            const metadata = await fetchMetadata();
            set({ metadata, status: 'ready', error: null });
        } catch (error) {
            set({ error, status: 'error' });
        }
    },
    async refresh() {
        try {
            const metadata = await fetchMetadata();
            set({ metadata, status: 'ready', error: null });
        } catch (error) {
            set({ error, status: 'error' });
        }
    },
    async markModalDismissed() {
        try {
            const now = new Date().toISOString();
            const metadata = await updateMetadata({ modalDismissedAt: now });
            set({ metadata, status: 'ready', error: null });
        } catch (error) {
            set({ error, status: 'error' });
            throw error;
        }
    },
    async clearModalDismissed() {
        try {
            const metadata = await updateMetadata({ modalDismissedAt: null });
            set({ metadata, status: 'ready', error: null });
        } catch (error) {
            set({ error, status: 'error' });
            throw error;
        }
    },
}));
