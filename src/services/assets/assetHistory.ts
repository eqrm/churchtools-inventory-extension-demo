import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';
import { changeHistoryEntriesToEvents } from '../../utils/history/adapters';
import type { HistoryEventSource } from '../../utils/history/types';

const HISTORY_LIMIT = 200;

export function createAssetHistorySource(assetId: string): HistoryEventSource {
    return {
        queryKey: ['history', 'asset', assetId],
        queryFn: async () => {
            const provider = getChurchToolsStorageProvider();
            const entries = await provider.getChangeHistory('asset', assetId, HISTORY_LIMIT);
            return changeHistoryEntriesToEvents(entries);
        },
        staleTime: 30_000,
    };
}
