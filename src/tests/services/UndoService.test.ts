import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UndoService, type UndoHandler, type UndoServiceOptions } from '../../services/UndoService';
import { getUndoDatabase } from '../../services/db/UndoDatabase';
import type { UndoAction, UndoActionType } from '../../types/undo';

const BASE_DATE = new Date('2025-01-01T00:00:00.000Z');
const ONE_HOUR_MS = 60 * 60 * 1000;

interface TestContext {
  service: UndoService;
  options: UndoServiceOptions;
  handlers: Partial<Record<UndoActionType, UndoHandler>>;
  advanceTime: (hours: number) => void;
  setNow: (date: Date) => void;
}

function createTestContext(overrides: Partial<UndoServiceOptions> = {}): TestContext {
  const db = getUndoDatabase();
  let currentTime = BASE_DATE.getTime();
  let idCounter = 0;

  const handlers: Partial<Record<UndoActionType, UndoHandler>> = overrides.handlers ?? {};

  const options: UndoServiceOptions = {
    db,
    getCurrentActor: async () => ({ id: 'user-123', name: 'Test User' }),
    handlers,
    idFactory: () => `undo-${++idCounter}`,
    now: () => new Date(currentTime),
    retentionHours: 24,
    ...overrides,
  };

  return {
    service: new UndoService(options),
    options,
    handlers,
    advanceTime: (hours: number) => {
      currentTime += hours * ONE_HOUR_MS;
    },
    setNow: (date: Date) => {
      currentTime = date.getTime();
    },
  };
}

describe('UndoService (T021-T036)', () => {
  beforeEach(async () => {
    const db = getUndoDatabase();
    await db.undoActions.clear();
  });

  it('records a simple action with actor, timestamps, and default status (T021)', async () => {
    const { service, options } = createTestContext();
    const actionId = await service.recordAction({
      entityType: 'asset',
      entityId: 'asset-001',
      actionType: 'update',
      beforeState: { name: 'Old Name' },
      afterState: { name: 'New Name' },
      metadata: { source: 'unit-test' },
    });

    expect(actionId).toBe('undo-1');

    const stored = await options.db.undoActions.get(actionId);
    expect(stored).toBeDefined();
    expect(stored).toMatchObject({
      actionId,
      actorId: 'user-123',
      entityType: 'asset',
      entityId: 'asset-001',
      actionType: 'update',
      undoStatus: 'pending',
      beforeState: { name: 'Old Name' },
      afterState: { name: 'New Name' },
      metadata: { source: 'unit-test' },
    });

    expect(stored?.createdAt).toBe(BASE_DATE.toISOString());
    expect(stored?.expiresAt).toBe(new Date(BASE_DATE.getTime() + 24 * ONE_HOUR_MS).toISOString());
  });

  it('records a compound action including created entity IDs (T022)', async () => {
    const { service, options } = createTestContext();

    const actionId = await service.recordCompoundAction({
      entityType: 'kit',
      entityId: 'kit-001',
      actionType: 'compound',
      beforeState: null,
      afterState: { kitName: 'Lighting Kit' },
      createdEntityIds: ['asset-101', 'asset-102'],
    });

    expect(actionId).toBe('undo-1');

    const stored = await options.db.undoActions.get(actionId);
    expect(stored?.createdEntityIds).toEqual(['asset-101', 'asset-102']);
    expect(stored?.actionType).toBe('compound');
  });

  it.each([
    ['create' as const, null, { name: 'Asset' }],
    ['update' as const, { name: 'Old' }, { name: 'New' }],
    ['delete' as const, { name: 'Asset' }, null],
  ])('invokes the %s undo handler and marks action as reverted (T023)', async (actionType, beforeState, afterState) => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { service, options } = createTestContext({
      handlers: { [actionType]: handler },
    });

    const actionId = await service.recordAction({
      entityType: 'asset',
      entityId: `asset-${actionType}`,
      actionType,
      beforeState,
      afterState,
    });

    const result = await service.undoAction(actionId);

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ actionId, actionType }));

    const stored = await options.db.undoActions.get(actionId);
    expect(stored?.undoStatus).toBe('reverted');
  });

  it('rejects undoing an expired action (T024)', async () => {
    const { service, options, advanceTime } = createTestContext();

    const actionId = await service.recordAction({
      entityType: 'asset',
      entityId: 'asset-expired',
      actionType: 'update',
      beforeState: { status: 'available' },
      afterState: { status: 'in-maintenance' },
    });

    advanceTime(25); // move current time beyond 24-hour retention

    await expect(service.undoAction(actionId)).rejects.toThrow('Undo action has expired');

    const stored = await options.db.undoActions.get(actionId);
    expect(stored?.undoStatus).toBe('pending');
  });

  it('rejects undoing an action that is already reverted (T025)', async () => {
    const { service, options } = createTestContext();

    const actionId = await service.recordAction({
      entityType: 'asset',
      entityId: 'asset-reverted',
      actionType: 'delete',
      beforeState: { deleted: false },
      afterState: null,
    });

    await options.db.undoActions.update(actionId, { undoStatus: 'reverted' });

    await expect(service.undoAction(actionId)).rejects.toThrow('Undo action already applied');
  });

  it('returns the current user history limited to 50 most recent actions (T026)', async () => {
    const { service, options, advanceTime } = createTestContext();

    // Insert actions for another user that should be ignored
    const otherAction: UndoAction = {
      actionId: 'other-action',
      actorId: 'user-999',
      actorName: 'Other User',
      entityType: 'asset',
      entityId: 'asset-other',
      actionType: 'update',
      beforeState: { foo: 'bar' },
      afterState: { foo: 'baz' },
      createdAt: new Date(BASE_DATE.getTime() - ONE_HOUR_MS).toISOString(),
      expiresAt: new Date(BASE_DATE.getTime() + ONE_HOUR_MS).toISOString(),
      undoStatus: 'pending',
      metadata: undefined,
    };
    await options.db.undoActions.add(otherAction);

    // Create 55 actions for the current user (should be truncated to 50)
    for (let i = 0; i < 55; i += 1) {
      advanceTime(1);
      await service.recordAction({
        entityType: 'asset',
        entityId: `asset-${i}`,
        actionType: 'update',
        beforeState: { version: i },
        afterState: { version: i + 1 },
      });
    }

    const history = await service.getUserUndoHistory(50);

    expect(history).toHaveLength(50);
  expect(history.every((action: UndoAction) => action.actorId === 'user-123')).toBe(true);
  const timestamps = history.map((action: UndoAction) => new Date(action.createdAt).getTime());
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps); // ensure descending order
  });

  it('removes only expired actions during cleanup (T027)', async () => {
    const { service, options, advanceTime } = createTestContext();

    const expiredId = await service.recordAction({
      entityType: 'asset',
      entityId: 'asset-expired-cleanup',
      actionType: 'delete',
      beforeState: { qty: 2 },
      afterState: null,
    });

    advanceTime(26); // move beyond retention before creating a fresh action

    const activeId = await service.recordAction({
      entityType: 'asset',
      entityId: 'asset-active',
      actionType: 'update',
      beforeState: { qty: 1 },
      afterState: { qty: 2 },
    });

    const removed = await service.cleanupExpired();
    expect(removed).toBeGreaterThanOrEqual(1);

    const activeAction = await options.db.undoActions.get(activeId);
    const expiredAction = await options.db.undoActions.get(expiredId);

    expect(activeAction).toBeDefined();
    expect(expiredAction).toBeUndefined();
  });
});
