/**
 * T8.3.2 - useBulkUndo Hook Tests
 *
 * Tests for the bulk undo hook that integrates with notifications.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { useBulkUndo } from '../../hooks/useBulkUndo';
import { resetBulkUndoService, getBulkUndoService } from '../../services/BulkUndoService';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
        return result;
      }
      return key;
    },
  }),
}));

// Mock notifications
const mockShow = vi.fn();
const mockHide = vi.fn();
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: (params: unknown) => mockShow(params),
    hide: (id: string) => mockHide(id),
  },
  Notifications: () => null,
}));

// Mock useUpdateAsset
const mockMutateAsync = vi.fn();
vi.mock('../../hooks/useAssets', () => ({
  useUpdateAsset: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

describe('useBulkUndo', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.useFakeTimers();
    mockShow.mockClear();
    mockHide.mockClear();
    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue({});
    resetBulkUndoService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should register a bulk action and return action ID', () => {
    const { result } = renderHook(() => useBulkUndo(), { wrapper });

    let actionId = '';
    act(() => {
      actionId = result.current.registerBulkAction(
        'status',
        'Changed status',
        [{ assetId: 'asset-1', previousValue: { status: 'available' } }],
      );
    });

    expect(actionId).toBeDefined();
    expect(typeof actionId).toBe('string');
  });

  it('should show undo notification when action is registered (T8.3.2)', () => {
    const { result } = renderHook(() => useBulkUndo(), { wrapper });

    act(() => {
      result.current.registerBulkAction(
        'status',
        'Changed status to available',
        [{ assetId: 'asset-1', previousValue: { status: 'in-use' } }],
      );
    });

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Changed status to available',
        message: 'assets:bulkActions.clickToUndo',
        color: 'blue',
        autoClose: 10000,
        withCloseButton: true,
      }),
    );
  });

  it('should store action in BulkUndoService', () => {
    const { result } = renderHook(() => useBulkUndo(), { wrapper });
    const service = getBulkUndoService();

    let actionId = '';
    act(() => {
      actionId = result.current.registerBulkAction(
        'location',
        'Changed location',
        [{ assetId: 'asset-1', previousValue: { locationId: 'loc-1' } }],
      );
    });

    const storedAction = service.getAction(actionId);
    expect(storedAction).toBeDefined();
    expect(storedAction?.type).toBe('location');
    expect(storedAction?.affectedAssets).toHaveLength(1);
  });

  it('should execute undo and restore previous values (T8.3.3)', async () => {
    const { result } = renderHook(() => useBulkUndo(), { wrapper });

    let actionId = '';
    act(() => {
      actionId = result.current.registerBulkAction(
        'status',
        'Changed status',
        [
          { assetId: 'asset-1', previousValue: { status: 'available' } },
          { assetId: 'asset-2', previousValue: { status: 'in-use' } },
        ],
      );
    });

    await act(async () => {
      const undoResult = await result.current.undoAction(actionId);
      expect(undoResult.success).toBe(true);
      expect(undoResult.successCount).toBe(2);
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: 'asset-1',
      data: { status: 'available' },
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: 'asset-2',
      data: { status: 'in-use' },
    });
  });

  it('should hide original notification and show success after undo', async () => {
    const { result } = renderHook(() => useBulkUndo(), { wrapper });

    let actionId = '';
    act(() => {
      actionId = result.current.registerBulkAction(
        'status',
        'Changed status',
        [{ assetId: 'asset-1', previousValue: { status: 'available' } }],
      );
    });

    mockShow.mockClear(); // Clear the initial notification call

    await act(async () => {
      await result.current.undoAction(actionId);
    });

    // Should hide original undo notification
    expect(mockHide).toHaveBeenCalledWith(`bulk-undo-${actionId}`);

    // Should show success notification
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'assets:bulkActions.undoSuccess',
        color: 'green',
      }),
    );
  });

  it('should handle undo failure gracefully', async () => {
    const { result } = renderHook(() => useBulkUndo(), { wrapper });
    mockMutateAsync.mockRejectedValue(new Error('Update failed'));

    let actionId = '';
    act(() => {
      actionId = result.current.registerBulkAction(
        'status',
        'Changed status',
        [{ assetId: 'asset-1', previousValue: { status: 'available' } }],
      );
    });

    mockShow.mockClear();

    await act(async () => {
      const undoResult = await result.current.undoAction(actionId);
      expect(undoResult.success).toBe(false);
      expect(undoResult.failureCount).toBe(1);
    });

    // Should show failure notification
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'assets:bulkActions.undoFailed',
        color: 'red',
      }),
    );
  });

  it('should remove action from service after timeout', async () => {
    const { result } = renderHook(() => useBulkUndo(), { wrapper });
    const service = getBulkUndoService();

    let actionId = '';
    act(() => {
      actionId = result.current.registerBulkAction(
        'tags',
        'Added tags',
        [{ assetId: 'asset-1', previousValue: { tagIds: [] } }],
      );
    });

    expect(service.getAction(actionId)).toBeDefined();

    // Fast-forward past the timeout (10s + 1s buffer)
    await act(async () => {
      vi.advanceTimersByTime(11000);
    });

    expect(service.getAction(actionId)).toBeUndefined();
  });
});
