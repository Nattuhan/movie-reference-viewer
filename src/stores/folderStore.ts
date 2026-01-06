import { create } from 'zustand';

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  createdAt: string;
  children?: Folder[];
  videoCount?: number;
}

interface FolderState {
  folders: Folder[];
  isLoading: boolean;
  error: string | null;

  fetchFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: number) => Promise<Folder>;
  renameFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;
}

export const useFolderStore = create<FolderState>((set) => ({
  folders: [],
  isLoading: false,
  error: null,

  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      const folders = await window.electronAPI.folder.getTree();
      set({ folders: folders as Folder[], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createFolder: async (name, parentId) => {
    const folder = await window.electronAPI.folder.create(name, parentId);
    // Refetch to get updated tree
    const folders = await window.electronAPI.folder.getTree();
    set({ folders: folders as Folder[] });
    return folder as Folder;
  },

  renameFolder: async (id, name) => {
    await window.electronAPI.folder.rename(id, name);
    const folders = await window.electronAPI.folder.getTree();
    set({ folders: folders as Folder[] });
  },

  deleteFolder: async (id) => {
    await window.electronAPI.folder.delete(id);
    const folders = await window.electronAPI.folder.getTree();
    set({ folders: folders as Folder[] });
  },
}));
