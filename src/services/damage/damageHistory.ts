import { DamageService } from '../DamageService';
import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';
import { damageReportsToEvents } from '../../utils/history/damageAdapter';
import type { HistoryEventSource } from '../../utils/history/types';

/**
 * Creates a history event source for damage reports of a specific asset
 * @param assetId The asset ID to fetch damage reports for
 * @returns A HistoryEventSource that fetches and adapts damage reports to history events
 */
export function createDamageHistorySource(assetId: string): HistoryEventSource {
    return {
        queryKey: ['history', 'damage', assetId],
        queryFn: async () => {
            const provider = getChurchToolsStorageProvider();
            const damageService = new DamageService({ storageProvider: provider });
            const reports = await damageService.getRepairHistory(assetId);
            return damageReportsToEvents(reports);
        },
        staleTime: 30_000,
    };
}
