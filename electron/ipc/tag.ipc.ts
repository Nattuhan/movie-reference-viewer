import type { IpcMain } from 'electron';
import {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToVideo,
  removeTagFromVideo,
  getTagsByVideo,
  setVideoTags,
} from '../services/database.service';

export function registerTagHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('tag:getAll', () => {
    return getAllTags();
  });

  ipcMain.handle('tag:create', (_event, name: string, color?: string) => {
    return createTag(name, color);
  });

  ipcMain.handle('tag:update', (_event, id: number, name: string, color?: string) => {
    updateTag(id, name, color);
  });

  ipcMain.handle('tag:delete', (_event, id: number) => {
    deleteTag(id);
  });

  ipcMain.handle('tag:addToVideo', (_event, videoId: number, tagId: number) => {
    addTagToVideo(videoId, tagId);
  });

  ipcMain.handle('tag:removeFromVideo', (_event, videoId: number, tagId: number) => {
    removeTagFromVideo(videoId, tagId);
  });

  ipcMain.handle('tag:getByVideo', (_event, videoId: number) => {
    return getTagsByVideo(videoId);
  });

  ipcMain.handle('tag:setForVideo', (_event, videoId: number, tagIds: number[]) => {
    setVideoTags(videoId, tagIds);
  });
}
