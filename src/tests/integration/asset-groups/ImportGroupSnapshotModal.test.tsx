import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, userEvent, waitFor, createTestQueryClient } from '../../utils/custom-render';
import { ImportGroupSnapshotModal } from '../../../components/asset-groups/ImportGroupSnapshotModal';
import type { Asset, AssetGroup } from '../../../types/entities';
import type { IStorageProvider } from '../../../types/storage';
import { notifications } from '@mantine/notifications';
import { DEFAULT_ASSET_GROUP_INHERITANCE_RULES } from '../../../services/asset-groups/constants';

const updateAssetGroupMock = vi.fn<IStorageProvider['updateAssetGroup']>();
const addAssetToGroupMock = vi.fn<IStorageProvider['addAssetToGroup']>();
const getGroupMembersMock = vi.fn<IStorageProvider['getGroupMembers']>();
const removeAssetFromGroupMock = vi.fn<IStorageProvider['removeAssetFromGroup']>();

const mockProvider: Partial<IStorageProvider> = {
  updateAssetGroup: updateAssetGroupMock,
  addAssetToGroup: addAssetToGroupMock,
  getGroupMembers: getGroupMembersMock,
  removeAssetFromGroup: removeAssetFromGroupMock,
};

vi.mock('../../../hooks/useStorageProvider', () => ({
  useStorageProvider: () => mockProvider as IStorageProvider,
}));

describe('ImportGroupSnapshotModal', () => {
  const now = new Date().toISOString();
  const baseGroup: AssetGroup = {
    id: 'group-1',
    groupNumber: 'AG-001',
    name: 'Production Mics',
    barcode: '7000001',
    category: { id: 'cat-1', name: 'Microphones' },
    manufacturer: 'Shure',
    model: 'SM58',
    modelNumber: 'SM58-LC',
    description: 'Base description',
    inheritanceRules: { ...DEFAULT_ASSET_GROUP_INHERITANCE_RULES },
    sharedCustomFields: { warrantyEnd: '2026-01-01' },
    customFieldRules: {},
    memberAssetIds: [],
    memberCount: 0,
    createdBy: 'user-1',
    createdByName: 'Admin',
    createdAt: now,
    lastModifiedBy: 'user-1',
    lastModifiedByName: 'Admin',
    lastModifiedAt: now,
    schemaVersion: '1'
  };

  type NotificationShow = (typeof notifications)['show'];
  let notificationsSpy: MockInstance<NotificationShow>;

  beforeEach(() => {
  updateAssetGroupMock.mockReset();
  addAssetToGroupMock.mockReset();
  getGroupMembersMock.mockReset();
  removeAssetFromGroupMock.mockReset();
  notificationsSpy = vi.spyOn(notifications, 'show');
  });

  afterEach(() => {
    notificationsSpy.mockRestore();
  });

  it('imports snapshot data and updates group configuration', async () => {
    updateAssetGroupMock.mockResolvedValue({ ...baseGroup });
    addAssetToGroupMock.mockResolvedValue({} as Asset);
    getGroupMembersMock.mockResolvedValue([]);

    const snapshot = {
      version: 1,
      exportedAt: now,
      group: {
        description: 'Snapshot description',
        manufacturer: 'Snapshot Manufacturer',
        model: 'Snapshot Model',
        inheritanceRules: {
          description: { inherited: false, overridable: true },
        },
        customFieldRules: {
          cf_manualUrl: { inherited: true, overridable: false },
        },
        sharedCustomFields: {
          manualUrl: 'https://example.com/manual.pdf',
        },
      },
      members: [
        { id: 'asset-1', assetNumber: 'AST-001', name: 'Mic 1' },
        { id: 'asset-2', assetNumber: 'AST-002', name: 'Mic 2' },
      ],
    };

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const onClose = vi.fn();

    render(
      <ImportGroupSnapshotModal group={baseGroup} opened onClose={onClose} />,
      { queryClient }
    );

    const file = new File([JSON.stringify(snapshot)], 'snapshot.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: () => Promise.resolve(JSON.stringify(snapshot)),
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
  expect(fileInput).not.toBeNull();
  if (!fileInput) throw new Error('Snapshot file input not rendered');
  await userEvent.upload(fileInput, file);
    await screen.findByText('2 members listed in snapshot');

    await userEvent.click(screen.getByRole('button', { name: 'Import Snapshot' }));

    await waitFor(() => {
      expect(updateAssetGroupMock).toHaveBeenCalledTimes(1);
    });

    const [groupId, payload] = updateAssetGroupMock.mock.calls[0];
    expect(groupId).toBe(baseGroup.id);
    expect(payload).toMatchObject({
      description: 'Snapshot description',
      manufacturer: 'Snapshot Manufacturer',
      model: 'Snapshot Model',
      sharedCustomFields: snapshot.group.sharedCustomFields,
      customFieldRules: snapshot.group.customFieldRules,
    });
    expect(payload?.inheritanceRules).toMatchObject({
      ...DEFAULT_ASSET_GROUP_INHERITANCE_RULES,
      ...snapshot.group.inheritanceRules,
    });

    expect(addAssetToGroupMock).toHaveBeenCalledTimes(2);
    expect(addAssetToGroupMock).toHaveBeenNthCalledWith(1, 'asset-1', baseGroup.id);
    expect(addAssetToGroupMock).toHaveBeenNthCalledWith(2, 'asset-2', baseGroup.id);
    expect(getGroupMembersMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(notificationsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Model imported', color: 'green' })
    );

    queryClient.clear();
  });

  it('removes members not present when toggle is enabled', async () => {
    updateAssetGroupMock.mockResolvedValue({ ...baseGroup });
    addAssetToGroupMock.mockResolvedValue({} as Asset);
    getGroupMembersMock.mockResolvedValue([
      { id: 'asset-orphan' } as Asset,
    ]);
    removeAssetFromGroupMock.mockResolvedValue({} as Asset);

    const snapshot = {
      group: {
        description: 'Another description',
        inheritanceRules: {},
      },
      members: [{ id: 'asset-1', name: 'Mic 1' }],
    };

    const queryClient = createTestQueryClient();
    const onClose = vi.fn();

    render(
      <ImportGroupSnapshotModal group={baseGroup} opened onClose={onClose} />,
      { queryClient }
    );

    const file = new File([JSON.stringify(snapshot)], 'snapshot.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: () => Promise.resolve(JSON.stringify(snapshot)),
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    if (!fileInput) throw new Error('Snapshot file input not rendered');
    await userEvent.upload(fileInput, file);
    await screen.findByText('1 member listed in snapshot');

    const removeSwitch = screen.getByRole('switch', {
      name: /Remove members not present in snapshot/i,
    });
    await userEvent.click(removeSwitch);

    await userEvent.click(screen.getByRole('button', { name: 'Import Snapshot' }));

    await waitFor(() => {
      expect(removeAssetFromGroupMock).toHaveBeenCalledWith('asset-orphan');
    });

    queryClient.clear();
  });
});
