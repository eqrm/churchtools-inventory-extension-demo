import { useMemo } from 'react';
import type { KitInheritanceProperty } from '../types/entities';
import type { UndoActionType } from '../types/undo';
import { PropertyInheritanceService, type InheritedProperties } from '../services/PropertyInheritanceService';
import { recordCompoundUndoAction, registerUndoHandler } from '../services/undo';
import { useStorageProvider } from './useStorageProvider';

interface InheritanceStatus {
  inherited: boolean;
  source?: string;
}

interface UsePropertyInheritanceResult {
  ready: boolean;
  getInheritedProperties: (assetId: string, kitId: string) => Promise<InheritedProperties>;
  isPropertyInherited: (assetId: string, propertyName: string) => Promise<InheritanceStatus>;
  propagateKitChange: (
    kitId: string,
    property: KitInheritanceProperty,
    value: unknown,
  ) => Promise<string[]>;
  unlockInheritedProperties: (kitId: string) => Promise<void>;
}

export function usePropertyInheritance(): UsePropertyInheritanceResult {
  const storageProvider = useStorageProvider();

  const service = useMemo(() => {
    if (!storageProvider) {
      return null;
    }

    return new PropertyInheritanceService({
      storageProvider: {
        getKit: storageProvider.getKit.bind(storageProvider),
        getAsset: storageProvider.getAsset.bind(storageProvider),
        updateAsset: storageProvider.updateAsset.bind(storageProvider),
      },
      recordCompoundUndoAction,
      registerUndoHandler: (actionType, handler) =>
        registerUndoHandler(actionType as UndoActionType, handler),
    });
  }, [storageProvider]);

  return useMemo<UsePropertyInheritanceResult>(() => {
    const getService = () => {
      if (!service) {
        throw new Error('Property inheritance service unavailable');
      }
      return service;
    };

    return {
      ready: Boolean(service),
      getInheritedProperties: async (assetId, kitId) => {
        const svc = getService();
        return await svc.getInheritedProperties(assetId, kitId);
      },
      isPropertyInherited: async (assetId, propertyName) => {
        const svc = getService();
        return await svc.isPropertyInherited(assetId, propertyName);
      },
      propagateKitChange: async (kitId, property, value) => {
        const svc = getService();
        return await svc.propagateKitChange(kitId, property, value);
      },
      unlockInheritedProperties: async (kitId) => {
        const svc = getService();
        await svc.unlockInheritedProperties(kitId);
      },
    };
  }, [service]);
}
