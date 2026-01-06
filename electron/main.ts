import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './services/database.service';
import { registerVideoHandlers } from './ipc/video.ipc';
import { registerFolderHandlers } from './ipc/folder.ipc';
import { registerTagHandlers } from './ipc/tag.ipc';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3
      webSecurity: false, // Allow loading local files via file:// protocol
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f0f14',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerAppHandlers() {
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getDataPath', () => app.getPath('userData'));
  ipcMain.handle('app:openExternal', (_event, url: string) => shell.openExternal(url));
  ipcMain.handle('app:showInFolder', (_event, filePath: string) => shell.showItemInFolder(filePath));
}

function registerDialogHandlers() {
  ipcMain.handle('dialog:openFile', async (_event, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters ?? [
        { name: 'Videos', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:openFiles', async (_event, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: filters ?? [
        { name: 'Videos', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize database
  initDatabase();

  // Register all IPC handlers
  registerAppHandlers();
  registerDialogHandlers();
  registerVideoHandlers(ipcMain);
  registerFolderHandlers(ipcMain);
  registerTagHandlers(ipcMain);

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
