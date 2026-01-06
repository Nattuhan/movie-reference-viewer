import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

export function getAppPath(): string {
  return app.getAppPath();
}

export function getUserDataPath(): string {
  return app.getPath('userData');
}

export function getVideosPath(): string {
  const videosPath = path.join(getUserDataPath(), 'videos');
  if (!fs.existsSync(videosPath)) {
    fs.mkdirSync(videosPath, { recursive: true });
  }
  return videosPath;
}

export function getThumbnailsPath(): string {
  const thumbnailsPath = path.join(getUserDataPath(), 'thumbnails');
  if (!fs.existsSync(thumbnailsPath)) {
    fs.mkdirSync(thumbnailsPath, { recursive: true });
  }
  return thumbnailsPath;
}

export function getTempPath(): string {
  const tempPath = path.join(getUserDataPath(), 'temp');
  if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath, { recursive: true });
  }
  return tempPath;
}

export function getBinPath(): string {
  if (isDev) {
    return path.join(getAppPath(), 'bin');
  }
  return path.join(process.resourcesPath, 'bin');
}

export function getFFmpegPath(): string {
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  const ffmpegPath = path.join(getBinPath(), 'ffmpeg', platform, `ffmpeg${ext}`);

  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`ffmpeg not found at: ${ffmpegPath}. Run 'pnpm download-binaries' first.`);
  }

  return ffmpegPath;
}

export function getFFprobePath(): string {
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  const ffprobePath = path.join(getBinPath(), 'ffmpeg', platform, `ffprobe${ext}`);

  if (!fs.existsSync(ffprobePath)) {
    throw new Error(`ffprobe not found at: ${ffprobePath}. Run 'pnpm download-binaries' first.`);
  }

  return ffprobePath;
}

export function getYtDlpPath(): string {
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  const ytdlpPath = path.join(getBinPath(), 'yt-dlp', platform, `yt-dlp${ext}`);

  if (!fs.existsSync(ytdlpPath)) {
    throw new Error(`yt-dlp not found at: ${ytdlpPath}. Run 'pnpm download-binaries' first.`);
  }

  return ytdlpPath;
}

export function generateVideoFilename(id: string, ext: string = 'webm'): string {
  return path.join(getVideosPath(), `${id}.${ext}`);
}

export function generateThumbnailFilename(id: string): string {
  return path.join(getThumbnailsPath(), `${id}.gif`);
}
