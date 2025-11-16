import { create } from 'zustand';
import type { Asset, Kit } from '../types/entities';

interface KitStoreState {
  kitsById: Record<string, Kit>;
  kitIds: string[];
  subAssetsByKit: Record<string, Asset[]>;
  upsertKits: (kits: Kit[]) => void;
  upsertKit: (kit: Kit) => void;
  removeKit: (kitId: string) => void;
  setKitSubAssets: (kitId: string, assets: Asset[]) => void;
  clear: () => void;
}

export const useKitStore = create<KitStoreState>((set) => ({
  kitsById: {},
  kitIds: [],
  subAssetsByKit: {},

  upsertKits: (kits) => {
    set((state) => {
      if (!kits.length) {
        return state;
      }

      const kitsById = { ...state.kitsById };
      for (const kit of kits) {
        kitsById[kit.id] = kit;
      }

      const kitIds = Array.from(new Set([...state.kitIds, ...kits.map((kit) => kit.id)]));

      return {
        ...state,
        kitsById,
        kitIds,
      };
    });
  },

  upsertKit: (kit) => {
    set((state) => ({
      kitsById: { ...state.kitsById, [kit.id]: kit },
      kitIds: state.kitIds.includes(kit.id) ? state.kitIds : [...state.kitIds, kit.id],
      subAssetsByKit: state.subAssetsByKit,
    }));
  },

  removeKit: (kitId) => {
    set((state) => {
      const { [kitId]: _removed, ...remainingKits } = state.kitsById;
      const { [kitId]: _subAssets, ...remainingSubAssets } = state.subAssetsByKit;
      return {
        kitsById: remainingKits,
        kitIds: state.kitIds.filter((id) => id !== kitId),
        subAssetsByKit: remainingSubAssets,
      };
    });
  },

  setKitSubAssets: (kitId, assets) => {
    set((state) => ({
      subAssetsByKit: {
        ...state.subAssetsByKit,
        [kitId]: assets,
      },
    }));
  },

  clear: () => ({
    kitsById: {},
    kitIds: [],
    subAssetsByKit: {},
  }),
}));
