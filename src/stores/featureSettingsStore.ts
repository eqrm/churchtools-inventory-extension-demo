import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FeatureModuleKey = 'bookings' | 'kits' | 'maintenance';

interface FeatureSettingsState {
  bookingsEnabled: boolean;
  kitsEnabled: boolean;
  maintenanceEnabled: boolean;
  setModuleEnabled: (module: FeatureModuleKey, enabled: boolean) => void;
}

const DEFAULT_STATE = {
  bookingsEnabled: false,
  kitsEnabled: true,
  maintenanceEnabled: false,
} satisfies Omit<FeatureSettingsState, 'setModuleEnabled'>;

export const useFeatureSettingsStore = create<FeatureSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setModuleEnabled: (module, enabled) => {
        set((state) => {
          switch (module) {
            case 'bookings':
              return { ...state, bookingsEnabled: enabled };
            case 'kits':
              return { ...state, kitsEnabled: enabled };
            case 'maintenance':
              return { ...state, maintenanceEnabled: enabled };
            default:
              return state;
          }
        });
      },
    }),
    {
      name: 'churchtools-inventory-feature-settings',
      partialize: (state) => ({
        bookingsEnabled: state.bookingsEnabled,
        kitsEnabled: state.kitsEnabled,
        maintenanceEnabled: state.maintenanceEnabled,
      }),
    }
  )
);
