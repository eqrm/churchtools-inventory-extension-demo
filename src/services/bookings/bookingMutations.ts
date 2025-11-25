import type { QueryClient } from '@tanstack/react-query';
import { changeHistoryEntriesToEvents } from '../../utils/history/adapters';
import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';
import type { HistoryEvent } from '../../utils/history/types';

const HISTORY_LIMIT = 100;

export const bookingHistoryQueryKey = (bookingId: string) => ['history', 'booking', bookingId] as const;

export async function syncBookingHistory(queryClient: QueryClient, bookingId: string): Promise<void> {
  if (!bookingId) return;

  try {
    const provider = getChurchToolsStorageProvider();
    const entries = await provider.getChangeHistory('booking', bookingId, HISTORY_LIMIT);
    const events = changeHistoryEntriesToEvents(entries);

    queryClient.setQueryData<HistoryEvent[]>(bookingHistoryQueryKey(bookingId), events);
  } catch (error) {
    // As a fallback, invalidate the query so consumers can refetch when possible.
    queryClient.invalidateQueries({ queryKey: bookingHistoryQueryKey(bookingId) }).catch(() => {
      /* noop */
    });
  if (process.env['NODE_ENV'] !== 'production') {
      console.warn('[bookingMutations] Failed to sync booking history cache', error);
    }
  }
}
