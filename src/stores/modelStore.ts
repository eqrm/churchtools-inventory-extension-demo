import { create } from 'zustand';
import type { AssetModel } from '../types/model';

interface AssetModelState {
  models: AssetModel[];
  selectedModelId: string | null;
  setModels: (models: AssetModel[]) => void;
  addModel: (model: AssetModel) => void;
  updateModel: (id: string, model: AssetModel) => void;
  removeModel: (id: string) => void;
  selectModel: (id: string | null) => void;
  getModelById: (id: string) => AssetModel | undefined;
}

export const useModelStore = create<AssetModelState>((set, get) => ({
  models: [],
  selectedModelId: null,

  setModels: (models) => set({ models }),

  addModel: (model) =>
    set((state) => ({
      models: [...state.models, model],
    })),

  updateModel: (id, model) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? model : m)),
    })),

  removeModel: (id) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
      selectedModelId: state.selectedModelId === id ? null : state.selectedModelId,
    })),

  selectModel: (id) => set({ selectedModelId: id }),

  getModelById: (id) => get().models.find((m) => m.id === id),
}));
