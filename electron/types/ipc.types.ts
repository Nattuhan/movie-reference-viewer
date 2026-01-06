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

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  createdAt: string;
  children?: Folder[];
  videoCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  videoCount?: number;
}

export interface ImportOptions {
  filePath: string;
  title?: string;
  description?: string;
  folderId?: number;
  tagIds?: number[];
  taskId?: string;
}

export interface YouTubeImportOptions {
  url: string;
  title?: string;
  clipStart?: number;
  clipEnd?: number;
  folderId?: number;
  tagIds?: number[];
  taskId?: string;
}

export interface SearchQuery {
  text?: string;
  tagIds?: number[];
  folderId?: number;
  sourceType?: 'local' | 'youtube' | 'all';
  sortBy?: 'createdAt' | 'title' | 'duration' | 'playCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProgressEvent {
  taskId: string;
  type: 'download' | 'transcode' | 'thumbnail';
  progress: number;
  status: 'pending' | 'downloading' | 'transcoding' | 'generating-thumbnail' | 'complete' | 'error';
  message?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fileSize: number;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
}
