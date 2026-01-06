import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useVideoStore, type Video } from '../../stores/videoStore';
import { useFolderStore } from '../../stores/folderStore';
import { ContextMenu, type MenuItem } from '../common/ContextMenu';
import { RenameDialog } from '../common/RenameDialog';
import { TagEditDialog } from '../common/TagEditDialog';
import { MemoEditDialog } from '../common/MemoEditDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './VideoCard.css';

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { openVideoModal, viewMode } = useUIStore();
  const { updateVideo, removeVideo, fetchVideos } = useVideoStore();
  const { folders } = useFolderStore();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Dialog states
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isTagEditOpen, setIsTagEditOpen] = useState(false);
  const [isMemoEditOpen, setIsMemoEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleClick = () => {
    openVideoModal(video);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRename = async (newName: string) => {
    await window.electronAPI.video.update(video.id, { title: newName });
    updateVideo(video.id, { title: newName });
  };

  const handleTagsSave = async (tagIds: number[]) => {
    await window.electronAPI.tag.setForVideo(video.id, tagIds);
    fetchVideos();
  };

  const handleMemoSave = async (memo: string) => {
    await window.electronAPI.video.update(video.id, { description: memo });
    updateVideo(video.id, { description: memo });
  };

  const handleOpenInFolder = () => {
    window.electronAPI.app.showInFolder(video.filePath);
  };

  const handleOpenOriginalUrl = () => {
    if (video.sourceUrl) {
      window.electronAPI.app.openExternal(video.sourceUrl);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleteConfirmOpen(false);
    await window.electronAPI.video.delete(video.id);
    removeVideo(video.id);
  };

  const handleMoveToFolder = async (folderId: number) => {
    await window.electronAPI.video.update(video.id, { folderId });
    updateVideo(video.id, { folderId });
    fetchVideos();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('video/id', video.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  // Flatten folders for menu
  const flattenFolders = (folderList: typeof folders, depth = 0): { id: number; name: string; depth: number }[] => {
    const result: { id: number; name: string; depth: number }[] = [];
    for (const folder of folderList) {
      result.push({ id: folder.id, name: folder.name, depth });
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, depth + 1));
      }
    }
    return result;
  };

  const allFolders = flattenFolders(folders);

  // Build folder submenu with Uncategorized first, then user folders
  const folderSubmenu = [
    {
      label: 'Uncategorized',
      onClick: () => handleMoveToFolder(1),
      checked: video.folderId === 1,
    },
    ...allFolders
      .filter((f) => f.id !== 1)
      .map((folder) => ({
        label: '  '.repeat(folder.depth) + folder.name,
        onClick: () => handleMoveToFolder(folder.id),
        checked: video.folderId === folder.id,
      })),
  ];

  const contextMenuItems: MenuItem[] = [
    { label: 'Rename', onClick: () => setIsRenameOpen(true) },
    { label: 'Edit Tags', onClick: () => setIsTagEditOpen(true) },
    { label: 'Edit Memo', onClick: () => setIsMemoEditOpen(true) },
    { label: '', onClick: () => {}, divider: true },
    {
      label: 'Move to Folder',
      onClick: () => {},
      submenu: folderSubmenu,
    },
    { label: '', onClick: () => {}, divider: true },
    { label: 'Open File Location', onClick: handleOpenInFolder },
    ...(video.sourceUrl
      ? [{ label: 'Open Original URL', onClick: handleOpenOriginalUrl }]
      : []),
    { label: '', onClick: () => {}, divider: true },
    { label: 'Delete', onClick: handleDeleteClick, danger: true },
  ];

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert path to proper file URL (works on Windows and Mac)
  const toFileUrl = (filePath: string) => {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.startsWith('/')
      ? `file://${normalized}`
      : `file:///${normalized}`;
  };

  const thumbnailUrl = video.thumbnailPath ? toFileUrl(video.thumbnailPath) : null;

  const cardContent = (
    <>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      <RenameDialog
        isOpen={isRenameOpen}
        currentName={video.title}
        onClose={() => setIsRenameOpen(false)}
        onRename={handleRename}
      />

      <TagEditDialog
        isOpen={isTagEditOpen}
        videoId={video.id}
        currentTagIds={video.tags?.map((t) => t.id) || []}
        onClose={() => setIsTagEditOpen(false)}
        onSave={handleTagsSave}
      />

      <MemoEditDialog
        isOpen={isMemoEditOpen}
        currentMemo={video.description}
        onClose={() => setIsMemoEditOpen(false)}
        onSave={handleMemoSave}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Video"
        message={`"${video.title}" を削除しますか？`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </>
  );

  if (viewMode === 'list') {
    return (
      <>
        <div
          className="video-card list"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          draggable
          onDragStart={handleDragStart}
        >
          <div className="thumbnail-container">
            {thumbnailUrl && !imageError ? (
              <img
                src={thumbnailUrl}
                alt={video.title}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="thumbnail-placeholder">🎬</div>
            )}
            <span className="duration-badge">{formatDuration(video.duration)}</span>
          </div>

          <div className="video-info">
            <h3 className="video-title">{video.title}</h3>
            <div className="video-meta">
              {video.sourceType === 'youtube' && <span className="source-badge youtube">YouTube</span>}
              {video.tags && video.tags.length > 0 && (
                <div className="video-tags">
                  {video.tags.slice(0, 3).map((tag) => (
                    <span key={tag.id} className="tag-badge">{tag.name}</span>
                  ))}
                  {video.tags.length > 3 && (
                    <span className="more-tags">+{video.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {cardContent}
      </>
    );
  }

  return (
    <>
      <div
        className="video-card grid"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable
        onDragStart={handleDragStart}
      >
        <div className="thumbnail-container">
          {thumbnailUrl && !imageError ? (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className={isHovered ? 'playing' : ''}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="thumbnail-placeholder">🎬</div>
          )}

          <span className="duration-badge">{formatDuration(video.duration)}</span>

          {video.sourceType === 'youtube' && (
            <span className="source-badge youtube">YouTube</span>
          )}
        </div>

        <div className="video-info">
          <h3 className="video-title">{video.title}</h3>

          {video.tags && video.tags.length > 0 && (
            <div className="video-tags">
              {video.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="tag-badge">{tag.name}</span>
              ))}
              {video.tags.length > 3 && (
                <span className="more-tags">+{video.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {cardContent}
    </>
  );
}
