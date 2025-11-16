import { create } from 'zustand';
import type { Tag } from '../types/tag';
import type { UUID } from '../types/entities';

interface TagState {
  tags: Tag[];
  selectedTagIds: Set<UUID>;
  
  // Actions
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: UUID, tag: Tag) => void;
  removeTag: (id: UUID) => void;
  clearTags: () => void;
  
  // Selection actions
  selectTag: (id: UUID) => void;
  deselectTag: (id: UUID) => void;
  toggleTag: (id: UUID) => void;
  clearSelection: () => void;
  setSelectedTags: (ids: UUID[]) => void;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  selectedTagIds: new Set(),
  
  setTags: (tags) => set({ tags }),
  
  addTag: (tag) => set((state) => ({
    tags: [...state.tags, tag],
  })),
  
  updateTag: (id, updatedTag) => set((state) => ({
    tags: state.tags.map((tag) => (tag.id === id ? updatedTag : tag)),
  })),
  
  removeTag: (id) => set((state) => ({
    tags: state.tags.filter((tag) => tag.id !== id),
    selectedTagIds: new Set(
      Array.from(state.selectedTagIds).filter((tagId) => tagId !== id)
    ),
  })),
  
  clearTags: () => set({ tags: [], selectedTagIds: new Set() }),
  
  // Selection actions
  selectTag: (id) => set((state) => ({
    selectedTagIds: new Set([...state.selectedTagIds, id]),
  })),
  
  deselectTag: (id) => set((state) => {
    const newSet = new Set(state.selectedTagIds);
    newSet.delete(id);
    return { selectedTagIds: newSet };
  }),
  
  toggleTag: (id) => set((state) => {
    const newSet = new Set(state.selectedTagIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedTagIds: newSet };
  }),
  
  clearSelection: () => set({ selectedTagIds: new Set() }),
  
  setSelectedTags: (ids) => set({ selectedTagIds: new Set(ids) }),
}));
