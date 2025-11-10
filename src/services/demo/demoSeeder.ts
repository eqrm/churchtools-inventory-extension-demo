import type {
    Asset,
    AssetType,
    AssetCreate,
    AssetPrefix,
    Booking,
    BookingCreate,
    CustomFieldDefinition,
    CustomFieldValue,
    Kit,
    KitCreate,
    MaintenanceRecord,
    MaintenanceRecordCreate,
    PersonInfo,
    StockTakeSession,
    StockTakeSessionCreate,
    StockTakeStatus,
    ChangeHistoryEntry,
    FieldChange,
} from '../../types/entities';
import type { IStorageProvider } from '../../types/storage';
import {
    initializeOfflineDb,
    loadDemoMetadata,
    saveDemoMetadata,
    tagDemoEntity,
    listDemoEntities,
    untagDemoEntity,
    offlineDb,
} from '../../state/offline/db';
import { getChurchToolsStorageProvider } from '../churchTools/storageProvider';
import { ensureDemoToolsEnabled } from '../../utils/environment/flags';
import {
    createMasterDataItem,
    getMasterDataDefinition,
    persistMasterData,
    sortMasterDataItems,
    type MasterDataEntity,
} from '../../utils/masterData';

const DEMO_SEED_VERSION = '2025-10-demo-expanded-v3';

const PERSON_CACHE_STORAGE_PREFIX = 'person_cache_';
const PERSON_CACHE_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

const DEFAULT_DEMO_PERSON: PersonInfo = {
    id: 'demo-person-steward',
    firstName: 'Taylor',
    lastName: 'Rivera',
    name: 'Taylor Rivera',
    email: 'taylor.rivera@example.com',
    avatarUrl: undefined,
};

const DEMO_HISTORY_ACTORS: Array<{ id: string; name: string }> = [
    { id: 'demo-anna-berger', name: 'Anna Berger' },
    { id: 'demo-leon-kraemer', name: 'Leon Krämer' },
    { id: 'demo-samir-patel', name: 'Samir Patel' },
];

function getSafeLocalStorage(): Storage | null {
    if (typeof globalThis === 'undefined') {
        return null;
    }

    try {
        const candidate = (globalThis as unknown as { localStorage?: Storage }).localStorage;
        return candidate ?? null;
    } catch {
        return null;
    }
}

function toPersonCacheSearchText(person: Pick<PersonInfo, 'firstName' | 'lastName' | 'email'>): string {
    return [person.firstName, person.lastName, person.email]
        .filter(Boolean)
        .map(entry => entry?.toLowerCase() ?? '')
        .join(' ')
        .trim();
}

function resolvePersonOrFallback(person?: PersonInfo | null): PersonInfo {
    if (person?.id) {
        const name = person.name || [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
        return { ...person, name };
    }

    return DEFAULT_DEMO_PERSON;
}

function getHistoryActor(index: number): { id: string; name: string } {
    if (DEMO_HISTORY_ACTORS.length === 0) {
        throw new Error('No demo history actors configured');
    }

    const normalizedIndex = ((index % DEMO_HISTORY_ACTORS.length) + DEMO_HISTORY_ACTORS.length) %
        DEMO_HISTORY_ACTORS.length;

    const actor = DEMO_HISTORY_ACTORS[normalizedIndex];

    if (!actor) {
        throw new Error('Invalid demo history actor index');
    }

    return actor;
}

async function seedPersonReferenceCaches(person: PersonInfo): Promise<void> {
    const storage = getSafeLocalStorage();
    if (storage) {
        try {
            const now = new Date();
            const displayName = person.name || [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
            storage.setItem(
                `${PERSON_CACHE_STORAGE_PREFIX}${person.id}`,
                JSON.stringify({
                    person: {
                        id: person.id,
                        firstName: person.firstName ?? '',
                        lastName: person.lastName ?? '',
                        email: person.email ?? '',
                        avatarUrl: person.avatarUrl ?? null,
                        displayName,
                    },
                    cachedAt: now.toISOString(),
                    expiresAt: new Date(now.getTime() + PERSON_CACHE_STORAGE_TTL_MS).toISOString(),
                }),
            );
        } catch (error) {
            console.warn('[demoSeeder] Failed to seed person localStorage cache', error);
        }
    }

    try {
        const nowIso = new Date().toISOString();
        const searchText = toPersonCacheSearchText(person);
        const existingRecord = await offlineDb.personCache.get(person.id);

        if (existingRecord) {
            await offlineDb.personCache.update(person.id, {
                firstName: person.firstName ?? '',
                lastName: person.lastName ?? '',
                email: person.email,
                avatarUrl: person.avatarUrl,
                lastUsed: nowIso,
                searchText,
            });
        } else {
            await offlineDb.personCache.put({
                id: person.id,
                firstName: person.firstName ?? '',
                lastName: person.lastName ?? '',
                email: person.email,
                avatarUrl: person.avatarUrl,
                lastUsed: nowIso,
                searchText,
            });
        }
    } catch (error) {
        console.warn('[demoSeeder] Failed to seed offline person cache', error);
    }
}

type DemoSeederProvider = {
    provider?: IStorageProvider;
    person?: PersonInfo | null;
    now?: () => string;
    force?: boolean;
};

type AssetTypeSeed = {
    slug: string;
    name: string;
    icon?: string;
    assetNameTemplate: string;
    description?: string;
    customFields: CustomFieldDefinition[];
};

type AssetPrefixSeed = {
    slug: string;
    prefix: string;
    description: string;
    color: string;
};

type ChildAssetSeed = {
    slug: string;
    name: string;
    manufacturer?: string;
    model?: string;
    description?: string;
    status?: Asset['status'];
    bookable?: boolean;
    location?: string;
};

type AssetSeed = {
    slug: string;
    assetTypeSlug: string;
    prefixSlug?: string;
    name: string;
    manufacturer?: string;
    model?: string;
    description?: string;
    status?: Asset['status'];
    bookable?: boolean;
    location?: string;
    isParent?: boolean;
    children?: ChildAssetSeed[];
};

type KitPoolRequirementSeed = {
    quantity: number;
    assetTypeSlug?: string;
    parentAssetSlug?: string;
    filters?: Record<string, unknown>;
};

type KitSeed = {
    slug: string;
    name: string;
    description?: string;
    type: Kit['type'];
    boundAssetSlugs?: string[];
    poolRequirements?: KitPoolRequirementSeed[];
};

type BookingSeed = {
    slug: string;
    assetSlug?: string;
    kitSlug?: string;
    status?: Booking['status'];
    bookingMode?: Booking['bookingMode'];
    startOffsetDays: number;
    endOffsetDays: number;
    startTime?: string;
    endTime?: string;
    purpose: string;
    notes?: string;
};

type MaintenanceSeed = {
    slug: string;
    assetSlug: string;
    type: MaintenanceRecord['type'];
    dateOffsetDays: number;
    description: string;
    notes?: string;
    cost?: number;
    nextDueOffsetDays?: number;
};

type StockTakeSeed = {
    slug: string;
    status: StockTakeStatus;
    startOffsetDays: number;
    nameReason?: string;
    scope:
        | { type: 'all' }
        | { type: 'assetType'; assetTypeSlugs: string[] }
        | { type: 'location'; locations: string[] }
        | { type: 'custom'; assetSlugs: string[] };
};

interface DemoSeedOutcome {
    assetTypes: AssetType[];
    assets: Asset[];
    assetPrefixes: AssetPrefix[];
    bookings: Booking[];
    kits: Kit[];
    maintenanceRecords: MaintenanceRecord[];
    stockTakes: StockTakeSession[];
    seededAt: string;
    seedVersion: string;
}

interface DemoResetOutcome {
    removedEntities: number;
    errors: Array<{ entityId: string; entityType: string; error: Error }>;
    resetAt: string;
}

const MASTER_DATA_SEEDS: Record<MasterDataEntity, string[]> = {
    locations: [
        'Sanctuary Booth',
        'Audio Closet',
        'Production Closet',
        'Hospitality Counter',
        'Storage Room B',
        'Workshop Cabinet',
        'Portable Storage',
    ],
    manufacturers: [
        'Panasonic',
        'Shure',
        'ComfortSeat',
        'Bosch',
        'Keurig',
        'Blackmagic Design',
        'LG',
        'BrightPrint',
        'LiftMaster',
    ],
    models: [
        'GH6',
        'QLXD2/B58',
        'CS-500',
        'GBH 2-26',
        'K-3500',
        'ATEM Television Studio HD8',
        'LGPF-55',
        'HOSP-BNDL',
        'CSC-48',
        'BP-WSK',
        'LM-12',
    ],
    maintenanceCompanies: ['TechCare Services', 'CleanOps Facility', 'BrightSpark Electrical'],
};

const ASSET_TYPE_SEEDS: AssetTypeSeed[] = [
    {
        slug: 'electronics',
        name: 'Electronics & AV',
        icon: 'IconDeviceTvOld',
        assetNameTemplate: '%Manufacturer% %Model% (%Asset Number%)',
        description: 'Video, audio, and streaming equipment',
        customFields: [
            { id: 'cf-electronics-serial', name: 'Serial Number', type: 'text', required: true },
            { id: 'cf-electronics-purchase-date', name: 'Purchase Date', type: 'date', required: true },
            {
                id: 'cf-electronics-service-tier',
                name: 'Service Tier',
                type: 'select',
                required: true,
                options: ['Standard', 'Premium', 'Rental'],
            },
            { id: 'cf-electronics-calibration', name: 'Requires Calibration', type: 'checkbox', required: false },
            { id: 'cf-electronics-manual', name: 'Documentation URL', type: 'url', required: false },
            { id: 'cf-electronics-steward', name: 'Department Steward', type: 'person-reference', required: false },
        ],
    },
    {
        slug: 'furniture',
        name: 'Furniture',
        icon: 'IconSofa',
        assetNameTemplate: '%Model% – %Asset Number%',
        description: 'Chairs, tables, staging, and decor',
        customFields: [
            {
                id: 'cf-furniture-color',
                name: 'Finish / Color',
                type: 'select',
                required: true,
                options: ['Charcoal', 'Walnut', 'White Oak', 'Slate'],
            },
            { id: 'cf-furniture-weight', name: 'Weight (kg)', type: 'number', required: false },
            { id: 'cf-furniture-care', name: 'Care Instructions', type: 'long-text', required: false },
            {
                id: 'cf-furniture-approved-rooms',
                name: 'Approved Rooms',
                type: 'multi-select',
                required: false,
                options: ['Sanctuary', 'Lobby', 'Cafe', 'Classrooms'],
            },
        ],
    },
    {
        slug: 'work-tools',
        name: 'Work Tools',
        icon: 'IconTools',
        assetNameTemplate: '%Manufacturer% %Model% (%Asset Number%)',
        description: 'Facilities and maintenance gear',
        customFields: [
            { id: 'cf-tools-service-interval', name: 'Service Interval (days)', type: 'number', required: false },
            { id: 'cf-tools-last-service', name: 'Last Service Date', type: 'date', required: false },
            { id: 'cf-tools-safety-notes', name: 'Safety Notes', type: 'long-text', required: false },
            { id: 'cf-tools-portable', name: 'Portable', type: 'checkbox', required: false },
        ],
    },
    {
        slug: 'appliances',
        name: 'Appliances',
        icon: 'IconFridge',
        assetNameTemplate: '%Model% – %Asset Number%',
        description: 'Hospitality and kitchen appliances',
        customFields: [
            { id: 'cf-appliance-warranty', name: 'Warranty Expires On', type: 'date', required: false },
            {
                id: 'cf-appliance-power',
                name: 'Power Requirements',
                type: 'select',
                options: ['120V / 15A', '120V / 20A', '240V / 30A'],
                required: false,
            },
            {
                id: 'cf-appliance-cleaning',
                name: 'Cleaning Checklist',
                type: 'multi-select',
                options: ['Descale', 'Filter Replace', 'Sanitize'],
                required: false,
            },
        ],
    },
];

const ASSET_PREFIX_SEEDS: AssetPrefixSeed[] = [
    { slug: 'cam', prefix: 'CAM', description: 'Camera & video gear', color: '#0ea5e9' },
    { slug: 'aud', prefix: 'AUD', description: 'Audio & stage equipment', color: '#6366f1' },
    { slug: 'fur', prefix: 'FUR', description: 'Furniture and fixtures', color: '#a855f7' },
];

const ASSET_SEEDS: AssetSeed[] = [
    {
        slug: 'demo-camera',
        assetTypeSlug: 'electronics',
        prefixSlug: 'cam',
        name: 'Panasonic GH6 Camera',
        manufacturer: 'Panasonic',
        model: 'GH6',
        description: 'Primary streaming camera with 12-35mm lens',
        status: 'available',
        bookable: true,
        location: 'Sanctuary Booth',
    },
    {
        slug: 'demo-microphone',
        assetTypeSlug: 'electronics',
        prefixSlug: 'aud',
        name: 'Shure Wireless Microphone',
        manufacturer: 'Shure',
        model: 'QLXD2/B58',
        description: 'Handheld microphone for hosts and speakers',
        status: 'available',
        bookable: true,
        location: 'Audio Closet',
    },
    {
        slug: 'demo-streaming-rack',
        assetTypeSlug: 'electronics',
        prefixSlug: 'cam',
        name: 'Weekend Streaming Rack',
        manufacturer: 'Blackmagic Design',
        model: 'ATEM Rig',
        description: 'Mobile rack with switcher, encoder, and monitors',
        status: 'available',
        bookable: false,
        location: 'Production Closet',
        isParent: true,
        children: [
            {
                slug: 'demo-streaming-switcher',
                name: 'ATEM Television Studio HD8',
                manufacturer: 'Blackmagic Design',
                model: 'HD8',
                status: 'available',
                bookable: false,
                location: 'Production Closet',
            },
            {
                slug: 'demo-streaming-monitor',
                name: 'LG Program Confidence Monitor',
                manufacturer: 'LG',
                model: 'LGPF-55',
                status: 'available',
                bookable: false,
                location: 'Production Closet',
            },
        ],
    },
    {
        slug: 'demo-folding-chair',
        assetTypeSlug: 'furniture',
        prefixSlug: 'fur',
        name: 'Stackable Folding Chair',
        manufacturer: 'ComfortSeat',
        model: 'CS-500',
        description: 'Charcoal padded chairs for events',
        status: 'available',
        bookable: false,
        location: 'Storage Room B',
    },
    {
        slug: 'demo-hospitality-kit',
        assetTypeSlug: 'furniture',
        prefixSlug: 'fur',
        name: 'Hospitality Display Bundle',
        manufacturer: 'ComfortSeat',
        model: 'HOSP-BNDL',
        description: 'Modular hospitality fixtures with signage and carts',
        status: 'available',
        bookable: false,
        location: 'Hospitality Counter',
        isParent: true,
        children: [
            {
                slug: 'demo-hospitality-table',
                name: 'Walnut Hospitality Table',
                manufacturer: 'ComfortSeat',
                model: 'WT-180',
                status: 'available',
                bookable: false,
                location: 'Hospitality Counter',
            },
            {
                slug: 'demo-hospitality-cart',
                name: 'Coffee Service Cart',
                manufacturer: 'ComfortSeat',
                model: 'CSC-48',
                status: 'available',
                bookable: false,
                location: 'Hospitality Counter',
            },
            {
                slug: 'demo-hospitality-signage',
                name: 'Welcome Signage Kit',
                manufacturer: 'BrightPrint',
                model: 'BP-WSK',
                status: 'available',
                bookable: false,
                location: 'Hospitality Counter',
            },
        ],
    },
    {
        slug: 'demo-drill',
        assetTypeSlug: 'work-tools',
        name: 'Bosch Hammer Drill',
        manufacturer: 'Bosch',
        model: 'GBH 2-26',
        description: 'Rotary hammer with SDS chuck',
        status: 'available',
        bookable: false,
        location: 'Workshop Cabinet',
    },
    {
        slug: 'demo-scissor-lift',
        assetTypeSlug: 'work-tools',
        name: 'Portable Scissor Lift',
        manufacturer: 'LiftMaster',
        model: 'LM-12',
        description: 'Battery powered scissor lift for stage lighting work',
        status: 'in-use',
        bookable: false,
        location: 'Portable Storage',
    },
    {
        slug: 'demo-coffee-maker',
        assetTypeSlug: 'appliances',
        name: 'Keurig Commercial Brewer',
        manufacturer: 'Keurig',
        model: 'K-3500',
        description: 'Lobby coffee station brewer with dual water lines',
        status: 'in-use',
        bookable: false,
        location: 'Hospitality Counter',
    },
];

const KIT_SEEDS: KitSeed[] = [
    {
        slug: 'streaming-kit',
        name: 'Weekend Streaming Kit',
        description: 'Camera, wireless audio, and switcher for weekend services',
        type: 'fixed',
        boundAssetSlugs: ['demo-camera', 'demo-microphone', 'demo-streaming-switcher'],
    },
    {
        slug: 'hospitality-kit',
        name: 'Hospitality Pop-Up Kit',
        description: 'Tables and appliances for event hospitality',
        type: 'flexible',
        poolRequirements: [
            { parentAssetSlug: 'demo-hospitality-kit', quantity: 2 },
        ],
    },
];

const BOOKING_SEEDS: BookingSeed[] = [
    {
        slug: 'camera-youth-conference',
        assetSlug: 'demo-camera',
        status: 'completed',
        bookingMode: 'date-range',
        startOffsetDays: -10,
        endOffsetDays: -8,
        purpose: 'Youth conference livestream recording',
        notes: 'Returned with fully charged batteries.',
    },
    {
        slug: 'camera-weekend-stream',
        assetSlug: 'demo-camera',
        status: 'approved',
        bookingMode: 'date-range',
        startOffsetDays: 5,
        endOffsetDays: 7,
        purpose: 'Weekend main service broadcast',
        notes: 'Ensure lens cleaned on Friday walkthrough.',
    },
    {
        slug: 'hospitality-event',
        kitSlug: 'hospitality-kit',
        status: 'pending',
        bookingMode: 'single-day',
        startOffsetDays: 2,
        endOffsetDays: 2,
        startTime: '08:00',
        endTime: '14:00',
        purpose: 'Newcomer luncheon hospitality setup',
        notes: 'Needs lobby prep by facility team.',
    },
];

const MAINTENANCE_SEEDS: MaintenanceSeed[] = [
    {
        slug: 'camera-cleaning',
        assetSlug: 'demo-camera',
        type: 'cleaning',
        dateOffsetDays: -6,
        description: 'Sensor cleaning and firmware update to v2.1',
        notes: 'Performed in production booth. No issues.',
        nextDueOffsetDays: 45,
    },
    {
        slug: 'drill-service',
        assetSlug: 'demo-drill',
        type: 'repair',
        dateOffsetDays: -20,
        description: 'Replaced worn chuck and calibrated hammer mode',
        cost: 45,
        notes: 'Tool ready for deployment.',
        nextDueOffsetDays: 90,
    },
    {
        slug: 'coffee-descaling',
        assetSlug: 'demo-coffee-maker',
        type: 'inspection',
        dateOffsetDays: 8,
        description: 'Scheduled quarterly descaling service with CleanOps',
        notes: 'Remind hospitality lead to empty drip tray night before.',
        nextDueOffsetDays: 120,
    },
];

type ChangeHistorySeed = {
    entityType: ChangeHistoryEntry['entityType'];
    entitySlug: string;
    action: ChangeHistoryEntry['action'];
    actorIndex?: number;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    changes?: FieldChange[];
};

const CHANGE_HISTORY_SEEDS: ChangeHistorySeed[] = [
    {
        entityType: 'asset',
        entitySlug: 'demo-camera',
        action: 'updated',
        actorIndex: 0,
        changes: [
            { field: 'location', oldValue: 'Audio Closet', newValue: 'Sanctuary Booth' },
            { field: 'status', oldValue: 'maintenance', newValue: 'available' },
        ],
    },
    {
        entityType: 'asset',
        entitySlug: 'demo-hospitality-kit',
        action: 'status-changed',
        actorIndex: 1,
        fieldName: 'status',
        oldValue: 'available',
        newValue: 'in-use',
        changes: [{ field: 'status', oldValue: 'available', newValue: 'in-use' }],
    },
    {
        entityType: 'kit',
        entitySlug: 'hospitality-kit',
        action: 'updated',
        actorIndex: 2,
        changes: [
            {
                field: 'poolRequirements',
                oldValue: 'Category pool: Furniture (3)',
                newValue: 'Parent asset pool: Hospitality Display Bundle (2)',
            },
        ],
    },
    {
        entityType: 'booking',
        entitySlug: 'camera-weekend-stream',
        action: 'booked',
        actorIndex: 1,
        changes: [
            { field: 'status', oldValue: 'pending', newValue: 'approved' },
            { field: 'notes', oldValue: 'Awaiting approvals', newValue: 'Ensure lens cleaned on Friday walkthrough.' },
        ],
    },
    {
        entityType: 'booking',
        entitySlug: 'camera-youth-conference',
        action: 'checked-in',
        actorIndex: 2,
        changes: [
            { field: 'status', oldValue: 'active', newValue: 'completed' },
            { field: 'conditionOnCheckIn', oldValue: 'Fair', newValue: 'Excellent' },
        ],
    },
    {
        entityType: 'maintenance',
        entitySlug: 'camera-cleaning',
        action: 'maintenance-performed',
        actorIndex: 0,
        changes: [
            { field: 'description', oldValue: 'Scheduled quarterly cleaning', newValue: 'Sensor cleaning and firmware update to v2.1' },
            { field: 'notes', oldValue: 'Pending technician confirmation', newValue: 'Performed in production booth. No issues.' },
        ],
    },
];

const STOCK_TAKE_SEEDS: StockTakeSeed[] = [
    {
        slug: 'electronics-q4-audit',
        status: 'completed',
        startOffsetDays: -14,
        nameReason: 'Quarterly electronics audit',
        scope: { type: 'assetType', assetTypeSlugs: ['electronics'] },
    },
    {
        slug: 'hospitality-refresh',
        status: 'active',
        startOffsetDays: -1,
        nameReason: 'Hospitality prep spot check',
        scope: { type: 'location', locations: ['Hospitality Counter', 'Storage Room B'] },
    },
];

function resolveNow(now?: () => string): string {
    if (typeof now === 'function') {
        return now();
    }
    return new Date().toISOString();
}

function addDays(base: Date, offset: number): Date {
    const copy = new Date(base);
    copy.setDate(copy.getDate() + offset);
    return copy;
}

function toISODate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function resolveSeededBy(person?: PersonInfo | null): string | null {
    if (!person) return null;
    if (person.name) return person.name;
    const parts = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    if (parts) return parts;
    return person.id ?? null;
}

async function ensureOfflineReady(): Promise<void> {
    await initializeOfflineDb();
}

async function resolveProvider(options?: DemoSeederProvider): Promise<IStorageProvider> {
    if (options?.provider) {
        return options.provider;
    }
    return getChurchToolsStorageProvider();
}

async function resolvePerson(provider: IStorageProvider, fallback?: PersonInfo | null): Promise<PersonInfo | null> {
    try {
        return await provider.getCurrentUser();
    } catch (error) {
        console.warn('[demoSeeder] Failed to resolve current user, falling back to provided person', error);
        return fallback ?? null;
    }
}

function buildAssetPayload(
    assetType: AssetType,
    seed: AssetSeed | ChildAssetSeed,
    options?: { prefixId?: string; parentAssetId?: string; isParent?: boolean; customFieldValues?: Record<string, CustomFieldValue> },
): AssetCreate {
    return {
        name: seed.name,
        manufacturer: seed.manufacturer,
        model: seed.model,
        description: seed.description,
        assetType: {
            id: assetType.id,
            name: assetType.name,
            icon: assetType.icon,
        },
        status: seed.status ?? 'available',
        location: seed.location,
        isParent: options?.isParent ?? false,
        parentAssetId: options?.parentAssetId,
        childAssetIds: [],
        bookable: seed.bookable ?? true,
        customFieldValues: options?.customFieldValues ?? {},
        prefixId: options?.prefixId,
    };
}

function buildCustomFieldValues(slug: string, baseDate: Date, person: PersonInfo | null): Record<string, CustomFieldValue> {
    switch (slug) {
        case 'demo-camera':
            return {
                'cf-electronics-serial': 'GH6-2024-013',
                'cf-electronics-purchase-date': toISODate(addDays(baseDate, -280)),
                'cf-electronics-service-tier': 'Premium',
                'cf-electronics-calibration': true,
                'cf-electronics-manual': 'https://pro-av.panasonic.net/manual/gh6',
                'cf-electronics-steward': person?.id ?? '',
            };
        case 'demo-microphone':
            return {
                'cf-electronics-serial': 'QLXD2-58-044',
                'cf-electronics-purchase-date': toISODate(addDays(baseDate, -520)),
                'cf-electronics-service-tier': 'Standard',
                'cf-electronics-calibration': false,
                'cf-electronics-manual': 'https://www.shure.com/en-US/products/microphones/qlxd2-b58',
                'cf-electronics-steward': person?.id ?? '',
            };
        case 'demo-streaming-rack':
            return {
                'cf-electronics-serial': 'ATEM-RACK-01',
                'cf-electronics-purchase-date': toISODate(addDays(baseDate, -190)),
                'cf-electronics-service-tier': 'Premium',
                'cf-electronics-calibration': true,
                'cf-electronics-manual': 'https://www.blackmagicdesign.com/products/atemtelevisionstudio',
                'cf-electronics-steward': person?.id ?? '',
            };
        case 'demo-streaming-switcher':
            return {
                'cf-electronics-serial': 'ATEM-SW-HD8-4482',
                'cf-electronics-purchase-date': toISODate(addDays(baseDate, -185)),
                'cf-electronics-service-tier': 'Premium',
                'cf-electronics-calibration': true,
                'cf-electronics-manual': 'https://manuals.blackmagicdesign.com/atem-swtv-hd8',
                'cf-electronics-steward': person?.id ?? '',
            };
        case 'demo-streaming-monitor':
            return {
                'cf-electronics-serial': 'LGPF55-2024-07',
                'cf-electronics-purchase-date': toISODate(addDays(baseDate, -170)),
                'cf-electronics-service-tier': 'Standard',
                'cf-electronics-calibration': false,
                'cf-electronics-manual': 'https://www.lg.com/us/business/support/product/lg-55-inch-monitor',
                'cf-electronics-steward': person?.id ?? '',
            };
        case 'demo-folding-chair':
            return {
                'cf-furniture-color': 'Charcoal',
                'cf-furniture-weight': 6.2,
                'cf-furniture-care': 'Wipe down after each weekend. Inspect fabric monthly.',
                'cf-furniture-approved-rooms': ['Sanctuary', 'Cafe'],
            };
        case 'demo-hospitality-kit':
            return {
                'cf-furniture-color': 'Walnut',
                'cf-furniture-weight': 42,
                'cf-furniture-care': 'Inspect casters monthly. Clean surfaces weekly.',
                'cf-furniture-approved-rooms': ['Lobby', 'Cafe'],
            };
        case 'demo-hospitality-table':
            return {
                'cf-furniture-color': 'Walnut',
                'cf-furniture-weight': 18.4,
                'cf-furniture-care': 'Furniture polish every quarter. Avoid direct moisture.',
                'cf-furniture-approved-rooms': ['Lobby'],
            };
        case 'demo-hospitality-cart':
            return {
                'cf-furniture-color': 'White Oak',
                'cf-furniture-weight': 22.5,
                'cf-furniture-care': 'Check wheel locks weekly. Clean stainless surfaces daily.',
                'cf-furniture-approved-rooms': ['Lobby', 'Cafe'],
            };
        case 'demo-hospitality-signage':
            return {
                'cf-furniture-color': 'Slate',
                'cf-furniture-weight': 9.8,
                'cf-furniture-care': 'Store inserts flat. Clean acrylic before use.',
                'cf-furniture-approved-rooms': ['Lobby', 'Sanctuary'],
            };
        case 'demo-drill':
            return {
                'cf-tools-service-interval': 180,
                'cf-tools-last-service': toISODate(addDays(baseDate, -60)),
                'cf-tools-safety-notes': 'Use safety goggles. SDS bits only. Lockout tag after use.',
                'cf-tools-portable': true,
            };
        case 'demo-scissor-lift':
            return {
                'cf-tools-service-interval': 365,
                'cf-tools-last-service': toISODate(addDays(baseDate, -120)),
                'cf-tools-safety-notes': 'Requires lift certification. Charge batteries after each use.',
                'cf-tools-portable': false,
            };
        case 'demo-coffee-maker':
            return {
                'cf-appliance-warranty': toISODate(addDays(baseDate, 365)),
                'cf-appliance-power': '120V / 20A',
                'cf-appliance-cleaning': ['Descale', 'Sanitize'],
            };
        default:
            return {};
    }
}

async function seedMasterDataFromConstants(assets: Asset[]): Promise<void> {
    const aggregated: Record<MasterDataEntity, Set<string>> = {
        locations: new Set(MASTER_DATA_SEEDS.locations),
        manufacturers: new Set(MASTER_DATA_SEEDS.manufacturers),
        models: new Set(MASTER_DATA_SEEDS.models),
        maintenanceCompanies: new Set(MASTER_DATA_SEEDS.maintenanceCompanies),
    };

    assets.forEach(asset => {
        if (asset.location) {
            aggregated.locations.add(asset.location);
        }
        if (asset.manufacturer) {
            aggregated.manufacturers.add(asset.manufacturer);
        }
        if (asset.model) {
            aggregated.models.add(asset.model);
        }
    });

    (Object.keys(aggregated) as MasterDataEntity[]).forEach(entity => {
        const definition = getMasterDataDefinition(entity);
        const uniqueNames = Array.from(aggregated[entity]).filter(name => Boolean(name && name.trim().length));
        const items = sortMasterDataItems(uniqueNames.map(name => createMasterDataItem(name, definition)));
        persistMasterData(definition, items);
    });
}

async function seedAssetPrefixes(
    provider: IStorageProvider,
    timestamp: string,
): Promise<{ prefixes: AssetPrefix[]; map: Map<string, AssetPrefix> }> {
    const created: AssetPrefix[] = [];
    const map = new Map<string, AssetPrefix>();

    for (const seed of ASSET_PREFIX_SEEDS) {
        const prefix = await provider.createAssetPrefix({
            prefix: seed.prefix,
            description: seed.description,
            color: seed.color,
        });
        created.push(prefix);
        map.set(seed.slug, prefix);
        await tagDemoEntity('asset-prefix', prefix.id, timestamp);
    }

    return { prefixes: created, map };
}

async function seedAssetTypes(
    provider: IStorageProvider,
    timestamp: string,
): Promise<{ assetTypes: AssetType[]; map: Map<string, AssetType> }> {
    const assetTypes: AssetType[] = [];
    const map = new Map<string, AssetType>();

    for (const seed of ASSET_TYPE_SEEDS) {
        const assetType = await provider.createAssetType({
            name: seed.name,
            icon: seed.icon,
            assetNameTemplate: seed.assetNameTemplate,
            customFields: seed.customFields,
        });
        assetTypes.push(assetType);
        map.set(seed.slug, assetType);
        await tagDemoEntity('category', assetType.id, timestamp);
    }

    return { assetTypes, map };
}

async function seedAssets(
    provider: IStorageProvider,
    timestamp: string,
    assetTypeMap: Map<string, AssetType>,
    prefixMap: Map<string, AssetPrefix>,
    baseDate: Date,
    person: PersonInfo | null,
): Promise<{ assets: Asset[]; map: Map<string, Asset> }> {
    const assets: Asset[] = [];
    const map = new Map<string, Asset>();

    for (const seed of ASSET_SEEDS) {
        const assetType = assetTypeMap.get(seed.assetTypeSlug);
        if (!assetType) {
            continue;
        }

        const customFieldValues = buildCustomFieldValues(seed.slug, baseDate, person);
        const payload = buildAssetPayload(assetType, seed, {
            prefixId: seed.prefixSlug ? prefixMap.get(seed.prefixSlug)?.id : undefined,
            isParent: seed.isParent ?? false,
            customFieldValues,
        });

        let created = await provider.createAsset(payload);
        await tagDemoEntity('asset', created.id, timestamp);

        const childIds: string[] = [];
        const childAssets: Asset[] = [];

        if (seed.isParent && seed.children && seed.children.length > 0) {
            for (const childSeed of seed.children) {
                const childValues = buildCustomFieldValues(childSeed.slug, baseDate, person);
                const childPayload = buildAssetPayload(assetType, childSeed, {
                    parentAssetId: created.id,
                    customFieldValues: childValues,
                    isParent: false,
                });
                const child = await provider.createAsset(childPayload);
                childIds.push(child.id);
                childAssets.push(child);
                map.set(childSeed.slug, child);
                assets.push(child);
                await tagDemoEntity('asset', child.id, timestamp);
            }

            created = await provider.updateAsset(created.id, {
                isParent: true,
                childAssetIds: childIds,
                bookable: seed.bookable ?? false,
            });
        }

        map.set(seed.slug, created);
        assets.push(created);
    }

    return { assets, map };
}

async function seedKits(
    provider: IStorageProvider,
    timestamp: string,
    assetTypeMap: Map<string, AssetType>,
    assetMap: Map<string, Asset>,
): Promise<{ kits: Kit[]; map: Map<string, Kit> }> {
    const kits: Kit[] = [];
    const map = new Map<string, Kit>();

    for (const seed of KIT_SEEDS) {
        const kitData: KitCreate = {
            name: seed.name,
            description: seed.description,
            type: seed.type,
            boundAssets: seed.boundAssetSlugs?.map(slug => {
                const asset = assetMap.get(slug);
                if (!asset) {
                    throw new Error(`Kit seed references unknown asset slug "${slug}"`);
                }
                return { assetId: asset.id, assetNumber: asset.assetNumber, name: asset.name };
            }),
            poolRequirements: seed.poolRequirements?.map(pool => {
                if (pool.parentAssetSlug) {
                    const parentAsset = assetMap.get(pool.parentAssetSlug);
                    if (!parentAsset) {
                        throw new Error(`Kit pool requirement references unknown parent asset slug "${pool.parentAssetSlug}"`);
                    }
                    return {
                        assetTypeId: parentAsset.assetType.id,
                        assetTypeName: parentAsset.assetType.name,
                        quantity: pool.quantity,
                        filters: { ...(pool.filters ?? {}), parentAssetId: parentAsset.id },
                    };
                }

                if (!pool.assetTypeSlug) {
                    throw new Error('Kit pool requirement missing assetTypeSlug or parentAssetSlug');
                }

                const assetType = assetTypeMap.get(pool.assetTypeSlug);
                if (!assetType) {
                    throw new Error(`Kit pool requirement references unknown asset type slug "${pool.assetTypeSlug}"`);
                }
                return {
                    assetTypeId: assetType.id,
                    assetTypeName: assetType.name,
                    quantity: pool.quantity,
                    filters: pool.filters,
                };
            }),
        };

        const kit = await provider.createKit(kitData);
        kits.push(kit);
        map.set(seed.slug, kit);
        await tagDemoEntity('kit', kit.id, timestamp);
    }

    return { kits, map };
}

async function seedBookings(
    provider: IStorageProvider,
    timestamp: string,
    baseDate: Date,
    assetMap: Map<string, Asset>,
    kitMap: Map<string, Kit>,
    person: PersonInfo | null,
): Promise<{ bookings: Booking[]; map: Map<string, Booking> }> {
    const bookings: Booking[] = [];
    const map = new Map<string, Booking>();
    const personId = person?.id ?? '';
    const personName = (person?.name ?? [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim()) || 'Demo User';

    for (const seed of BOOKING_SEEDS) {
        const startDate = toISODate(addDays(baseDate, seed.startOffsetDays));
        const endDate = toISODate(addDays(baseDate, seed.endOffsetDays));

        const bookingData: BookingCreate = {
            bookingMode: seed.bookingMode ?? 'date-range',
            startDate,
            endDate,
            date: seed.bookingMode === 'single-day' ? startDate : undefined,
            startTime: seed.startTime,
            endTime: seed.endTime,
            purpose: seed.purpose,
            notes: seed.notes,
            status: seed.status ?? 'pending',
            bookedById: personId,
            bookedByName: personName,
            bookingForId: personId,
            bookingForName: personName,
            requestedBy: personId,
            requestedByName: personName,
        };

        if (seed.assetSlug) {
            const asset = assetMap.get(seed.assetSlug);
            if (!asset) {
                throw new Error(`Booking seed references unknown asset slug "${seed.assetSlug}"`);
            }
            bookingData.asset = {
                id: asset.id,
                assetNumber: asset.assetNumber,
                name: asset.name,
            };
        }

        if (seed.kitSlug) {
            const kit = kitMap.get(seed.kitSlug);
            if (!kit) {
                throw new Error(`Booking seed references unknown kit slug "${seed.kitSlug}"`);
            }
            bookingData.kit = {
                id: kit.id,
                name: kit.name,
            };
        }

        const booking = await provider.createBooking(bookingData);
        bookings.push(booking);
        map.set(seed.slug, booking);
        await tagDemoEntity('booking', booking.id, timestamp);
    }

    return { bookings, map };
}

async function seedMaintenanceRecords(
    provider: IStorageProvider,
    timestamp: string,
    baseDate: Date,
    assetMap: Map<string, Asset>,
    person: PersonInfo | null,
): Promise<{ records: MaintenanceRecord[]; map: Map<string, MaintenanceRecord> }> {
    const records: MaintenanceRecord[] = [];
    const map = new Map<string, MaintenanceRecord>();
    const personId = person?.id ?? 'demo-maintainer';
    const personName = (person?.name ?? [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim()) || 'Demo Maintainer';

    for (const seed of MAINTENANCE_SEEDS) {
        const asset = assetMap.get(seed.assetSlug);
        if (!asset) {
            throw new Error(`Maintenance seed references unknown asset slug "${seed.assetSlug}"`);
        }

        const recordData: MaintenanceRecordCreate = {
            asset: {
                id: asset.id,
                assetNumber: asset.assetNumber,
                name: asset.name,
            },
            type: seed.type,
            date: toISODate(addDays(baseDate, seed.dateOffsetDays)),
            description: seed.description,
            notes: seed.notes,
            cost: seed.cost,
            nextDueDate: seed.nextDueOffsetDays !== undefined ? toISODate(addDays(baseDate, seed.nextDueOffsetDays)) : undefined,
            performedBy: personId,
            performedByName: personName,
        };

        const record = await provider.createMaintenanceRecord(recordData);
        records.push(record);
        map.set(seed.slug, record);
        await tagDemoEntity('maintenance', record.id, timestamp);
    }

    return { records, map };
}

async function seedStockTakes(
    provider: IStorageProvider,
    timestamp: string,
    baseDate: Date,
    assetTypeMap: Map<string, AssetType>,
    assetMap: Map<string, Asset>,
    person: PersonInfo | null,
): Promise<StockTakeSession[]> {
    const sessions: StockTakeSession[] = [];
    const personId = person?.id ?? 'demo-stocktake';
    const personName = (person?.name ?? [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim()) || 'Inventory Team';

    for (const seed of STOCK_TAKE_SEEDS) {
        let scope: StockTakeSessionCreate['scope'];
        switch (seed.scope.type) {
            case 'assetType':
                scope = {
                    type: 'assetType',
                    assetTypeIds: seed.scope.assetTypeSlugs
                        .map((assetTypeSlug) => assetTypeMap.get(assetTypeSlug)?.id)
                        .filter((id): id is string => Boolean(id)),
                };
                break;
            case 'location':
                scope = { type: 'location', locations: seed.scope.locations };
                break;
            case 'custom':
                scope = {
                    type: 'custom',
                    assetIds: seed.scope.assetSlugs
                        .map(slug => assetMap.get(slug)?.id)
                        .filter((id): id is string => Boolean(id)),
                };
                break;
            default:
                scope = { type: 'all' };
        }

        const sessionStart = addDays(baseDate, seed.startOffsetDays).toISOString();
        const sessionData: StockTakeSessionCreate = {
            nameReason: seed.nameReason,
            status: 'active',
            startDate: sessionStart,
            scope,
            conductedBy: personId,
            conductedByName: personName,
        };

        let session = await provider.createStockTakeSession(sessionData);
        await tagDemoEntity('stocktake', session.id, timestamp);

        if (seed.status === 'completed') {
            // Add a sample scan for the first asset in the scope if available
            const targetAsset = scope.type === 'assetType'
                ? assetMap.get('demo-camera')
                : scope.type === 'location'
                    ? assetMap.get('demo-hospitality-table')
                    : scope.type === 'custom' && scope.assetIds?.length
                        ? [...assetMap.values()].find(asset => scope.assetIds?.includes(asset.id))
                        : undefined;

            if (targetAsset) {
                try {
                    await provider.addStockTakeScan(session.id, targetAsset.id, personId, targetAsset.location);
                } catch (error) {
                    console.warn('[demoSeeder] Failed to add stock take scan:', error);
                }
            }

            try {
                session = await provider.completeStockTakeSession(session.id);
            } catch (error) {
                console.warn('[demoSeeder] Failed to complete stock take session:', error);
            }
        }

        sessions.push(session);
    }

    return sessions;
}

async function seedChangeHistory(
    provider: IStorageProvider,
    assetMap: Map<string, Asset>,
    kitMap: Map<string, Kit>,
    bookingMap: Map<string, Booking>,
    maintenanceMap: Map<string, MaintenanceRecord>,
): Promise<void> {
    for (const [index, seed] of CHANGE_HISTORY_SEEDS.entries()) {
        try {
            const actor = getHistoryActor(seed.actorIndex ?? index);
            let entityId: string | undefined;
            let entityName: string | undefined;

            switch (seed.entityType) {
                case 'asset': {
                    const asset = assetMap.get(seed.entitySlug);
                    if (!asset) {
                        console.warn('[demoSeeder] Skipping history seed for unknown asset slug', seed.entitySlug);
                        continue;
                    }
                    entityId = asset.id;
                    entityName = asset.name;
                    break;
                }
                case 'kit': {
                    const kit = kitMap.get(seed.entitySlug);
                    if (!kit) {
                        console.warn('[demoSeeder] Skipping history seed for unknown kit slug', seed.entitySlug);
                        continue;
                    }
                    entityId = kit.id;
                    entityName = kit.name;
                    break;
                }
                case 'booking': {
                    const booking = bookingMap.get(seed.entitySlug);
                    if (!booking) {
                        console.warn('[demoSeeder] Skipping history seed for unknown booking slug', seed.entitySlug);
                        continue;
                    }
                    entityId = booking.id;
                    entityName = booking.asset?.name ?? booking.kit?.name ?? booking.purpose;
                    break;
                }
                case 'maintenance': {
                    const record = maintenanceMap.get(seed.entitySlug);
                    if (!record) {
                        console.warn('[demoSeeder] Skipping history seed for unknown maintenance slug', seed.entitySlug);
                        continue;
                    }
                    entityId = record.id;
                    entityName = record.asset.name;
                    break;
                }
                default: {
                    console.warn('[demoSeeder] Unsupported history entity type', seed.entityType);
                    continue;
                }
            }

            if (!entityId) {
                continue;
            }

            const payload: Omit<ChangeHistoryEntry, 'id' | 'changedAt'> = {
                entityType: seed.entityType,
                entityId,
                entityName,
                action: seed.action,
                changedBy: actor.id,
                changedByName: actor.name,
            };

            if (seed.fieldName) {
                payload.fieldName = seed.fieldName;
            }
            if (seed.oldValue !== undefined) {
                payload.oldValue = seed.oldValue;
            }
            if (seed.newValue !== undefined) {
                payload.newValue = seed.newValue;
            }
            if (seed.changes) {
                payload.changes = seed.changes;
            }

            await provider.recordChange(payload);
        } catch (error) {
            console.warn(
                `[demoSeeder] Failed to record change history for ${seed.entityType}:${seed.entitySlug}`,
                error,
            );
        }
    }
}

function sortForCleanup(records: Awaited<ReturnType<typeof listDemoEntities>>): typeof records {
    const priority: Record<string, number> = {
        booking: 1,
        maintenance: 2,
        stocktake: 3,
        kit: 4,
        asset: 5,
        'asset-prefix': 6,
        category: 7,
    };

    return [...records].sort((a, b) => (priority[a.entityType] ?? 99) - (priority[b.entityType] ?? 99));
}

function clearMasterData(): void {
    (Object.keys(MASTER_DATA_SEEDS) as MasterDataEntity[]).forEach(entity => {
        const definition = getMasterDataDefinition(entity);
        persistMasterData(definition, []);
    });
}

export async function seedDemoData(options: DemoSeederProvider = {}): Promise<DemoSeedOutcome> {
    ensureDemoToolsEnabled('seedDemoData');
    const provider = await resolveProvider(options);
    await ensureOfflineReady();

    const metadata = await loadDemoMetadata();
    const versionMismatch = (metadata.seedVersion ?? null) !== DEMO_SEED_VERSION;

    if (metadata.seededAt && versionMismatch) {
        await resetDemoData({ ...options, force: true });
    }

    if (metadata.seededAt && !options.force && !versionMismatch) {
        return {
            assetTypes: [],
            assets: [],
            assetPrefixes: [],
            bookings: [],
            kits: [],
            maintenanceRecords: [],
            stockTakes: [],
            seededAt: metadata.seededAt,
            seedVersion: metadata.seedVersion ?? DEMO_SEED_VERSION,
        };
    }

    const timestamp = resolveNow(options.now);
    const baseDate = new Date(timestamp);
    const resolvedPerson = await resolvePerson(provider, options.person ?? null);
    const seedPerson = resolvePersonOrFallback(resolvedPerson ?? options.person ?? null);
    await seedPersonReferenceCaches(seedPerson);

    const { prefixes, map: prefixMap } = await seedAssetPrefixes(provider, timestamp);
    const { assetTypes, map: assetTypeMap } = await seedAssetTypes(provider, timestamp);
    const { assets, map: assetMap } = await seedAssets(provider, timestamp, assetTypeMap, prefixMap, baseDate, seedPerson);
    const { kits, map: kitMap } = await seedKits(provider, timestamp, assetTypeMap, assetMap);
    const bookingSeedResult = await seedBookings(provider, timestamp, baseDate, assetMap, kitMap, seedPerson);
    const maintenanceSeedResult = await seedMaintenanceRecords(provider, timestamp, baseDate, assetMap, seedPerson);

    await seedChangeHistory(provider, assetMap, kitMap, bookingSeedResult.map, maintenanceSeedResult.map);

    const stockTakes = await seedStockTakes(provider, timestamp, baseDate, assetTypeMap, assetMap, seedPerson);

    await seedMasterDataFromConstants(assets);

    const seededBy = resolveSeededBy(seedPerson);
    await saveDemoMetadata({
        seededAt: timestamp,
        seedVersion: DEMO_SEED_VERSION,
        seededBy,
        modalDismissedAt: timestamp,
    });

    return {
        assetTypes,
        assets,
        assetPrefixes: prefixes,
        bookings: bookingSeedResult.bookings,
        kits,
        maintenanceRecords: maintenanceSeedResult.records,
        stockTakes,
        seededAt: timestamp,
        seedVersion: DEMO_SEED_VERSION,
    };
}

export async function resetDemoData(options: DemoSeederProvider = {}): Promise<DemoResetOutcome> {
    ensureDemoToolsEnabled('resetDemoData');
    const provider = await resolveProvider(options);
    await ensureOfflineReady();

    const taggedEntities = await listDemoEntities();
    const ordered = sortForCleanup(taggedEntities);
    const errors: Array<{ entityId: string; entityType: string; error: Error }> = [];

    for (const record of ordered) {
        try {
            switch (record.entityType) {
                case 'booking':
                    await provider.deleteBooking(record.entityId);
                    break;
                case 'maintenance':
                    await provider.deleteMaintenanceRecord(record.entityId);
                    break;
                case 'stocktake':
                    await provider.deleteStockTakeSession(record.entityId);
                    break;
                case 'kit':
                    await provider.deleteKit(record.entityId);
                    break;
                case 'asset':
                    await provider.deleteAsset(record.entityId);
                    break;
                case 'asset-prefix':
                    await provider.deleteAssetPrefix(record.entityId);
                    break;
                case 'category':
                    await provider.deleteAssetType(record.entityId);
                    break;
                default:
                    break;
            }
        } catch (error) {
            if (error instanceof Error) {
                errors.push({ entityId: record.entityId, entityType: record.entityType, error });
            }
        } finally {
            await untagDemoEntity(record.entityType, record.entityId);
        }
    }

    clearMasterData();

    const resetAt = resolveNow(options.now);
    await saveDemoMetadata({
        seededAt: null,
        seedVersion: null,
        seededBy: null,
        lastResetAt: resetAt,
        modalDismissedAt: null,
    });

    return {
        removedEntities: taggedEntities.length,
        errors,
        resetAt,
    };
}

export async function reseedDemoData(options: DemoSeederProvider = {}): Promise<DemoSeedOutcome> {
    await resetDemoData({ ...options, force: true });
    return await seedDemoData({ ...options, force: true });
}
