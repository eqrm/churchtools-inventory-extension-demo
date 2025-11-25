import { describe, it, expect } from 'vitest';
import {
    allocateBookingQuantity,
    type AllocationChildAsset,
} from '../../../services/bookings/quantityAllocator';

let counter = 0;

function createChild(overrides: Partial<AllocationChildAsset> = {}): AllocationChildAsset {
    counter += 1;
    return {
        id: overrides.id ?? `child-${counter}`,
        assetNumber: overrides.assetNumber ?? `AST-${String(counter).padStart(3, '0')}`,
        name: overrides.name ?? `Child Asset ${counter}`,
        status: overrides.status ?? 'available',
        bookable: overrides.bookable ?? true,
        isAvailable: overrides.isAvailable ?? true,
        currentBookingId: overrides.currentBookingId ?? null,
    } satisfies AllocationChildAsset;
}

describe('allocateBookingQuantity', () => {
    it('returns the first N available child assets when enough inventory exists', () => {
        const children = [
            createChild({ id: 'A', assetNumber: 'AST-001' }),
            createChild({ id: 'B', assetNumber: 'AST-002' }),
            createChild({ id: 'C', assetNumber: 'AST-003' }),
        ];

        const result = allocateBookingQuantity({
            quantity: 2,
            parentAssetId: 'parent-1',
            children,
        });

    expect(result.status).toBe('fulfilled');
    expect(result.allocated).toHaveLength(2);
    const allocatedIds = result.allocated.map(asset => asset.id);
    expect(allocatedIds).toEqual(['A', 'B']);
    });

    it('ignores children that are not bookable or currently unavailable', () => {
        const children = [
            createChild({ id: 'A', assetNumber: 'AST-001', bookable: false }),
            createChild({ id: 'B', assetNumber: 'AST-002', isAvailable: false }),
            createChild({ id: 'C', assetNumber: 'AST-003', status: 'in-use', currentBookingId: 'booking-123' }),
            createChild({ id: 'D', assetNumber: 'AST-004' }),
        ];

        const result = allocateBookingQuantity({
            quantity: 1,
            parentAssetId: 'parent-1',
            children,
        });

    expect(result.status).toBe('fulfilled');
    expect(result.allocated).toHaveLength(1);
    expect(result.allocated[0]?.id).toBe('D');
    });

    it('excludes any child assets explicitly blocked by the caller', () => {
        const children = [
            createChild({ id: 'A', assetNumber: 'AST-001' }),
            createChild({ id: 'B', assetNumber: 'AST-002' }),
            createChild({ id: 'C', assetNumber: 'AST-003' }),
        ];

        const result = allocateBookingQuantity({
            quantity: 2,
            parentAssetId: 'parent-1',
            children,
            excludeAssetIds: ['A'],
        });

    expect(result.status).toBe('fulfilled');
    const allocatedIds = result.allocated.map(asset => asset.id);
    expect(allocatedIds).toEqual(['B', 'C']);
    });

    it('returns a shortage payload when the requested quantity exceeds availability', () => {
        const children = [
            createChild({ id: 'A', assetNumber: 'AST-001' }),
        ];

        const result = allocateBookingQuantity({
            quantity: 3,
            parentAssetId: 'parent-1',
            children,
        });

    expect(result.status).toBe('shortage');
    const allocatedIds = result.allocated.map(asset => asset.id);
    expect(allocatedIds).toEqual(['A']);
        expect(result.shortage?.requested).toBe(3);
        expect(result.shortage?.available).toBe(1);
        expect(result.shortage?.missing).toBe(2);
        expect(result.shortage?.message).toContain('only 1 available');
    });
});
