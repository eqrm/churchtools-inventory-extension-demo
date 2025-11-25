import type { Asset } from '../../types/entities';

export interface AllocationChildAsset extends Pick<Asset, 'id' | 'assetNumber' | 'name' | 'status' | 'bookable'> {
    isAvailable?: boolean;
    currentBookingId?: string | null;
}

export interface AllocateBookingQuantityOptions {
    parentAssetId: string;
    quantity: number;
    children: AllocationChildAsset[];
    excludeAssetIds?: string[];
}

export type AllocationResult =
    | {
          status: 'fulfilled';
          allocated: AllocationChildAsset[];
          shortage?: undefined;
      }
    | {
          status: 'shortage';
          allocated: AllocationChildAsset[];
          shortage: {
              requested: number;
              available: number;
              missing: number;
              message: string;
          };
      };

function isChildAvailable(child: AllocationChildAsset): boolean {
    const statusOk = child.status === 'available';
    const availabilityFlag = child.isAvailable ?? true;
    const bookingFree = !child.currentBookingId;
    return child.bookable && statusOk && availabilityFlag && bookingFree;
}

export function allocateBookingQuantity(options: AllocateBookingQuantityOptions): AllocationResult {
    const { quantity, children, excludeAssetIds = [] } = options;

    if (quantity <= 0) {
        return {
            status: 'fulfilled',
            allocated: [],
        };
    }

    const excluded = new Set(excludeAssetIds);

    const eligibleChildren = children
        .filter(child => !excluded.has(child.id))
        .filter(isChildAvailable)
        .sort((a, b) => a.assetNumber.localeCompare(b.assetNumber));

    const allocated = eligibleChildren.slice(0, quantity);

    if (allocated.length >= quantity) {
        return {
            status: 'fulfilled',
            allocated,
        };
    }

    const available = allocated.length;
    const missing = Math.max(quantity - available, 0);
    const message = missing === 0
        ? 'No available child assets found for allocation.'
        : `Requested ${quantity} items but only ${available} available (${missing} missing).`;

    return {
        status: 'shortage',
        allocated,
        shortage: {
            requested: quantity,
            available,
            missing,
            message,
        },
    };
}
