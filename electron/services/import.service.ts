import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { getVideosPath, getThumbnailsPath } from '../utils/paths';
import { transcodeToVP9, generateGifThumbnail, getVideoMetadata, generateVideoId } from './ffmpeg.service';
import { downloadYouTubeVideo, getYouTubeVideoInfo, isValidYouTubeUrl } from './ytdlp.service';
import { insertVideo, setVideoTags } from './database.service';
import type { Video, ImportOptions, YouTubeImportOptions } from '../types/ipc.types';

function sendProgress(
  taskId: string,
  type: 'download' | 'transcode' | 'thumbnail',
  progress: number,
  status: string,
  message?: string
) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send('progress', {
      taskId,
      type,
      progress,
      status,
      message,
    });
  }
}

export async function importLocalVideo(options: ImportOptions): Promise<Video> {
  const { filePath, title, description, folderId = 1, tagIds = [], taskId: providedTaskId } = options;
  const taskId = providedTaskId || generateVideoId();

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Analyze source video
  sendProgress(taskId, 'transcode', 0, 'analyzing', 'Analyzing video...');
  await getVideoMetadata(filePath); // Validate video file

  // Generate output paths
  const videoId = generateVideoId();
  const outputVideoPath = path.join(getVideosPath(), `${videoId}.webm`);
  const thumbnailPath = path.join(getThumbnailsPath(), `${videoId}.gif`);

  // Transcode to VP9
  sendProgress(taskId, 'transcode', 5, 'transcoding', 'Transcoding video...');
  await transcodeToVP9({
    input: filePath,
    output: outputVideoPath,
    taskId,
  });

  // Get output metadata
  const outputMetadata = await getVideoMetadata(outputVideoPath);

  // Generate GIF thumbnail
  sendProgress(taskId, 'thumbnail', 90, 'generating-thumbnail', 'Generating thumbnail...');
  await generateGifThumbnail(outputVideoPath, thumbnailPath, outputMetadata.duration);

  // Insert into database
  sendProgress(taskId, 'thumbnail', 95, 'saving', 'Saving to database...');
  const videoTitle = title || path.basename(filePath, path.extname(filePath));

  const video = insertVideo({
    title: videoTitle,
    description: description || null,
    filePath: outputVideoPath,
    thumbnailPath,
    duration: outputMetadata.duration,
    width: outputMetadata.width,
    height: outputMetadata.height,
    fileSize: outputMetadata.fileSize,
    codec: 'vp9',
    sourceType: 'local',
    sourceUrl: null,
    sourcePath: filePath,
    clipStart: null,
    clipEnd: null,
    folderId,
  });

  // Set tags if provided
  if (tagIds.length > 0) {
    setVideoTags(video.id, tagIds);
  }

  sendProgress(taskId, 'thumbnail', 100, 'complete', 'Import complete!');

  return video;
}

export async function importYouTubeVideo(options: YouTubeImportOptions): Promise<Video> {
  const { url, title, clipStart, clipEnd, folderId = 1, tagIds = [], taskId: providedTaskId } = options;
  const taskId = providedTaskId || generateVideoId();

  // Validate URL
  if (!isValidYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL');
  }

  // Get video info from YouTube
  sendProgress(taskId, 'download', 0, 'fetching-info', 'Fetching video info...');
  const videoInfo = await getYouTubeVideoInfo(url);

  // Generate output paths
  const videoId = generateVideoId();
  const outputFilename = `${videoId}.webm`;
  const outputVideoPath = path.join(getVideosPath(), outputFilename);
  const thumbnailPath = path.join(getThumbnailsPath(), `${videoId}.gif`);

  // Download video
  sendProgress(taskId, 'download', 5, 'downloading', 'Downloading video...');
  await downloadYouTubeVideo({
    url,
    outputDir: getVideosPath(),
    outputFilename,
    clipStart,
    clipEnd,
    taskId,
  });

  // Get output metadata
  const outputMetadata = await getVideoMetadata(outputVideoPath);

  // Generate GIF thumbnail
  sendProgress(taskId, 'thumbnail', 90, 'generating-thumbnail', 'Generating thumbnail...');
  await generateGifThumbnail(outputVideoPath, thumbnailPath, outputMetadata.duration);

  // Insert into database
  sendProgress(taskId, 'thumbnail', 95, 'saving', 'Saving to database...');
  const videoTitle = title || videoInfo.title;

  const video = insertVideo({
    title: videoTitle,
    description: null,
    filePath: outputVideoPath,
    thumbnailPath,
    duration: outputMetadata.duration,
    width: outputMetadata.width,
    height: outputMetadata.height,
    fileSize: outputMetadata.fileSize,
    codec: 'vp9',
    sourceType: 'youtube',
    sourceUrl: url,
    sourcePath: null,
    clipStart: clipStart || null,
    clipEnd: clipEnd || null,
    folderId,
  });

  // Set tags if provided
  if (tagIds.length > 0) {
    setVideoTags(video.id, tagIds);
  }

  sendProgress(taskId, 'thumbnail', 100, 'complete', 'Import complete!');

  return video;
}

export async function regenerateThumbnail(_videoId: number, filePath: string, duration: number): Promise<string> {
  const thumbnailPath = path.join(getThumbnailsPath(), `${path.basename(filePath, '.webm')}.gif`);

  await generateGifThumbnail(filePath, thumbnailPath, duration);

  return thumbnailPath;
}
