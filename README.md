# Reference Viewer

A desktop application for organizing and viewing video references. Import videos from YouTube or local files, organize them with folders and tags, and quickly browse with GIF thumbnail previews.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **YouTube Import**: Download clips from YouTube with custom start/end times
- **Local Import**: Import video files from your computer
- **GIF Thumbnails**: Hover to preview videos as animated GIFs
- **Folder Organization**: Organize videos into folders with drag-and-drop
- **Tag System**: Add colored tags to categorize videos
- **Video Player**: Built-in player with speed control, loop, and volume settings
- **Memo/Notes**: Add notes to each video
- **Open Original**: Jump to the original YouTube video at the clip's start time

## Download

Download the latest version from [Releases](https://github.com/Nattuhan/movie-reference-viewer/releases):

- **Windows**: `Reference-Viewer-Setup-x.x.x.exe`
- **Mac (Intel)**: `Reference-Viewer-x.x.x.dmg`
- **Mac (Apple Silicon)**: `Reference-Viewer-x.x.x-arm64.dmg`

## Development

### Prerequisites

- Node.js 20+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Download ffmpeg and yt-dlp binaries
pnpm download-binaries

# Start development server
pnpm dev
```

### Build

```bash
# Build for current platform
pnpm dist

# Build for specific platform
pnpm dist:win
pnpm dist:mac
```

## Tech Stack

- **Frontend**: React, TypeScript, Zustand
- **Backend**: Electron, better-sqlite3
- **Video Processing**: ffmpeg (LGPL), yt-dlp
- **Build**: Vite, electron-builder

## License

MIT

### Third-party Licenses

- [ffmpeg](https://ffmpeg.org/) - LGPL v2.1+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Unlicense
