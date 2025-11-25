import { renderHook, act } from '@testing-library/react';
import { useCreateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { useUndoStore } from '../../state/undoStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import type { Asset } from '../../types/entities';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockProvider = {
  createAsset: vi.fn(),
  deleteAsset: vi.fn(),
  updateAsset: vi.fn(),
  getAsset: vi.fn(),
};

vi.mock('../../hooks/useStorageProvider', () => ({
  useStorageProvider: () => mockProvider,
}));

describe('useAssets Undo Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    useUndoStore.getState().clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should push undo action when creating an asset', async () => {
    const newAsset = { id: 'asset-1', name: 'Test Asset' };
    mockProvider.createAsset.mockResolvedValue(newAsset);

    const { result } = renderHook(() => useCreateAsset(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Test Asset' } as unknown as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
    });

    const { past } = useUndoStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].label).toBe('undo.createAsset');

    // Test Undo
    await act(async () => {
      await past[0].undo();
    });

    expect(mockProvider.deleteAsset).toHaveBeenCalledWith('asset-1');
  });

  it('should push undo action when deleting an asset', async () => {
    const asset = { id: 'asset-1', name: 'Test Asset' };
    queryClient.setQueryData(['assets', 'detail', 'asset-1'], asset);
    mockProvider.deleteAsset.mockResolvedValue(undefined);
    mockProvider.createAsset.mockResolvedValue({ ...asset, id: 'asset-2' });

    const { result } = renderHook(() => useDeleteAsset(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('asset-1');
    });

    const { past } = useUndoStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].label).toBe('undo.deleteAsset');

    // Test Undo
    await act(async () => {
      await past[0].undo();
    });

    expect(mockProvider.createAsset).toHaveBeenCalled();
  });
});
