import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';
import type { HistoryEventSource } from '../../utils/history/types';
import { changeHistoryEntriesToEvents } from '../../utils/history/adapters';

const HISTORY_LIMIT = 100;

export function createBookingHistorySource(bookingId: string): HistoryEventSource {
    return {
        queryKey: ['history', 'booking', bookingId],
        queryFn: async () => {
            const provider = getChurchToolsStorageProvider();
            const entries = await provider.getChangeHistory('booking', bookingId, HISTORY_LIMIT);
            return changeHistoryEntriesToEvents(entries);
        },
        staleTime: 30_000,
    };
}
