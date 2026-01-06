import type { IpcMain } from 'electron';
import {
  getAllFolders,
  getFolderTree,
  createFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
} from '../services/database.service';

export function registerFolderHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('folder:getAll', () => {
    return getAllFolders();
  });

  ipcMain.handle('folder:getTree', () => {
    return getFolderTree();
  });

  ipcMain.handle('folder:create', (_event, name: string, parentId?: number) => {
    return createFolder(name, parentId);
  });

  ipcMain.handle('folder:rename', (_event, id: number, name: string) => {
    updateFolder(id, name);
  });

  ipcMain.handle('folder:delete', (_event, id: number) => {
    // Prevent deleting root folder
    if (id === 1) {
      throw new Error('Cannot delete root folder');
    }
    deleteFolder(id);
  });

  ipcMain.handle('folder:move', (_event, id: number, parentId: number | null) => {
    // Prevent moving root folder
    if (id === 1) {
      throw new Error('Cannot move root folder');
    }
    moveFolder(id, parentId);
  });
}
