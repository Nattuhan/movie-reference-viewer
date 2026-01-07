# Reference Viewer

動画リファレンスを整理・閲覧するためのデスクトップアプリ。YouTubeやローカルファイルから動画をインポートし、フォルダやタグで整理して、GIFサムネイルでプレビューできます。

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 機能

- **YouTubeインポート**: 開始・終了時間を指定してクリップをダウンロード
- **ローカルインポート**: PCから動画ファイルをインポート
- **GIFサムネイル**: ホバーでGIFアニメーションプレビュー
- **フォルダ整理**: ドラッグ＆ドロップでフォルダに整理
- **タグシステム**: カラータグで動画を分類
- **動画プレイヤー**: 速度調整、ループ、音量設定付き
- **メモ機能**: 各動画にメモを追加
- **元動画を開く**: YouTubeの元動画をクリップの開始位置で開く

## ダウンロード

[Releases](https://github.com/Nattuhan/movie-reference-viewer/releases) から最新版をダウンロード:

- **Windows**: `Reference-Viewer-Setup-x.x.x.exe`
- **Mac (Intel)**: `Reference-Viewer-x.x.x.dmg`
- **Mac (Apple Silicon)**: `Reference-Viewer-x.x.x-arm64.dmg`

## 開発

### 必要なもの

- Node.js 20+
- pnpm

### セットアップ

```bash
# 依存関係をインストール
pnpm install

# ffmpegとyt-dlpバイナリをダウンロード
pnpm download-binaries

# 開発サーバーを起動
pnpm dev
```

### ビルド

```bash
# 現在のプラットフォーム向けにビルド
pnpm dist

# 特定のプラットフォーム向けにビルド
pnpm dist:win
pnpm dist:mac
```

## 技術スタック

- **フロントエンド**: React, TypeScript, Zustand
- **バックエンド**: Electron, better-sqlite3
- **動画処理**: ffmpeg (LGPL), yt-dlp
- **ビルド**: Vite, electron-builder

## ライセンス

MIT

### サードパーティライセンス

- [ffmpeg](https://ffmpeg.org/) - LGPL v2.1+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Unlicense
