import { contextBridge, ipcRenderer } from 'electron';
import type {
  Video,
  Folder,
  Tag,
  ImportOptions,
  YouTubeImportOptions,
  SearchQuery,
  ProgressEvent,
} from './types/ipc.types';

const api = {
  // ===== App Operations =====
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('app:getVersion'),

    getDataPath: (): Promise<string> =>
      ipcRenderer.invoke('app:getDataPath'),

    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('app:openExternal', url),

    showInFolder: (filePath: string): Promise<void> =>
      ipcRenderer.invoke('app:showInFolder', filePath),

    getPlatform: (): 'darwin' | 'win32' | 'linux' =>
      process.platform as 'darwin' | 'win32' | 'linux',
  },

  // ===== Video Operations =====
  video: {
    getAll: (folderId?: number): Promise<Video[]> =>
      ipcRenderer.invoke('video:getAll', folderId),

    getById: (id: number): Promise<Video | null> =>
      ipcRenderer.invoke('video:getById', id),

    search: (query: SearchQuery): Promise<Video[]> =>
      ipcRenderer.invoke('video:search', query),

    import: (options: ImportOptions): Promise<Video> =>
      ipcRenderer.invoke('video:import', options),

    importFromYouTube: (options: YouTubeImportOptions): Promise<Video> =>
      ipcRenderer.invoke('video:importFromYouTube', options),

    update: (id: number, updates: Partial<Video>): Promise<Video | null> =>
      ipcRenderer.invoke('video:update', id, updates),

    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke('video:delete', id),

    move: (id: number, folderId: number): Promise<void> =>
      ipcRenderer.invoke('video:move', id, folderId),

    incrementPlayCount: (id: number): Promise<void> =>
      ipcRenderer.invoke('video:incrementPlayCount', id),

    regenerateThumbnail: (id: number): Promise<string> =>
      ipcRenderer.invoke('video:regenerateThumbnail', id),
  },

  // ===== Folder Operations =====
  folder: {
    getAll: (): Promise<Folder[]> =>
      ipcRenderer.invoke('folder:getAll'),

    getTree: (): Promise<Folder[]> =>
      ipcRenderer.invoke('folder:getTree'),

    create: (name: string, parentId?: number): Promise<Folder> =>
      ipcRenderer.invoke('folder:create', name, parentId),

    rename: (id: number, name: string): Promise<void> =>
      ipcRenderer.invoke('folder:rename', id, name),

    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke('folder:delete', id),

    move: (id: number, parentId: number | null): Promise<void> =>
      ipcRenderer.invoke('folder:move', id, parentId),
  },

  // ===== Tag Operations =====
  tag: {
    getAll: (): Promise<Tag[]> =>
      ipcRenderer.invoke('tag:getAll'),

    create: (name: string, color?: string): Promise<Tag> =>
      ipcRenderer.invoke('tag:create', name, color),

    update: (id: number, name: string, color?: string): Promise<void> =>
      ipcRenderer.invoke('tag:update', id, name, color),

    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke('tag:delete', id),

    addToVideo: (videoId: number, tagId: number): Promise<void> =>
      ipcRenderer.invoke('tag:addToVideo', videoId, tagId),

    removeFromVideo: (videoId: number, tagId: number): Promise<void> =>
      ipcRenderer.invoke('tag:removeFromVideo', videoId, tagId),

    getByVideo: (videoId: number): Promise<Tag[]> =>
      ipcRenderer.invoke('tag:getByVideo', videoId),

    setForVideo: (videoId: number, tagIds: number[]): Promise<void> =>
      ipcRenderer.invoke('tag:setForVideo', videoId, tagIds),
  },

  // ===== Dialog Operations =====
  dialog: {
    openFile: (filters?: Electron.FileFilter[]): Promise<string | null> =>
      ipcRenderer.invoke('dialog:openFile', filters),

    openFiles: (filters?: Electron.FileFilter[]): Promise<string[]> =>
      ipcRenderer.invoke('dialog:openFiles', filters),

    selectFolder: (): Promise<string | null> =>
      ipcRenderer.invoke('dialog:selectFolder'),
  },

  // ===== YouTube Operations =====
  youtube: {
    getInfo: (url: string): Promise<import('./types/ipc.types').YouTubeVideoInfo> =>
      ipcRenderer.invoke('youtube:getInfo', url),

    validateUrl: (url: string): Promise<boolean> =>
      ipcRenderer.invoke('youtube:validateUrl', url),
  },

  // ===== Event Listeners =====
  onProgress: (callback: (event: ProgressEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ProgressEvent) => {
      callback(progress);
    };
    ipcRenderer.on('progress', handler);
    return () => ipcRenderer.removeListener('progress', handler);
  },
} as const;

export type ElectronAPI = typeof api;

contextBridge.exposeInMainWorld('electronAPI', api);
