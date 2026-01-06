import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { Video, Folder, Tag, SearchQuery } from '../types/ipc.types';

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'reference-viewer.db');

  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(SCHEMA);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

const SCHEMA = `
-- Folders Table
CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Default root folder
INSERT OR IGNORE INTO folders (id, name, parent_id, sort_order)
VALUES (1, 'All Videos', NULL, 0);

-- Videos Table
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL UNIQUE,
  thumbnail_path TEXT,
  duration REAL NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  codec TEXT,

  source_type TEXT NOT NULL CHECK(source_type IN ('local', 'youtube')),
  source_url TEXT,
  source_path TEXT,
  clip_start REAL,
  clip_end REAL,

  folder_id INTEGER NOT NULL DEFAULT 1,
  is_favorite INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  last_played_at TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET DEFAULT
);

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Video-Tag Junction Table
CREATE TABLE IF NOT EXISTS video_tags (
  video_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),

  PRIMARY KEY (video_id, tag_id),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_folder ON videos(folder_id);
CREATE INDEX IF NOT EXISTS idx_videos_source_type ON videos(source_type);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_video ON video_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_tag ON video_tags(tag_id);

-- Full-Text Search
CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
  title,
  description,
  content='videos',
  content_rowid='id'
);

-- FTS Triggers
CREATE TRIGGER IF NOT EXISTS videos_ai AFTER INSERT ON videos BEGIN
  INSERT INTO videos_fts(rowid, title, description)
  VALUES (new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS videos_ad AFTER DELETE ON videos BEGIN
  INSERT INTO videos_fts(videos_fts, rowid, title, description)
  VALUES ('delete', old.id, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS videos_au AFTER UPDATE ON videos BEGIN
  INSERT INTO videos_fts(videos_fts, rowid, title, description)
  VALUES ('delete', old.id, old.title, old.description);
  INSERT INTO videos_fts(rowid, title, description)
  VALUES (new.id, new.title, new.description);
END;
`;

// =====================
// Video Operations
// =====================

function rowToVideo(row: Record<string, unknown>): Video {
  return {
    id: row.id as number,
    title: row.title as string,
    description: row.description as string | null,
    filePath: row.file_path as string,
    thumbnailPath: row.thumbnail_path as string | null,
    duration: row.duration as number,
    width: row.width as number | null,
    height: row.height as number | null,
    fileSize: row.file_size as number | null,
    codec: row.codec as string | null,
    sourceType: row.source_type as 'local' | 'youtube',
    sourceUrl: row.source_url as string | null,
    sourcePath: row.source_path as string | null,
    clipStart: row.clip_start as number | null,
    clipEnd: row.clip_end as number | null,
    folderId: row.folder_id as number,
    isFavorite: Boolean(row.is_favorite),
    playCount: row.play_count as number,
    lastPlayedAt: row.last_played_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function getAllVideos(folderId?: number): Video[] {
  let sql = 'SELECT * FROM videos';
  const params: unknown[] = [];

  if (folderId !== undefined) {
    sql += ' WHERE folder_id = ?';
    params.push(folderId);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToVideo);
}

export function getVideoById(id: number): Video | null {
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToVideo(row) : null;
}

export function searchVideos(query: SearchQuery): Video[] {
  let sql = 'SELECT DISTINCT v.* FROM videos v';
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Tag filter (JOIN)
  if (query.tagIds && query.tagIds.length > 0) {
    sql += ' INNER JOIN video_tags vt ON v.id = vt.video_id';
    conditions.push(`vt.tag_id IN (${query.tagIds.map(() => '?').join(',')})`);
    params.push(...query.tagIds);
  }

  // Text search (FTS)
  if (query.text) {
    conditions.push('v.id IN (SELECT rowid FROM videos_fts WHERE videos_fts MATCH ?)');
    params.push(query.text + '*');
  }

  // Folder filter
  if (query.folderId !== undefined) {
    conditions.push('v.folder_id = ?');
    params.push(query.folderId);
  }

  // Source type filter
  if (query.sourceType && query.sourceType !== 'all') {
    conditions.push('v.source_type = ?');
    params.push(query.sourceType);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  const sortColumn = {
    createdAt: 'v.created_at',
    title: 'v.title',
    duration: 'v.duration',
    playCount: 'v.play_count',
  }[query.sortBy || 'createdAt'];

  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

  // Pagination
  if (query.limit) {
    sql += ' LIMIT ?';
    params.push(query.limit);

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }
  }

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToVideo);
}

export function insertVideo(video: Omit<Video, 'id' | 'createdAt' | 'updatedAt' | 'playCount' | 'lastPlayedAt' | 'isFavorite'>): Video {
  const stmt = db.prepare(`
    INSERT INTO videos (
      title, description, file_path, thumbnail_path, duration,
      width, height, file_size, codec, source_type, source_url,
      source_path, clip_start, clip_end, folder_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    video.title,
    video.description,
    video.filePath,
    video.thumbnailPath,
    video.duration,
    video.width,
    video.height,
    video.fileSize,
    video.codec,
    video.sourceType,
    video.sourceUrl,
    video.sourcePath,
    video.clipStart,
    video.clipEnd,
    video.folderId
  );

  return getVideoById(result.lastInsertRowid as number)!;
}

export function updateVideo(id: number, updates: Partial<Video>): void {
  const allowedFields = ['title', 'description', 'folder_id', 'is_favorite', 'thumbnail_path'];
  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(snakeKey)) {
      setClauses.push(`${snakeKey} = ?`);
      params.push(value);
    }
  }

  if (setClauses.length === 0) return;

  setClauses.push('updated_at = datetime(\'now\')');
  params.push(id);

  db.prepare(`UPDATE videos SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteVideo(id: number): void {
  db.prepare('DELETE FROM videos WHERE id = ?').run(id);
}

export function incrementPlayCount(id: number): void {
  db.prepare(`
    UPDATE videos
    SET play_count = play_count + 1, last_played_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
}

// =====================
// Folder Operations
// =====================

function rowToFolder(row: Record<string, unknown>): Folder {
  return {
    id: row.id as number,
    name: row.name as string,
    parentId: row.parent_id as number | null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

export function getAllFolders(): Folder[] {
  const rows = db.prepare('SELECT * FROM folders ORDER BY sort_order, name').all() as Record<string, unknown>[];
  return rows.map(rowToFolder);
}

export function getFolderTree(): Folder[] {
  const folders = getAllFolders();
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM videos WHERE folder_id = ?');

  // Add video counts
  for (const folder of folders) {
    const result = countStmt.get(folder.id) as { count: number };
    folder.videoCount = result.count;
  }

  // Build tree structure
  const folderMap = new Map<number, Folder>();
  const roots: Folder[] = [];

  for (const folder of folders) {
    folder.children = [];
    folderMap.set(folder.id, folder);
  }

  for (const folder of folders) {
    if (folder.parentId === null) {
      roots.push(folder);
    } else {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children!.push(folder);
      }
    }
  }

  return roots;
}

export function createFolder(name: string, parentId?: number): Folder {
  const stmt = db.prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)');
  const result = stmt.run(name, parentId ?? null);

  const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  return rowToFolder(row);
}

export function updateFolder(id: number, name: string): void {
  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id);
}

export function deleteFolder(id: number): void {
  // Move videos to root folder before deleting
  db.prepare('UPDATE videos SET folder_id = 1 WHERE folder_id = ?').run(id);
  db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

export function moveFolder(id: number, parentId: number | null): void {
  db.prepare('UPDATE folders SET parent_id = ? WHERE id = ?').run(parentId, id);
}

// =====================
// Tag Operations
// =====================

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as number,
    name: row.name as string,
    color: row.color as string,
    createdAt: row.created_at as string,
  };
}

export function getAllTags(): Tag[] {
  const rows = db.prepare(`
    SELECT t.*, COUNT(vt.video_id) as video_count
    FROM tags t
    LEFT JOIN video_tags vt ON t.id = vt.tag_id
    GROUP BY t.id
    ORDER BY t.name
  `).all() as Record<string, unknown>[];

  return rows.map(row => ({
    ...rowToTag(row),
    videoCount: row.video_count as number,
  }));
}

export function createTag(name: string, color?: string): Tag {
  const stmt = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
  const result = stmt.run(name, color ?? '#6366f1');

  const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  return rowToTag(row);
}

export function updateTag(id: number, name: string, color?: string): void {
  if (color) {
    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  } else {
    db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, id);
  }
}

export function deleteTag(id: number): void {
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
}

export function addTagToVideo(videoId: number, tagId: number): void {
  db.prepare('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)').run(videoId, tagId);
}

export function removeTagFromVideo(videoId: number, tagId: number): void {
  db.prepare('DELETE FROM video_tags WHERE video_id = ? AND tag_id = ?').run(videoId, tagId);
}

export function getTagsByVideo(videoId: number): Tag[] {
  const rows = db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN video_tags vt ON t.id = vt.tag_id
    WHERE vt.video_id = ?
    ORDER BY t.name
  `).all(videoId) as Record<string, unknown>[];

  return rows.map(rowToTag);
}

export function setVideoTags(videoId: number, tagIds: number[]): void {
  const deleteStmt = db.prepare('DELETE FROM video_tags WHERE video_id = ?');
  const insertStmt = db.prepare('INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)');

  db.transaction(() => {
    deleteStmt.run(videoId);
    for (const tagId of tagIds) {
      insertStmt.run(videoId, tagId);
    }
  })();
}
