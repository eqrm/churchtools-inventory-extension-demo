import { describe, expect, it } from 'vitest';
import { DataViewService } from '../../services/DataViewService';
import type {
    FilterCondition,
    SortConfig,
    GroupConfig,
    RelativeDateRange,
} from '../../types/dataView';

type TestRecord = {
    id: string;
    name: string;
    category: string;
    quantity: number;
    tags: string[];
    purchasedAt?: string;
    notes?: string | null;
    status: 'available' | 'in-use' | 'retired';
};

describe('DataViewService filtering and grouping (T066-T069)', () => {
    const records: TestRecord[] = [
        {
            id: 'asset-001',
            name: '4K Camera',
            category: 'Video',
            quantity: 5,
            tags: ['camera', 'production'],
            purchasedAt: '2025-01-05T10:00:00.000Z',
            notes: 'Primary unit',
            status: 'available',
        },
        {
            id: 'asset-002',
            name: 'Lighting Kit',
            category: 'Lighting',
            quantity: 2,
            tags: ['lighting', 'studio'],
            purchasedAt: '2024-12-28T09:00:00.000Z',
            notes: null,
            status: 'in-use',
        },
        {
            id: 'asset-003',
            name: 'Backup Camera',
            category: 'Video',
            quantity: 1,
            tags: ['camera', 'backup'],
            purchasedAt: '2024-11-15T12:00:00.000Z',
            notes: '',
            status: 'available',
        },
        {
            id: 'asset-004',
            name: 'Microphone Kit',
            category: 'Audio',
            quantity: 8,
            tags: ['audio', 'production'],
            purchasedAt: '2025-01-08T08:30:00.000Z',
            notes: 'Check cables',
            status: 'retired',
        },
    ];

    const relativeRange: RelativeDateRange = {
        direction: 'last',
        unit: 'days',
        amount: 10,
    };

    const filters: FilterCondition[] = [
        {
            type: 'text',
            field: 'name',
            operator: 'contains',
            value: 'camera',
        },
        {
            type: 'number',
            field: 'quantity',
            operator: 'greaterThan',
            value: 1,
        },
        {
            type: 'tag',
            field: 'tags',
            operator: 'includesAny',
            value: ['production'],
        },
        {
            type: 'date',
            field: 'purchasedAt',
            operator: 'between',
            value: relativeRange,
        },
        {
            type: 'empty',
            field: 'notes',
            operator: 'isNotEmpty',
        },
    ];

    it('applies text, numeric, tag, date, and empty filters together (T066)', () => {
        const service = new DataViewService({ now: () => new Date('2025-01-10T12:00:00.000Z') });
        const result = service.applyFilters(records, filters);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('asset-001');
    });

    it('converts relative date ranges into absolute ranges (T067)', () => {
        const service = new DataViewService({ now: () => new Date('2025-01-10T00:00:00.000Z') });
        const range = service.resolveRelativeDateRange(relativeRange);

        expect(range.start.toISOString()).toBe('2024-12-31T00:00:00.000Z');
        expect(range.end.toISOString()).toBe('2025-01-10T23:59:59.999Z');
    });

    it('applies multi-column sorting with stable ordering (T068)', () => {
        const service = new DataViewService();
        const sorts: SortConfig[] = [
            { field: 'status', direction: 'desc' },
            { field: 'name', direction: 'desc' },
        ];

        const result = service.applySorts(records, sorts);

    expect(result.map((item: TestRecord) => item.id)).toEqual([
            'asset-004', // retired
            'asset-002', // in-use
            'asset-001', // available, name 4K Camera
            'asset-003', // available, backup camera comes after 4K when descending
        ]);
    });

    it('groups records by arbitrary field with ordered keys (T069)', () => {
        const service = new DataViewService();
        const groups = service.groupRecords(records, {
            field: 'category',
            order: ['Video', 'Audio', 'Lighting'],
            emptyLabel: 'Uncategorized',
        } satisfies GroupConfig);

        const orderedKeys = Array.from(groups.keys());
        expect(orderedKeys).toEqual(['Video', 'Audio', 'Lighting']);
        expect(groups.get('Video')?.length).toBe(2);
        expect(groups.get('Lighting')?.length).toBe(1);
    });
});
