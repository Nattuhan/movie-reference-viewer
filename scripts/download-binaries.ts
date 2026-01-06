/**
 * Downloads ffmpeg (LGPL) and yt-dlp binaries for the current platform.
 * Run with: npx tsx scripts/download-binaries.ts
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createUnzip } from 'zlib';
import { Extract } from 'unzip-stream';

const PLATFORM = process.platform as 'win32' | 'darwin';
const BIN_DIR = path.join(__dirname, '..', 'bin');

interface BinaryConfig {
  url: string;
  extractPath?: string;
  filename: string;
  isZip?: boolean;
}

const BINARIES: Record<string, Record<'win32' | 'darwin', BinaryConfig>> = {
  ffmpeg: {
    win32: {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-lgpl.zip',
      extractPath: 'ffmpeg-master-latest-win64-lgpl/bin',
      filename: 'ffmpeg.exe',
      isZip: true,
    },
    darwin: {
      url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
      filename: 'ffmpeg',
      isZip: true,
    },
  },
  ffprobe: {
    win32: {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-lgpl.zip',
      extractPath: 'ffmpeg-master-latest-win64-lgpl/bin',
      filename: 'ffprobe.exe',
      isZip: true,
    },
    darwin: {
      url: 'https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip',
      filename: 'ffprobe',
      isZip: true,
    },
  },
  'yt-dlp': {
    win32: {
      url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      filename: 'yt-dlp.exe',
      isZip: false,
    },
    darwin: {
      url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
      filename: 'yt-dlp',
      isZip: false,
    },
  },
};

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);

    const request = (currentUrl: string) => {
      const parsedUrl = new URL(currentUrl);
      https.get(currentUrl, { headers: { 'User-Agent': 'Reference-Viewer' } }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Handle relative redirects
            const fullRedirectUrl = redirectUrl.startsWith('/')
              ? `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`
              : redirectUrl;
            request(fullRedirectUrl);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            process.stdout.write(`\r  Progress: ${progress}%`);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {}); // Delete partial file
        reject(err);
      });
    };

    request(url);
  });
}

async function extractZip(zipPath: string, destDir: string, extractPath?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(zipPath)
      .pipe(Extract({ path: destDir }));

    stream.on('close', resolve);
    stream.on('error', reject);
  });
}

async function downloadBinary(name: string, config: BinaryConfig): Promise<void> {
  const destDir = path.join(BIN_DIR, name === 'ffprobe' ? 'ffmpeg' : name, PLATFORM);

  // Create directory
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, config.filename);

  // Skip if already exists
  if (fs.existsSync(destPath)) {
    console.log(`  ${name} already exists, skipping...`);
    return;
  }

  console.log(`  Downloading ${name}...`);

  if (config.isZip) {
    const tempZip = path.join(BIN_DIR, `${name}-temp.zip`);

    try {
      await downloadFile(config.url, tempZip);

      console.log(`  Extracting ${name}...`);
      const tempExtract = path.join(BIN_DIR, `${name}-temp-extract`);
      fs.mkdirSync(tempExtract, { recursive: true });

      await extractZip(tempZip, tempExtract, config.extractPath);

      // Find and move the binary
      let sourcePath: string;
      if (config.extractPath) {
        sourcePath = path.join(tempExtract, config.extractPath, config.filename);
      } else {
        sourcePath = path.join(tempExtract, config.filename);
      }

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      } else {
        // Try to find the file recursively
        const found = findFile(tempExtract, config.filename);
        if (found) {
          fs.copyFileSync(found, destPath);
        } else {
          throw new Error(`Could not find ${config.filename} in extracted archive`);
        }
      }

      // Cleanup
      fs.rmSync(tempZip, { force: true });
      fs.rmSync(tempExtract, { recursive: true, force: true });
    } catch (error) {
      fs.rmSync(tempZip, { force: true });
      throw error;
    }
  } else {
    await downloadFile(config.url, destPath);
  }

  // Make executable on unix
  if (PLATFORM === 'darwin') {
    fs.chmodSync(destPath, 0o755);
  }

  console.log(`  ${name} downloaded successfully!`);
}

function findFile(dir: string, filename: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(fullPath, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return fullPath;
    }
  }

  return null;
}

async function main() {
  console.log(`\nDownloading binaries for ${PLATFORM}...\n`);

  // Create bin directory
  fs.mkdirSync(BIN_DIR, { recursive: true });

  // Download ffmpeg and ffprobe (they come from the same package on Windows)
  console.log('FFmpeg (LGPL):');
  const ffmpegConfig = BINARIES.ffmpeg[PLATFORM];
  await downloadBinary('ffmpeg', ffmpegConfig);

  console.log('\nFFprobe:');
  const ffprobeConfig = BINARIES.ffprobe[PLATFORM];
  await downloadBinary('ffprobe', ffprobeConfig);

  console.log('\nyt-dlp:');
  const ytdlpConfig = BINARIES['yt-dlp'][PLATFORM];
  await downloadBinary('yt-dlp', ytdlpConfig);

  console.log('\nAll binaries downloaded successfully!\n');
}

main().catch((error) => {
  console.error('Error downloading binaries:', error);
  process.exit(1);
});
