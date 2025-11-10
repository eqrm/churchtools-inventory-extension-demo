/**
 * TanStack Query hooks for stock take management
 * 
 * Provides React hooks for CRUD operations on stock take sessions
 * with automatic caching, refetching, and optimistic updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStorageProvider } from './useStorageProvider';
import type { StockTakeSessionCreate, StockTakeStatus, UUID } from '../types/entities';

/**
 * Query key factory for stock take operations
 * Centralizes query key generation for consistency
 */
export const stockTakeKeys = {
  all: ['stocktake'] as const,
  lists: () => [...stockTakeKeys.all, 'list'] as const,
  list: (filters?: { status?: StockTakeStatus }) => [...stockTakeKeys.lists(), { filters }] as const,
  details: () => [...stockTakeKeys.all, 'detail'] as const,
  detail: (id: string) => [...stockTakeKeys.details(), id] as const,
};

/**
 * Hook to fetch all stock take sessions
 * 
 * @param filters - Optional filters (status, etc.)
 * @returns Query result with array of stock take sessions
 * 
 * @example
 * ```tsx
 * const { data: sessions, isLoading } = useStockTakeSessions({ status: 'active' });
 * ```
 */
export function useStockTakeSessions(filters?: { status?: StockTakeStatus }) {
  const storage = useStorageProvider();

  return useQuery({
    queryKey: stockTakeKeys.list(filters),
    queryFn: async () => {
      if (!storage) {
        throw new Error('Storage provider not available');
      }
      const sessions = await storage.getStockTakeSessions(filters);
      return sessions;
    },
    enabled: !!storage,
  });
}

/**
 * Hook to fetch a single stock take session by ID
 * 
 * @param id - Stock take session ID
 * @returns Query result with stock take session data
 * 
 * @example
 * ```tsx
 * const { data: session } = useStockTakeSession(sessionId);
 * ```
 */
export function useStockTakeSession(id: string | undefined) {
  const storage = useStorageProvider();

  return useQuery({
    queryKey: id ? stockTakeKeys.detail(id) : ['stocktake', 'detail', 'none'],
    queryFn: async () => {
      if (!storage || !id) {
        throw new Error('Storage provider or ID not available');
      }
      const session = await storage.getStockTakeSession(id);
      return session;
    },
    enabled: !!storage && !!id,
  });
}

/**
 * Hook to create a new stock take session
 * 
 * Automatically invalidates stock take list queries on success
 * 
 * @returns Mutation object with mutate function
 * 
 * @example
 * ```tsx
 * const createSession = useCreateStockTakeSession();
 * 
 * createSession.mutate({
 *   scope: { type: 'category', assetTypeIds: ['cat-1'] },
 *   conductedBy: userId,
 *   conductedByName: userName,
 *   status: 'active',
 *   startDate: new Date().toISOString(),
 * });
 * ```
 */
export function useCreateStockTakeSession() {
  const storage = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StockTakeSessionCreate) => {
      if (!storage) {
        throw new Error('Storage provider not available');
      }
      const session = await storage.createStockTakeSession(data);
      return session;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stockTakeKeys.lists() });
    },
  });
}

/**
 * Hook to add a scanned asset to a stock take session
 * 
 * Automatically updates the session detail query with optimistic update
 * 
 * @returns Mutation object with mutate function
 * 
 * @example
 * ```tsx
 * const addScan = useAddStockTakeScan();
 * 
 * addScan.mutate({
 *   sessionId: 'session-123',
 *   assetId: 'asset-456',
 *   scannedBy: 'user-123',
 *   location: 'Main Hall',
 * });
 * ```
 */
export function useAddStockTakeScan() {
  const storage = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: UUID;
      assetId: UUID;
      scannedBy: string;
      location?: string;
    }) => {
      if (!storage) {
        throw new Error('Storage provider not available');
      }
      const session = await storage.addStockTakeScan(
        params.sessionId,
        params.assetId,
        params.scannedBy,
        params.location
      );
      return session;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the specific session to refresh data
      void queryClient.invalidateQueries({
        queryKey: stockTakeKeys.detail(variables.sessionId),
      });
    },
  });
}

/**
 * Hook to complete a stock take session
 * 
 * Calculates discrepancies and generates final report
 * Automatically invalidates both list and detail queries
 * 
 * @returns Mutation object with mutate function
 * 
 * @example
 * ```tsx
 * const completeSession = useCompleteStockTakeSession();
 * 
 * completeSession.mutate({ sessionId: 'session-123' });
 * ```
 */
export function useCompleteStockTakeSession() {
  const storage = useStorageProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: UUID }) => {
      if (!storage) {
        throw new Error('Storage provider not available');
      }
      const session = await storage.completeStockTakeSession(params.sessionId);
      return session;
    },
    onSuccess: (_data, variables) => {
      // Invalidate both list and detail
      void queryClient.invalidateQueries({ queryKey: stockTakeKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: stockTakeKeys.detail(variables.sessionId),
      });
    },
  });
}
