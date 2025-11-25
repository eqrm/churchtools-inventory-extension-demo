import { renderHook, act } from '@testing-library/react';
import { useCreateMaintenanceRule, useDeleteMaintenanceRule } from '../../hooks/useMaintenance';
import { useUndoStore } from '../../state/undoStore';
import { MaintenanceService } from '../../services/MaintenanceService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import React from 'react';
import type { MaintenanceRule } from '../../types/maintenance';

// Mock MaintenanceService
vi.mock('../../services/MaintenanceService');

// Mock useStorageProvider
vi.mock('../../hooks/useStorageProvider', () => ({
  useStorageProvider: () => ({}),
}));

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useMaintenance Undo Integration', () => {
  let queryClient: QueryClient;
  let mockService: Record<string, Mock>;

  beforeEach(() => {
    queryClient = new QueryClient();
    useUndoStore.getState().clear();
    vi.clearAllMocks();

    mockService = {
      createRule: vi.fn(),
      deleteRule: vi.fn(),
      updateRule: vi.fn(),
      createWorkOrder: vi.fn(),
      deleteWorkOrder: vi.fn(),
    };

    (MaintenanceService as unknown as Mock).mockImplementation(() => mockService);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should push undo action when creating a rule', async () => {
    const newRule = { id: 'rule-1', name: 'Test Rule' };
    mockService.createRule.mockResolvedValue(newRule);

    const { result } = renderHook(() => useCreateMaintenanceRule(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Test Rule' } as unknown as Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt'>);
    });

    const { past } = useUndoStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].label).toBe('undo.createMaintenanceRule');

    // Test Undo
    await act(async () => {
      await past[0].undo();
    });

    expect(mockService.deleteRule).toHaveBeenCalledWith('rule-1');
  });

  it('should push undo action when deleting a rule', async () => {
    const rule = { id: 'rule-1', name: 'Test Rule' };
    queryClient.setQueryData(['maintenance', 'rules', 'rule-1'], rule);
    mockService.deleteRule.mockResolvedValue(undefined);
    mockService.createRule.mockResolvedValue({ ...rule, id: 'rule-2' });

    const { result } = renderHook(() => useDeleteMaintenanceRule(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('rule-1');
    });

    const { past } = useUndoStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].label).toBe('undo.deleteMaintenanceRule');

    // Test Undo
    await act(async () => {
      await past[0].undo();
    });

    expect(mockService.createRule).toHaveBeenCalled();
  });
});
