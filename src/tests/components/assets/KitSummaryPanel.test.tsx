import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../types/entities';
import type { Tag, InheritedTag } from '../../../types/tag';
import { KitSummaryPanel } from '../../../components/assets/KitSummaryPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.sourceName) {
        return `${key}:${String(params.sourceName)}`;
      }
      return key;
    },
  }),
}));

function createKitAsset(partial: Partial<Asset> = {}): Asset {
  return {
    id: 'kit-1',
    assetNumber: 'KIT-001',
    name: 'Broadcast Kit',
    manufacturer: undefined,
    model: undefined,
    description: 'Live stream essentials',
    mainImage: undefined,
    assetType: { id: 'type-kit', name: 'Kit' },
    status: 'available',
    location: 'Studio',
    kitId: '1',
    modelId: undefined,
    tagIds: [],
    inheritedTagIds: [],
    inheritedTags: [],
    currentAssignmentId: undefined,
    inUseBy: undefined,
    bookable: true,
    isKit: true,
    kitType: 'fixed',
    kitInheritedProperties: ['location', 'status'],
    kitCompletenessStatus: 'complete',
    kitAssemblyDate: '2025-01-01T00:00:00.000Z',
    kitDisassemblyDate: null,
    kitBoundAssets: [
      { assetId: 'a1', assetNumber: 'A-001', name: 'Camera' },
      { assetId: 'a2', assetNumber: 'A-002', name: 'Tripod' },
      { assetId: 'a3', assetNumber: 'A-003', name: 'Monitor' },
      { assetId: 'a4', assetNumber: 'A-004', name: 'Cables' },
      { assetId: 'a5', assetNumber: 'A-005', name: 'Mixer' },
    ],
    kitPoolRequirements: [],
    photos: [],
    isParent: false,
    parentAssetId: undefined,
    childAssetIds: [],
    barcode: 'KIT-001-BAR',
    qrCode: 'KIT-001-QR',
    barcodeHistory: [],
    assetGroup: undefined,
    fieldSources: undefined,
    customFieldValues: {},
    createdBy: '1',
    createdByName: 'Admin',
    createdAt: '2025-01-02T00:00:00.000Z',
    lastModifiedBy: '1',
    lastModifiedByName: 'Admin',
    lastModifiedAt: '2025-01-03T00:00:00.000Z',
    schemaVersion: '1',
    isAvailable: true,
    currentBooking: undefined,
    nextMaintenance: undefined,
    ...partial,
  } satisfies Asset;
}

function createTag(partial: Partial<Tag> = {}): Tag {
  return {
    id: partial.id ?? `tag-${Math.random().toString(36).slice(2)}`,
    name: partial.name ?? 'Tag',
    color: partial.color ?? 'blue',
    description: partial.description,
    createdBy: partial.createdBy ?? 'user-1',
    createdByName: partial.createdByName ?? 'Admin',
    createdAt: partial.createdAt ?? '2025-01-01T00:00:00.000Z',
  } satisfies Tag;
}

function createInheritedTag(partial: Partial<InheritedTag> = {}): InheritedTag {
  return {
    tagId: partial.tagId ?? 'tag-inherited',
    sourceType: partial.sourceType ?? 'kit',
    sourceId: partial.sourceId ?? 'kit-source',
    sourceName: partial.sourceName ?? 'Source Kit',
  } satisfies InheritedTag;
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('KitSummaryPanel', () => {
  it('renders kit metadata, barcode, members, and tags', () => {
    const asset = createKitAsset();
    const directTags: Tag[] = [createTag({ id: 't1', name: 'Live', color: 'green' })];
    const inheritedTags: Array<{ tag: Tag; inheritedFrom: InheritedTag }> = [
      {
        tag: createTag({ id: 't2', name: 'Video', color: 'blue' }),
        inheritedFrom: createInheritedTag({ sourceId: 'kit-1', sourceName: 'Base Kit', tagId: 't2' }),
      },
    ];

    render(
      <KitSummaryPanel asset={asset} directTags={directTags} inheritedTags={inheritedTags} />, 
      { wrapper },
    );

    expect(screen.getByTestId('kit-summary-panel')).toBeInTheDocument();
    expect(screen.getByText('Broadcast Kit')).toBeInTheDocument();
    expect(screen.getByText('KIT-001')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
    expect(screen.getByText('A-001')).toBeInTheDocument();
    expect(screen.getByText('+1 more members')).toBeInTheDocument();
    expect(screen.getByText('KIT-001-BAR')).toBeInTheDocument();
    expect(screen.getByText('Properties inherited by members')).toBeInTheDocument();
    expect(screen.getByText('location')).toBeInTheDocument();
    expect(screen.getByText('Tags & inheritance')).toBeInTheDocument();
  });

  it('returns null for non-kit assets', () => {
    const asset = createKitAsset({ isKit: false });
    render(
      <KitSummaryPanel asset={asset} directTags={[]} inheritedTags={[]} />,
      { wrapper },
    );

    expect(screen.queryByTestId('kit-summary-panel')).not.toBeInTheDocument();
  });
});
