import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyInheritanceService } from '../../services/PropertyInheritanceService';
import type { Asset, Kit } from '../../types/entities';
import type { InheritedTag } from '../../types/tag';
import type { CompoundActionInput } from '../../services/UndoService';

const BASE_DATE = new Date('2025-02-01T12:00:00.000Z');

function buildAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: overrides.id ?? 'asset-1',
    assetNumber: overrides.assetNumber ?? 'A-001',
    name: overrides.name ?? 'Fixture 1',
    assetType:
      overrides.assetType ??
      ({
        id: 'type-1',
        name: 'Lighting',
      } as Asset['assetType']),
    status: overrides.status ?? 'available',
    location: overrides.location,
    kitId: overrides.kitId,
    tagIds: overrides.tagIds,
    inheritedTagIds: overrides.inheritedTagIds,
    inheritedTags: overrides.inheritedTags,
    modelId: overrides.modelId,
    customFieldValues: overrides.customFieldValues ?? {},
    barcode: overrides.barcode ?? 'barcode-1',
    qrCode: overrides.qrCode ?? 'qr-1',
    createdBy: overrides.createdBy ?? 'user-1',
    createdByName: overrides.createdByName ?? 'Owner',
    createdAt: overrides.createdAt ?? BASE_DATE.toISOString(),
    lastModifiedBy: overrides.lastModifiedBy ?? 'user-1',
    lastModifiedByName: overrides.lastModifiedByName ?? 'Owner',
    lastModifiedAt: overrides.lastModifiedAt ?? BASE_DATE.toISOString(),
    isParent: overrides.isParent ?? false,
    schemaVersion: overrides.schemaVersion,
    ...overrides,
  } as Asset;
}

function buildKit(overrides: Partial<Kit> = {}): Kit {
  return {
    id: overrides.id ?? 'kit-1',
    name: overrides.name ?? 'Lighting Kit',
    description: overrides.description,
    type: overrides.type ?? 'fixed',
    location: overrides.location,
    status: overrides.status ?? 'available',
    tags: overrides.tags ?? [],
    inheritedProperties: overrides.inheritedProperties ?? [],
    completenessStatus: overrides.completenessStatus ?? 'complete',
    assemblyDate: overrides.assemblyDate ?? BASE_DATE.toISOString(),
    disassemblyDate: overrides.disassemblyDate,
    boundAssets: overrides.boundAssets ?? [],
    poolRequirements: overrides.poolRequirements,
    createdBy: overrides.createdBy ?? 'user-1',
    createdByName: overrides.createdByName ?? 'Owner',
    createdAt: overrides.createdAt ?? BASE_DATE.toISOString(),
    lastModifiedBy: overrides.lastModifiedBy ?? 'user-1',
    lastModifiedByName: overrides.lastModifiedByName ?? 'Owner',
    lastModifiedAt: overrides.lastModifiedAt ?? BASE_DATE.toISOString(),
    schemaVersion: overrides.schemaVersion,
  } as Kit;
}

interface StorageStub {
  getKit(id: string): Promise<Kit | null>;
  getAsset(id: string): Promise<Asset | null>;
  updateAsset(id: string, update: Partial<Asset>): Promise<Asset>;
}

interface TestContext {
  service: PropertyInheritanceService;
  kits: Map<string, Kit>;
  assets: Map<string, Asset>;
  storageProvider: StorageStub;
  recordCompoundUndoAction: ReturnType<typeof vi.fn<
    (action: CompoundActionInput) => Promise<string>
  >>;
}

function createTestContext(seed?: { kits?: Kit[]; assets?: Asset[] }): TestContext {
  const kits = new Map<string, Kit>((seed?.kits ?? []).map((kit) => [kit.id, kit]));
  const assets = new Map<string, Asset>((seed?.assets ?? []).map((asset) => [asset.id, asset]));

  const storageProvider: StorageStub = {
    getKit: vi.fn(async (id: string) => kits.get(id) ?? null),
    getAsset: vi.fn(async (id: string) => assets.get(id) ?? null),
    updateAsset: vi.fn(async (id: string, update: Partial<Asset>) => {
      const existing = assets.get(id);
      if (!existing) {
        throw new Error(`Asset ${id} not found`);
      }
      const next: Asset = {
        ...existing,
        ...update,
        lastModifiedAt: update.lastModifiedAt ?? BASE_DATE.toISOString(),
      };
      assets.set(id, next);
      return next;
    }),
  };

  const recordCompoundUndoAction = vi.fn<
    (action: CompoundActionInput) => Promise<string>
  >(async () => 'undo-1');

  const service = new PropertyInheritanceService({
    storageProvider,
    recordCompoundUndoAction,
    registerUndoHandler: vi.fn(),
    now: () => BASE_DATE,
  });

  return {
    service,
    kits,
    assets,
    storageProvider,
    recordCompoundUndoAction,
  };
}

describe('PropertyInheritanceService (T088-T095)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates inherited properties from kit configuration (T088)', async () => {
    const kit = buildKit({
      location: 'Main Hall',
      tags: ['tag-kit'],
      inheritedProperties: ['location', 'tags'],
      boundAssets: [
        {
          assetId: 'asset-1',
          assetNumber: 'A-001',
          name: 'Fixture 1',
          inherits: { location: true, tags: true },
        },
      ],
    });
    const asset = buildAsset({ id: 'asset-1', kitId: kit.id });
    const { service } = createTestContext({ kits: [kit], assets: [asset] });

    const inherited = await service.getInheritedProperties(asset.id, kit.id);

    expect(inherited).toEqual({ location: 'Main Hall', tags: ['tag-kit'] });
  });

  it('detects whether a property is inherited for an asset (T089)', async () => {
    const kit = buildKit({
      location: 'Studio',
      inheritedProperties: ['location'],
      boundAssets: [
        {
          assetId: 'asset-2',
          assetNumber: 'A-002',
          name: 'Fixture 2',
          inherits: { location: true },
        },
      ],
    });
    const asset = buildAsset({ id: 'asset-2', kitId: kit.id });
    const { service } = createTestContext({ kits: [kit], assets: [asset] });

    await expect(service.isPropertyInherited(asset.id, 'location')).resolves.toEqual({
      inherited: true,
      source: kit.name,
    });
    await expect(service.isPropertyInherited(asset.id, 'status')).resolves.toEqual({ inherited: false });
  });

  it('propagates location changes only to inheriting sub-assets (T090)', async () => {
    const kit = buildKit({
      inheritedProperties: ['location'],
      boundAssets: [
        {
          assetId: 'asset-1',
          assetNumber: 'A-001',
          name: 'Fixture 1',
          inherits: { location: true },
        },
        {
          assetId: 'asset-3',
          assetNumber: 'A-003',
          name: 'Fixture 3',
          inherits: { location: false },
        },
      ],
    });
    const asset1 = buildAsset({ id: 'asset-1', kitId: kit.id, location: 'Storage A' });
    const asset3 = buildAsset({ id: 'asset-3', kitId: kit.id, location: 'Storage B' });
    const { service, assets, recordCompoundUndoAction } = createTestContext({ kits: [kit], assets: [asset1, asset3] });

    const updatedIds = await service.propagateKitChange(kit.id, 'location', 'Warehouse B');

    expect(updatedIds).toEqual(['asset-1']);
    expect(assets.get('asset-1')?.location).toBe('Warehouse B');
    expect(assets.get('asset-3')?.location).toBe('Storage B');
    expect(recordCompoundUndoAction).toHaveBeenCalledTimes(1);
    const call = recordCompoundUndoAction.mock.calls[0][0];
    expect(call.createdEntityIds).toEqual(['asset-1']);
    expect(call.metadata).toMatchObject({
      kind: 'kit-property-propagation',
      kitId: kit.id,
      propertyName: 'location',
    });
    expect(call.beforeState).toMatchObject({
      kitId: kit.id,
      propertyName: 'location',
      assetSnapshots: [{ assetId: 'asset-1', previousValue: 'Storage A' }],
    });
  });

  it('propagates status changes across inheriting assets (T091)', async () => {
    const kit = buildKit({
      status: 'available',
      inheritedProperties: ['status'],
      boundAssets: [
        {
          assetId: 'asset-1',
          assetNumber: 'A-001',
          name: 'Fixture 1',
          inherits: { status: true },
        },
      ],
    });
    const asset1 = buildAsset({ id: 'asset-1', kitId: kit.id, status: 'available' });
    const { service, assets } = createTestContext({ kits: [kit], assets: [asset1] });

    const updatedIds = await service.propagateKitChange(kit.id, 'status', 'in-use');

    expect(updatedIds).toEqual(['asset-1']);
    expect(assets.get('asset-1')?.status).toBe('in-use');
  });

  it('propagates tag changes and preserves other inherited sources (T092)', async () => {
    const kit = buildKit({
      tags: ['kit-tag'],
      inheritedProperties: ['tags'],
      boundAssets: [
        {
          assetId: 'asset-1',
          assetNumber: 'A-001',
          name: 'Fixture 1',
          inherits: { tags: true },
        },
      ],
    });
    const initialTags: InheritedTag[] = [
      {
        tagId: 'model-tag',
        sourceType: 'model',
        sourceId: 'model-1',
        sourceName: 'Model A',
      },
    ];
    const asset1 = buildAsset({
      id: 'asset-1',
      kitId: kit.id,
      inheritedTags: initialTags,
      inheritedTagIds: initialTags.map((tag) => tag.tagId),
    });

    const { service, assets } = createTestContext({ kits: [kit], assets: [asset1] });

    await service.propagateKitChange(kit.id, 'tags', ['kit-tag']);

    const updated = assets.get('asset-1');
    expect(updated?.inheritedTags).toEqual([
      initialTags[0],
      {
        tagId: 'kit-tag',
        sourceType: 'kit',
        sourceId: kit.id,
        sourceName: kit.name,
      },
    ]);
    expect(updated?.inheritedTagIds).toEqual(['model-tag', 'kit-tag']);
  });

  it('unlocks inherited properties on disassembly (T093)', async () => {
    const kit = buildKit({
      inheritedProperties: ['location', 'tags'],
      boundAssets: [
        {
          assetId: 'asset-1',
          assetNumber: 'A-001',
          name: 'Fixture 1',
          inherits: { location: true, tags: true },
        },
      ],
    });
    const asset1 = buildAsset({
      id: 'asset-1',
      kitId: kit.id,
      location: 'Warehouse',
      inheritedTags: [
        {
          tagId: 'kit-tag',
          sourceType: 'kit',
          sourceId: kit.id,
          sourceName: kit.name,
        },
      ],
      inheritedTagIds: ['kit-tag'],
    });

    const { service, assets } = createTestContext({ kits: [kit], assets: [asset1] });

    await service.unlockInheritedProperties(kit.id);

    const unlocked = assets.get('asset-1');
    expect(unlocked?.kitId).toBeUndefined();
    expect(unlocked?.inheritedTags).toEqual([]);
    expect(unlocked?.inheritedTagIds).toEqual([]);
  });

  it('records compound undo actions for propagation (T094)', async () => {
    const kit = buildKit({
      inheritedProperties: ['status'],
      boundAssets: [
        {
          assetId: 'asset-1',
          assetNumber: 'A-001',
          name: 'Fixture 1',
          inherits: { status: true },
        },
        {
          assetId: 'asset-2',
          assetNumber: 'A-002',
          name: 'Fixture 2',
          inherits: { status: true },
        },
      ],
    });
    const asset1 = buildAsset({ id: 'asset-1', kitId: kit.id, status: 'available' });
    const asset2 = buildAsset({ id: 'asset-2', kitId: kit.id, status: 'available' });
    const { service, recordCompoundUndoAction } = createTestContext({ kits: [kit], assets: [asset1, asset2] });

    await service.propagateKitChange(kit.id, 'status', 'broken');

    expect(recordCompoundUndoAction).toHaveBeenCalledTimes(1);
    const payload = recordCompoundUndoAction.mock.calls[0][0];
    expect(payload.createdEntityIds).toEqual(['asset-1', 'asset-2']);
    expect(payload.beforeState).toMatchObject({
      assetSnapshots: [
        { assetId: 'asset-1', previousValue: 'available' },
        { assetId: 'asset-2', previousValue: 'available' },
      ],
    });
    expect(payload.afterState).toMatchObject({ newValue: 'broken' });
  });

  it('rejects propagation when property not configured for inheritance (T095)', async () => {
    const kit = buildKit({ inheritedProperties: [] });
    const asset = buildAsset({ id: 'asset-1', kitId: kit.id });
    const { service } = createTestContext({ kits: [kit], assets: [asset] });

    await expect(service.propagateKitChange(kit.id, 'location', 'Warehouse')).rejects.toThrow(
      /inherit/i,
    );
  });
});
