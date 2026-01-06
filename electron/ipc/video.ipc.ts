import type { IpcMain } from 'electron';
import {
  getAllVideos,
  getVideoById,
  searchVideos,
  updateVideo,
  deleteVideo,
  incrementPlayCount,
  getTagsByVideo,
} from '../services/database.service';
import { importLocalVideo, importYouTubeVideo, regenerateThumbnail } from '../services/import.service';
import { getYouTubeVideoInfo, isValidYouTubeUrl } from '../services/ytdlp.service';
import type { SearchQuery, Video, ImportOptions, YouTubeImportOptions } from '../types/ipc.types';
import fs from 'fs';

export function registerVideoHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('video:getAll', (_event, folderId?: number) => {
    const videos = getAllVideos(folderId);
    return videos.map(video => ({
      ...video,
      tags: getTagsByVideo(video.id),
    }));
  });

  ipcMain.handle('video:getById', (_event, id: number) => {
    const video = getVideoById(id);
    if (video) {
      return {
        ...video,
        tags: getTagsByVideo(video.id),
      };
    }
    return null;
  });

  ipcMain.handle('video:search', (_event, query: SearchQuery) => {
    const videos = searchVideos(query);
    return videos.map(video => ({
      ...video,
      tags: getTagsByVideo(video.id),
    }));
  });

  ipcMain.handle('video:update', (_event, id: number, updates: Partial<Video>) => {
    updateVideo(id, updates);
    const video = getVideoById(id);
    if (video) {
      return {
        ...video,
        tags: getTagsByVideo(video.id),
      };
    }
    return null;
  });

  ipcMain.handle('video:delete', (_event, id: number) => {
    const video = getVideoById(id);
    if (video) {
      // Delete video file
      if (fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }
      // Delete thumbnail
      if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
        fs.unlinkSync(video.thumbnailPath);
      }
    }
    deleteVideo(id);
  });

  ipcMain.handle('video:move', (_event, id: number, folderId: number) => {
    updateVideo(id, { folderId });
  });

  ipcMain.handle('video:incrementPlayCount', (_event, id: number) => {
    incrementPlayCount(id);
  });

  ipcMain.handle('video:import', async (_event, options: ImportOptions) => {
    const video = await importLocalVideo(options);
    return {
      ...video,
      tags: getTagsByVideo(video.id),
    };
  });

  ipcMain.handle('video:importFromYouTube', async (_event, options: YouTubeImportOptions) => {
    const video = await importYouTubeVideo(options);
    return {
      ...video,
      tags: getTagsByVideo(video.id),
    };
  });

  ipcMain.handle('video:regenerateThumbnail', async (_event, id: number) => {
    const video = getVideoById(id);
    if (!video) {
      throw new Error('Video not found');
    }

    const thumbnailPath = await regenerateThumbnail(id, video.filePath, video.duration);
    updateVideo(id, { thumbnailPath });
    return thumbnailPath;
  });

  // YouTube info endpoint
  ipcMain.handle('youtube:getInfo', async (_event, url: string) => {
    if (!isValidYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }
    return getYouTubeVideoInfo(url);
  });

  ipcMain.handle('youtube:validateUrl', (_event, url: string) => {
    return isValidYouTubeUrl(url);
  });
}
