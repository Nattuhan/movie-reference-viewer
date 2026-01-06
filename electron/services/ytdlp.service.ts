import { spawn } from 'child_process';
import path from 'path';
import { BrowserWindow } from 'electron';
import { getYtDlpPath, getFFmpegPath } from '../utils/paths';
import type { YouTubeVideoInfo } from '../types/ipc.types';

interface DownloadOptions {
  url: string;
  outputDir: string;
  outputFilename: string;
  clipStart?: number;
  clipEnd?: number;
  taskId: string;
}

export async function getYouTubeVideoInfo(url: string): Promise<YouTubeVideoInfo> {
  const ytdlpPath = getYtDlpPath();

  const args = [
    '--dump-json',
    '--no-download',
    '--no-warnings',
    url,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, args);
    let output = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          resolve({
            id: info.id,
            title: info.title,
            duration: info.duration || 0,
            thumbnail: info.thumbnail || '',
          });
        } catch (e) {
          reject(new Error(`Failed to parse yt-dlp output: ${e}`));
        }
      } else {
        reject(new Error(`yt-dlp info failed: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

export async function downloadYouTubeVideo(options: DownloadOptions): Promise<string> {
  const { url, outputDir, outputFilename, clipStart, clipEnd, taskId } = options;
  const ytdlpPath = getYtDlpPath();
  const ffmpegPath = getFFmpegPath();

  const outputTemplate = path.join(outputDir, outputFilename);

  const args = [
    '--ffmpeg-location', path.dirname(ffmpegPath),
    '-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best',
    '--merge-output-format', 'webm',
    '-o', outputTemplate,
    '--progress',
    '--newline',
    '--no-warnings',
  ];

  // Clip range specification
  if (clipStart !== undefined || clipEnd !== undefined) {
    const start = clipStart !== undefined ? clipStart : 0;
    const end = clipEnd !== undefined ? clipEnd : 'inf';
    const section = `*${start}-${end}`;
    console.log(`[yt-dlp] Clipping: clipStart=${clipStart}, clipEnd=${clipEnd}, section=${section}`);
    args.push('--download-sections', section);
    // Force keyframes at cuts for accurate clipping (requires re-encode)
    args.push('--force-keyframes-at-cuts');
  }

  args.push(url);
  console.log(`[yt-dlp] Command args:`, args.join(' '));

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, args);
    let downloadedFile = outputTemplate;

    proc.stdout.on('data', (data: Buffer) => {
      const str = data.toString();

      // Parse progress percentage
      const progressMatch = str.match(/(\d+\.?\d*)%/);
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);

        // Send progress to renderer
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send('progress', {
            taskId,
            type: 'download',
            progress: Math.round(progress),
            status: 'downloading',
          });
        }
      }

      // Get output filename
      const destMatch = str.match(/Destination: (.+)$/m);
      if (destMatch) {
        downloadedFile = destMatch[1].trim();
      }

      const mergeMatch = str.match(/\[Merger\] Merging formats into "(.+)"$/m);
      if (mergeMatch) {
        downloadedFile = mergeMatch[1].trim();
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      console.error('yt-dlp stderr:', data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(downloadedFile);
      } else {
        reject(new Error(`yt-dlp download failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

export function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  ];
  return patterns.some(p => p.test(url));
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
