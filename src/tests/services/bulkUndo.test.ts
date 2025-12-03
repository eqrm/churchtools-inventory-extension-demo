/**
 * T8.3.1 - Bulk Undo Service Tests
 *
 * Tests for the bulk undo system that stores previous values
 * and allows undoing bulk operations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  BulkUndoService,
  type BulkUndoAction,
  type BulkUndoActionType,
  executeBulkUndo,
  type BulkUndoExecutor,
} from '../../services/BulkUndoService';

describe('BulkUndoService', () => {
  let service: BulkUndoService;

  beforeEach(() => {
    service = new BulkUndoService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    service.clear();
  });

  describe('registerBulkUndo', () => {
    it('should store a bulk action', () => {
      const action: Omit<BulkUndoAction, 'id' | 'timestamp'> = {
        type: 'status',
        description: 'Changed status to available',
        affectedAssets: [
          { assetId: 'asset-1', previousValue: { status: 'in-use' } },
          { assetId: 'asset-2', previousValue: { status: 'maintenance' } },
        ],
      };

      const id = service.registerBulkUndo(action);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should keep only last 10 actions (T8.3.1)', () => {
      // Register 12 actions
      for (let i = 0; i < 12; i++) {
        service.registerBulkUndo({
          type: 'status',
          description: `Action ${i}`,
          affectedAssets: [{ assetId: `asset-${i}`, previousValue: { status: 'available' } }],
        });
      }

      const actions = service.getActions();
      expect(actions.length).toBe(10);
      // Should keep the most recent, remove oldest
      expect(actions.find((a) => a.description === 'Action 0')).toBeUndefined();
      expect(actions.find((a) => a.description === 'Action 1')).toBeUndefined();
      expect(actions.find((a) => a.description === 'Action 11')).toBeDefined();
    });

    it('should assign unique IDs', () => {
      const id1 = service.registerBulkUndo({
        type: 'status',
        description: 'Action 1',
        affectedAssets: [],
      });
      const id2 = service.registerBulkUndo({
        type: 'status',
        description: 'Action 2',
        affectedAssets: [],
      });

      expect(id1).not.toBe(id2);
    });

    it('should record timestamp', () => {
      const now = new Date('2025-11-26T12:00:00Z');
      vi.setSystemTime(now);

      service.registerBulkUndo({
        type: 'location',
        description: 'Changed location',
        affectedAssets: [],
      });

      const actions = service.getActions();
      expect(actions[0].timestamp).toEqual(now);
    });
  });

  describe('getAction', () => {
    it('should retrieve action by ID', () => {
      const id = service.registerBulkUndo({
        type: 'tags',
        description: 'Added tags',
        affectedAssets: [{ assetId: 'asset-1', previousValue: { tags: [] } }],
      });

      const action = service.getAction(id);

      expect(action).toBeDefined();
      expect(action?.type).toBe('tags');
      expect(action?.affectedAssets.length).toBe(1);
    });

    it('should return undefined for non-existent ID', () => {
      const action = service.getAction('non-existent-id');
      expect(action).toBeUndefined();
    });
  });

  describe('removeAction', () => {
    it('should remove action from store', () => {
      const id = service.registerBulkUndo({
        type: 'delete',
        description: 'Deleted assets',
        affectedAssets: [],
      });

      expect(service.getAction(id)).toBeDefined();

      service.removeAction(id);

      expect(service.getAction(id)).toBeUndefined();
    });

    it('should not throw for non-existent ID', () => {
      expect(() => service.removeAction('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all actions', () => {
      service.registerBulkUndo({ type: 'status', description: 'A', affectedAssets: [] });
      service.registerBulkUndo({ type: 'location', description: 'B', affectedAssets: [] });

      expect(service.getActions().length).toBe(2);

      service.clear();

      expect(service.getActions().length).toBe(0);
    });
  });

  describe('action types', () => {
    const actionTypes: BulkUndoActionType[] = ['status', 'location', 'tags', 'customField', 'delete'];

    actionTypes.forEach((type) => {
      it(`should store ${type} action type`, () => {
        const id = service.registerBulkUndo({
          type,
          description: `Test ${type}`,
          affectedAssets: [{ assetId: 'asset-1', previousValue: {} }],
        });

        const action = service.getAction(id);
        expect(action?.type).toBe(type);
      });
    });
  });

  describe('affectedAssets structure', () => {
    it('should preserve previous values for status change', () => {
      const id = service.registerBulkUndo({
        type: 'status',
        description: 'Status change',
        affectedAssets: [
          { assetId: 'asset-1', previousValue: { status: 'available' } },
          { assetId: 'asset-2', previousValue: { status: 'in-use' } },
        ],
      });

      const action = service.getAction(id);
      expect(action?.affectedAssets[0].previousValue).toEqual({ status: 'available' });
      expect(action?.affectedAssets[1].previousValue).toEqual({ status: 'in-use' });
    });

    it('should preserve previous values for tag change', () => {
      const id = service.registerBulkUndo({
        type: 'tags',
        description: 'Tags change',
        affectedAssets: [
          { assetId: 'asset-1', previousValue: { tagIds: ['tag-1', 'tag-2'] } },
        ],
      });

      const action = service.getAction(id);
      expect(action?.affectedAssets[0].previousValue).toEqual({ tagIds: ['tag-1', 'tag-2'] });
    });

    it('should preserve previous values for delete (full asset data)', () => {
      const id = service.registerBulkUndo({
        type: 'delete',
        description: 'Delete assets',
        affectedAssets: [
          {
            assetId: 'asset-1',
            previousValue: {
              id: 'asset-1',
              name: 'Test Asset',
              status: 'available',
              assetNumber: 'AS-001',
            },
          },
        ],
      });

      const action = service.getAction(id);
      expect(action?.affectedAssets[0].previousValue).toHaveProperty('name', 'Test Asset');
    });
  });
});

// T8.3.3: Bulk Undo Execution Tests
describe('executeBulkUndo', () => {
  let service: BulkUndoService;
  let mockUpdateFn: BulkUndoExecutor;

  beforeEach(() => {
    service = new BulkUndoService();
    mockUpdateFn = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    service.clear();
  });

  it('should restore all assets to previous state (T8.3.3)', async () => {
    const actionId = service.registerBulkUndo({
      type: 'status',
      description: 'Status change',
      affectedAssets: [
        { assetId: 'asset-1', previousValue: { status: 'available' } },
        { assetId: 'asset-2', previousValue: { status: 'in-use' } },
      ],
    });

    const result = await executeBulkUndo(service, actionId, mockUpdateFn);

    expect(result.success).toBe(true);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
    expect(mockUpdateFn).toHaveBeenCalledTimes(2);
    expect(mockUpdateFn).toHaveBeenCalledWith('asset-1', { status: 'available' });
    expect(mockUpdateFn).toHaveBeenCalledWith('asset-2', { status: 'in-use' });
  });

  it('should handle partial failure (T8.3.3)', async () => {
    const actionId = service.registerBulkUndo({
      type: 'status',
      description: 'Status change',
      affectedAssets: [
        { assetId: 'asset-1', previousValue: { status: 'available' } },
        { assetId: 'asset-2', previousValue: { status: 'in-use' } },
        { assetId: 'asset-3', previousValue: { status: 'maintenance' } },
      ],
    });

    // First and third succeed, second fails
    mockUpdateFn = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Update failed'))
      .mockResolvedValueOnce(undefined);

    const result = await executeBulkUndo(service, actionId, mockUpdateFn);

    expect(result.success).toBe(false);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.failedAssets).toHaveLength(1);
    expect(result.failedAssets[0].assetId).toBe('asset-2');
    expect(result.failedAssets[0].error).toBe('Update failed');
  });

  it('should return error for non-existent action', async () => {
    const result = await executeBulkUndo(service, 'non-existent-id', mockUpdateFn);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Action not found');
    expect(mockUpdateFn).not.toHaveBeenCalled();
  });

  it('should remove action from store after successful undo', async () => {
    const actionId = service.registerBulkUndo({
      type: 'location',
      description: 'Location change',
      affectedAssets: [{ assetId: 'asset-1', previousValue: { locationId: 'loc-1' } }],
    });

    expect(service.getAction(actionId)).toBeDefined();

    await executeBulkUndo(service, actionId, mockUpdateFn);

    expect(service.getAction(actionId)).toBeUndefined();
  });

  it('should handle empty affected assets', async () => {
    const actionId = service.registerBulkUndo({
      type: 'tags',
      description: 'No assets affected',
      affectedAssets: [],
    });

    const result = await executeBulkUndo(service, actionId, mockUpdateFn);

    expect(result.success).toBe(true);
    expect(result.successCount).toBe(0);
    expect(mockUpdateFn).not.toHaveBeenCalled();
  });
});
