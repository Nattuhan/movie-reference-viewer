import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Video } from './videoStore';

interface UIState {
  viewMode: 'grid' | 'list';
  sidebarCollapsed: boolean;
  selectedVideo: Video | null;
  isVideoModalOpen: boolean;
  isImportDialogOpen: boolean;

  // Video player settings
  playerVolume: number;
  playerMuted: boolean;
  playerSpeed: number;
  playerLoop: boolean;

  setViewMode: (mode: 'grid' | 'list') => void;
  toggleSidebar: () => void;
  openVideoModal: (video: Video) => void;
  closeVideoModal: () => void;
  updateSelectedVideo: (updates: Partial<Video>) => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;
  setPlayerVolume: (volume: number) => void;
  setPlayerMuted: (muted: boolean) => void;
  setPlayerSpeed: (speed: number) => void;
  setPlayerLoop: (loop: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      sidebarCollapsed: false,
      selectedVideo: null,
      isVideoModalOpen: false,
      isImportDialogOpen: false,

      // Video player settings
      playerVolume: 1,
      playerMuted: false,
      playerSpeed: 1,
      playerLoop: true,

      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      openVideoModal: (video) => set({ selectedVideo: video, isVideoModalOpen: true }),
      closeVideoModal: () => set({ isVideoModalOpen: false }),
      updateSelectedVideo: (updates) =>
        set((state) => ({
          selectedVideo: state.selectedVideo
            ? { ...state.selectedVideo, ...updates }
            : null,
        })),

      openImportDialog: () => set({ isImportDialogOpen: true }),
      closeImportDialog: () => set({ isImportDialogOpen: false }),

      setPlayerVolume: (volume) => set({ playerVolume: volume }),
      setPlayerMuted: (muted) => set({ playerMuted: muted }),
      setPlayerSpeed: (speed) => set({ playerSpeed: speed }),
      setPlayerLoop: (loop) => set({ playerLoop: loop }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sidebarCollapsed: state.sidebarCollapsed,
        playerVolume: state.playerVolume,
        playerMuted: state.playerMuted,
        playerSpeed: state.playerSpeed,
        playerLoop: state.playerLoop,
      }),
    }
  )
);
