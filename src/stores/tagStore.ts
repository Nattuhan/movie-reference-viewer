import { create } from 'zustand';
import type { Tag } from './videoStore';

interface TagState {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;

  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: number, name: string, color?: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await window.electronAPI.tag.getAll();
      set({ tags: tags as Tag[], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTag: async (name, color) => {
    const tag = await window.electronAPI.tag.create(name, color);
    const tags = await window.electronAPI.tag.getAll();
    set({ tags: tags as Tag[] });
    return tag as Tag;
  },

  updateTag: async (id, name, color) => {
    await window.electronAPI.tag.update(id, name, color);
    const tags = await window.electronAPI.tag.getAll();
    set({ tags: tags as Tag[] });
  },

  deleteTag: async (id) => {
    await window.electronAPI.tag.delete(id);
    const tags = await window.electronAPI.tag.getAll();
    set({ tags: tags as Tag[] });
  },
}));
