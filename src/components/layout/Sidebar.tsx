import { useEffect, useState } from 'react';
import { useFolderStore } from '../../stores/folderStore';
import { useTagStore } from '../../stores/tagStore';
import { useVideoStore } from '../../stores/videoStore';
import { ContextMenu, type MenuItem } from '../common/ContextMenu';
import { RenameDialog } from '../common/RenameDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './Sidebar.css';

export function Sidebar() {
  const { folders, fetchFolders, renameFolder, deleteFolder } = useFolderStore();
  const { tags, fetchTags, deleteTag } = useTagStore();
  const { currentFolderId, setCurrentFolder, selectedTagIds, setSelectedTags, fetchVideos } = useVideoStore();

  // Context menu states
  const [tagContextMenu, setTagContextMenu] = useState<{ x: number; y: number; tagId: number } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folderId: number } | null>(null);

  // Dialog states
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<{ id: number; name: string } | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<number | null>(null);

  // Drag state
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);

  useEffect(() => {
    fetchFolders();
    fetchTags();
  }, [fetchFolders, fetchTags]);

  const handleFolderClick = (folderId: number | null) => {
    setCurrentFolder(folderId);
  };

  const handleTagClick = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTags(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTagIds, tagId]);
    }
  };

  const handleTagContextMenu = (e: React.MouseEvent, tagId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setTagContextMenu({ x: e.clientX, y: e.clientY, tagId });
  };

  const handleDeleteTagClick = (tagId: number) => {
    setDeletingTagId(tagId);
  };

  const handleDeleteTagConfirm = async () => {
    if (deletingTagId) {
      await deleteTag(deletingTagId);
      setSelectedTags(selectedTagIds.filter((id) => id !== deletingTagId));
      fetchVideos();
    }
    setDeletingTagId(null);
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (folderId !== 1) { // Don't show context menu for root folder
      setFolderContextMenu({ x: e.clientX, y: e.clientY, folderId });
    }
  };

  const handleRenameFolder = async (newName: string) => {
    if (renamingFolder) {
      await renameFolder(renamingFolder.id, newName);
    }
  };

  const handleDeleteFolderClick = (folderId: number) => {
    setDeletingFolderId(folderId);
  };

  const handleDeleteFolderConfirm = async () => {
    if (deletingFolderId) {
      await deleteFolder(deletingFolderId);
      if (currentFolderId === deletingFolderId) {
        setCurrentFolder(null);
      }
      fetchVideos();
    }
    setDeletingFolderId(null);
  };

  const handleCreateFolder = async (name: string) => {
    await window.electronAPI.folder.create(name);
    fetchFolders();
  };

  const handleDragOver = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const videoId = e.dataTransfer.getData('video/id');
    if (videoId) {
      await window.electronAPI.video.update(parseInt(videoId), { folderId });
      fetchVideos();
      fetchFolders();
    }
  };

  const renderFolder = (folder: typeof folders[0], depth: number = 0) => (
    <li key={folder.id}>
      <button
        className={`folder-item ${currentFolderId === folder.id ? 'active' : ''} ${dragOverFolderId === folder.id ? 'drag-over' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => handleFolderClick(folder.id)}
        onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
        onDragOver={(e) => handleDragOver(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder.id)}
      >
        <span className="folder-icon">{folder.id === 1 ? '🎬' : '📁'}</span>
        <span className="folder-name">{folder.name}</span>
        {folder.videoCount !== undefined && folder.videoCount > 0 && (
          <span className="folder-count">{folder.videoCount}</span>
        )}
      </button>
      {folder.children && folder.children.length > 0 && (
        <ul className="folder-children">
          {folder.children.map((child) => renderFolder(child, depth + 1))}
        </ul>
      )}
    </li>
  );

  const tagMenuItems: MenuItem[] = tagContextMenu ? [
    { label: 'Delete Tag', onClick: () => handleDeleteTagClick(tagContextMenu.tagId), danger: true },
  ] : [];

  const folderMenuItems: MenuItem[] = folderContextMenu ? [
    {
      label: 'Rename',
      onClick: () => {
        const folder = folders.find((f) => f.id === folderContextMenu.folderId);
        if (folder) {
          setRenamingFolder({ id: folder.id, name: folder.name });
        }
      },
    },
    { label: '', onClick: () => {}, divider: true },
    { label: 'Delete Folder', onClick: () => handleDeleteFolderClick(folderContextMenu.folderId), danger: true },
  ] : [];

  return (
    <aside className="sidebar">
      <nav>
        <section className="sidebar-section">
          <div className="section-header">
            <h2>Folders</h2>
            <button className="add-btn" onClick={() => setIsNewFolderOpen(true)}>+</button>
          </div>
          <ul className="folder-list">
            {/* Fixed: All Videos */}
            <li>
              <button
                className={`folder-item ${currentFolderId === null ? 'active' : ''}`}
                onClick={() => handleFolderClick(null)}
              >
                <span className="folder-icon">🎬</span>
                <span className="folder-name">All Videos</span>
              </button>
            </li>
            {/* Fixed: Uncategorized (folderId = 1) */}
            <li>
              <button
                className={`folder-item ${currentFolderId === 1 ? 'active' : ''}`}
                onClick={() => handleFolderClick(1)}
                onDragOver={(e) => handleDragOver(e, 1)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 1)}
              >
                <span className="folder-icon">📂</span>
                <span className="folder-name">Uncategorized</span>
              </button>
            </li>
            {/* User-created folders (exclude default folder id=1) */}
            {folders.filter(f => f.id !== 1).map((folder) => renderFolder(folder))}
          </ul>
        </section>

        <section className="sidebar-section">
          <h2>Tags</h2>
          {tags.length === 0 ? (
            <p className="empty-message">No tags yet</p>
          ) : (
            <div className="tag-list">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`tag-chip ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
                  style={{ '--tag-color': tag.color } as React.CSSProperties}
                  onClick={() => handleTagClick(tag.id)}
                  onContextMenu={(e) => handleTagContextMenu(e, tag.id)}
                >
                  {tag.name}
                  {tag.videoCount !== undefined && tag.videoCount > 0 && (
                    <span className="tag-count">{tag.videoCount}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="sidebar-section">
          <h2>Source</h2>
          <div className="source-filters">
            <SourceButton type="all" />
            <SourceButton type="local" />
            <SourceButton type="youtube" />
          </div>
        </section>
      </nav>

      {/* Context Menus */}
      {tagContextMenu && (
        <ContextMenu
          x={tagContextMenu.x}
          y={tagContextMenu.y}
          items={tagMenuItems}
          onClose={() => setTagContextMenu(null)}
        />
      )}

      {folderContextMenu && (
        <ContextMenu
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          items={folderMenuItems}
          onClose={() => setFolderContextMenu(null)}
        />
      )}

      {/* Dialogs */}
      <RenameDialog
        isOpen={isNewFolderOpen}
        currentName=""
        title="New Folder"
        onClose={() => setIsNewFolderOpen(false)}
        onRename={handleCreateFolder}
      />

      {renamingFolder && (
        <RenameDialog
          isOpen={true}
          currentName={renamingFolder.name}
          title="Rename Folder"
          onClose={() => setRenamingFolder(null)}
          onRename={handleRenameFolder}
        />
      )}

      <ConfirmDialog
        isOpen={deletingTagId !== null}
        title="Delete Tag"
        message="このタグを削除しますか？"
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteTagConfirm}
        onCancel={() => setDeletingTagId(null)}
      />

      <ConfirmDialog
        isOpen={deletingFolderId !== null}
        title="Delete Folder"
        message="このフォルダーを削除しますか？動画はAll Videosに移動します。"
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteFolderConfirm}
        onCancel={() => setDeletingFolderId(null)}
      />
    </aside>
  );
}

function SourceButton({ type }: { type: 'all' | 'local' | 'youtube' }) {
  const { sourceTypeFilter, setSourceTypeFilter } = useVideoStore();

  const labels = {
    all: '📺 All',
    local: '💾 Local',
    youtube: '▶️ YouTube',
  };

  return (
    <button
      className={`source-btn ${sourceTypeFilter === type ? 'active' : ''}`}
      onClick={() => setSourceTypeFilter(type)}
    >
      {labels[type]}
    </button>
  );
}
