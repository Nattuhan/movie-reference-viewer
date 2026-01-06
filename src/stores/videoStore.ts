import { create } from 'zustand';

export interface Video {
  id: number;
  title: string;
  description: string | null;
  filePath: string;
  thumbnailPath: string | null;
  duration: number;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  codec: string | null;
  sourceType: 'local' | 'youtube';
  sourceUrl: string | null;
  sourcePath: string | null;
  clipStart: number | null;
  clipEnd: number | null;
  folderId: number;
  isFavorite: boolean;
  playCount: number;
  lastPlayedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  videoCount?: number;
}

interface VideoState {
  videos: Video[];
  isLoading: boolean;
  error: string | null;
  currentFolderId: number | null;
  selectedTagIds: number[];
  searchText: string;
  sourceTypeFilter: 'all' | 'local' | 'youtube';

  fetchVideos: () => Promise<void>;
  setCurrentFolder: (folderId: number | null) => void;
  setSelectedTags: (tagIds: number[]) => void;
  setSearchText: (text: string) => void;
  setSourceTypeFilter: (type: 'all' | 'local' | 'youtube') => void;
  addVideo: (video: Video) => void;
  updateVideo: (id: number, updates: Partial<Video>) => void;
  removeVideo: (id: number) => void;
  getFilteredVideos: () => Video[];
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  isLoading: false,
  error: null,
  currentFolderId: null,
  selectedTagIds: [],
  searchText: '',
  sourceTypeFilter: 'all',

  fetchVideos: async () => {
    set({ isLoading: true, error: null });
    try {
      const videos = await window.electronAPI.video.getAll();
      set({ videos: videos as Video[], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
  setSelectedTags: (tagIds) => set({ selectedTagIds: tagIds }),
  setSearchText: (text) => set({ searchText: text }),
  setSourceTypeFilter: (type) => set({ sourceTypeFilter: type }),

  addVideo: (video) => set((state) => ({ videos: [video, ...state.videos] })),

  updateVideo: (id, updates) =>
    set((state) => ({
      videos: state.videos.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    })),

  removeVideo: (id) =>
    set((state) => ({
      videos: state.videos.filter((v) => v.id !== id),
    })),

  getFilteredVideos: () => {
    const { videos, currentFolderId, selectedTagIds, searchText, sourceTypeFilter } = get();

    return videos.filter((video) => {
      // Folder filter
      if (currentFolderId !== null && video.folderId !== currentFolderId) {
        return false;
      }

      // Tag filter (AND logic)
      if (selectedTagIds.length > 0) {
        const videoTagIds = video.tags?.map((t) => t.id) || [];
        if (!selectedTagIds.every((id) => videoTagIds.includes(id))) {
          return false;
        }
      }

      // Source type filter
      if (sourceTypeFilter !== 'all' && video.sourceType !== sourceTypeFilter) {
        return false;
      }

      // Text search
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const titleMatch = video.title.toLowerCase().includes(searchLower);
        const descMatch = video.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  },
}));
