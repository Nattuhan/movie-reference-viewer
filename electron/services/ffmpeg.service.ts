import { spawn } from 'child_process';
import { BrowserWindow } from 'electron';
import { getFFmpegPath, getFFprobePath } from '../utils/paths';
import type { VideoMetadata } from '../types/ipc.types';

interface TranscodeOptions {
  input: string;
  output: string;
  clipStart?: number;
  clipEnd?: number;
  taskId: string;
}

export async function transcodeToVP9(options: TranscodeOptions): Promise<void> {
  const { input, output, clipStart, clipEnd, taskId } = options;
  const ffmpegPath = getFFmpegPath();

  const args: string[] = [
    '-y',
    '-i', input,
  ];

  // Clip time specification
  if (clipStart !== undefined) {
    args.push('-ss', String(clipStart));
  }
  if (clipEnd !== undefined) {
    const duration = clipEnd - (clipStart || 0);
    args.push('-t', String(duration));
  }

  // VP9 encoding settings (LGPL compatible)
  args.push(
    '-c:v', 'libvpx-vp9',
    '-crf', '32',
    '-b:v', '0',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vf', 'scale=-2:720',
    '-row-mt', '1',
    '-progress', 'pipe:1',
    output
  );

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);

    let duration = 0;

    proc.stderr.on('data', (data: Buffer) => {
      const str = data.toString();
      // Get duration from input
      const durationMatch = str.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
      if (durationMatch) {
        const [, h, m, s] = durationMatch;
        duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
      }
    });

    proc.stdout.on('data', (data: Buffer) => {
      const str = data.toString();
      // Parse progress
      const timeMatch = str.match(/out_time_ms=(\d+)/);
      if (timeMatch && duration > 0) {
        const currentMs = parseInt(timeMatch[1]);
        const progress = Math.min(100, (currentMs / 1000 / duration) * 100);

        // Send progress to renderer
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send('progress', {
            taskId,
            type: 'transcode',
            progress: Math.round(progress),
            status: 'transcoding',
          });
        }
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

export async function generateGifThumbnail(
  videoPath: string,
  outputPath: string,
  duration: number
): Promise<void> {
  const ffmpegPath = getFFmpegPath();

  // Generate GIF from middle of video (5 seconds)
  const startTime = Math.max(0, (duration / 2) - 2.5);

  const args = [
    '-y',
    '-ss', String(startTime),
    '-i', videoPath,
    '-t', '5',
    '-vf', [
      'fps=10',
      'scale=320:-1:flags=lanczos',
      'split[s0][s1]',
      '[s0]palettegen=max_colors=128[p]',
      '[s1][p]paletteuse=dither=bayer',
    ].join(','),
    '-loop', '0',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`GIF generation failed: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

export async function generateStaticThumbnail(
  videoPath: string,
  outputPath: string,
  duration: number
): Promise<void> {
  const ffmpegPath = getFFmpegPath();

  // Get frame from middle of video
  const seekTime = Math.max(0, duration / 2);

  const args = [
    '-y',
    '-ss', String(seekTime),
    '-i', videoPath,
    '-vframes', '1',
    '-vf', 'scale=320:-1',
    outputPath.replace('.gif', '.jpg'),
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Thumbnail generation failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  const ffprobePath = getFFprobePath();

  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    videoPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, args);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output);
          const videoStream = data.streams?.find((s: Record<string, unknown>) => s.codec_type === 'video');

          resolve({
            duration: parseFloat(data.format?.duration || '0'),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            codec: videoStream?.codec_name || 'unknown',
            fileSize: parseInt(data.format?.size || '0'),
          });
        } catch (e) {
          reject(new Error(`Failed to parse ffprobe output: ${e}`));
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

export function generateVideoId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
