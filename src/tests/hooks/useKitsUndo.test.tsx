import { renderHook, act, waitFor } from '@testing-library/react';
import { useCreateKit, useDeleteKit } from '../../hooks/useKits';
import { useUndoStore } from '../../state/undoStore';
import { KitService } from '../../services/KitService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock KitService
vi.mock('../../services/KitService');

// Mock useStorageProvider to return a dummy
vi.mock('../../hooks/useStorageProvider', () => ({
  useStorageProvider: () => ({}),
}));

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useKits Undo Integration', () => {
  let queryClient: QueryClient;
  let mockKitService: any;

  beforeEach(() => {
    queryClient = new QueryClient();
    useUndoStore.getState().clear();
    vi.clearAllMocks();

    mockKitService = {
      createKit: vi.fn(),
      deleteKit: vi.fn(),
      updateKit: vi.fn(),
      disassembleKit: vi.fn(),
      assembleKit: vi.fn(),
    };

    // Mock the constructor of KitService to return our mock
    (KitService as any).mockImplementation(() => mockKitService);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should push undo action when creating a kit', async () => {
    const newKit = { id: 'kit-1', name: 'Test Kit' };
    mockKitService.createKit.mockResolvedValue(newKit);

    const { result } = renderHook(() => useCreateKit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Test Kit', type: 'fixed' } as any);
    });

    const { past } = useUndoStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].label).toBe('undo.createKit');

    // Test Undo
    await act(async () => {
      await past[0].undo();
    });

    expect(mockKitService.deleteKit).toHaveBeenCalledWith('kit-1');
  });

  it('should push undo action when deleting a kit', async () => {
    const kit = { id: 'kit-1', name: 'Test Kit' };
    queryClient.setQueryData(['kits', 'detail', 'kit-1'], kit);
    mockKitService.deleteKit.mockResolvedValue(undefined);
    mockKitService.createKit.mockResolvedValue({ ...kit, id: 'kit-2' }); // Restored with new ID

    const { result } = renderHook(() => useDeleteKit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('kit-1');
    });

    const { past } = useUndoStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].label).toBe('undo.deleteKit');

    // Test Undo
    await act(async () => {
      await past[0].undo();
    });

    expect(mockKitService.createKit).toHaveBeenCalled();
  });
});
