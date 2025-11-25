import { describe, it, expect, beforeEach } from 'vitest';
import { ChurchToolsStorageProvider } from '../ChurchToolsProvider';
import { createMockChurchToolsApi } from './mockChurchToolsApiClient';
import type { SavedViewCreate } from '../../../types/entities';

const MODULE_ID = '42';

const baseSavedView = (overrides: Partial<SavedViewCreate> = {}): SavedViewCreate => ({
  name: 'Default View',
  ownerId: 'user-1',
  ownerName: 'Test User',
  isPublic: false,
  viewMode: 'table',
  filters: [],
  ...overrides,
});

describe('ChurchToolsStorageProvider - Saved Views', () => {
  let mockApi: ReturnType<typeof createMockChurchToolsApi>;
  let provider: ChurchToolsStorageProvider;

  beforeEach(() => {
    mockApi = createMockChurchToolsApi(MODULE_ID);
    provider = new ChurchToolsStorageProvider(MODULE_ID, mockApi.client);
  });

  it('creates saved views and filters by owner/public visibility', async () => {
    await provider.createSavedView(baseSavedView({ name: 'Owner View' }));
    await provider.createSavedView(
      baseSavedView({
        name: 'Public View',
        ownerId: 'user-2',
        ownerName: 'Another User',
        isPublic: true,
      }),
    );

    const viewsForOwner = await provider.getSavedViews('user-1');
    expect(viewsForOwner.map((view) => view.name)).toEqual(expect.arrayContaining(['Owner View', 'Public View']));
  });

  it('updates saved views when requested by owner', async () => {
    const created = await provider.createSavedView(baseSavedView({ name: 'Needs Rename' }));

    const updated = await provider.updateSavedView(created.id, { name: 'Renamed View' });
    expect(updated.name).toBe('Renamed View');
  });

  it('prevents deleting saved views by non-owners', async () => {
    const created = await provider.createSavedView(
      baseSavedView({ ownerId: 'user-2', ownerName: 'Another User', name: 'Foreign View' }),
    );

    await expect(provider.deleteSavedView(created.id)).rejects.toThrow('Only the view owner can delete this view');
  });
});
