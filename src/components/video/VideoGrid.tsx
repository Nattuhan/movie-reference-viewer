import { useEffect, useState, useCallback } from 'react';
import { useVideoStore } from '../../stores/videoStore';
import { useUIStore } from '../../stores/uiStore';
import { useFolderStore } from '../../stores/folderStore';
import { VideoCard } from './VideoCard';
import { BulkTagEditDialog } from '../common/BulkTagEditDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './VideoGrid.css';

export function VideoGrid() {
  const { fetchVideos, isLoading, getFilteredVideos, selectedVideoIds, clearSelection, selectAllVideos, removeVideos } = useVideoStore();
  const { viewMode } = useUIStore();
  const { folders } = useFolderStore();

  const [isBulkTagEditOpen, setIsBulkTagEditOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  const filteredVideos = getFilteredVideos();
  const selectedCount = selectedVideoIds.length;

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Ctrl+A to select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement instanceof HTMLInputElement ||
                               activeElement instanceof HTMLTextAreaElement;
        if (!isInputFocused) {
          e.preventDefault();
          selectAllVideos();
        }
      }
      if (e.key === 'Escape' && selectedCount > 0) {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAllVideos, clearSelection, selectedCount]);

  const handleBulkDelete = async () => {
    setIsBulkDeleteOpen(false);
    for (const id of selectedVideoIds) {
      await window.electronAPI.video.delete(id);
    }
    removeVideos(selectedVideoIds);
  };

  const handleBulkMoveToFolder = async (folderId: number) => {
    setFolderMenuOpen(false);
    for (const id of selectedVideoIds) {
      await window.electronAPI.video.update(id, { folderId });
    }
    fetchVideos();
    clearSelection();
  };

  // Flatten folders for menu
  const flattenFolders = useCallback((folderList: typeof folders, depth = 0): { id: number; name: string; depth: number }[] => {
    const result: { id: number; name: string; depth: number }[] = [];
    for (const folder of folderList) {
      result.push({ id: folder.id, name: folder.name, depth });
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, depth + 1));
      }
    }
    return result;
  }, []);

  const allFolders = flattenFolders(folders);

  if (isLoading) {
    return (
      <div className="video-grid-loading">
        <div className="spinner" />
        <p>Loading videos...</p>
      </div>
    );
  }

  if (filteredVideos.length === 0) {
    return (
      <div className="video-grid-empty">
        <div className="empty-icon">🎬</div>
        <h3>No videos found</h3>
        <p>Import videos from your local files or YouTube to get started</p>
      </div>
    );
  }

  return (
    <>
      {selectedCount > 0 && (
        <div className="bulk-action-bar">
          <span className="selection-count">{selectedCount} 件選択中</span>

          <div className="bulk-actions">
            <button className="bulk-action-btn" onClick={() => setIsBulkTagEditOpen(true)}>
              タグを編集
            </button>

            <div className="folder-dropdown">
              <button className="bulk-action-btn" onClick={() => setFolderMenuOpen(!folderMenuOpen)}>
                フォルダに移動 ▾
              </button>
              {folderMenuOpen && (
                <div className="folder-menu">
                  <div className="folder-menu-item" onClick={() => handleBulkMoveToFolder(1)}>
                    Uncategorized
                  </div>
                  {allFolders.filter(f => f.id !== 1).map((folder) => (
                    <div
                      key={folder.id}
                      className="folder-menu-item"
                      style={{ paddingLeft: `${12 + folder.depth * 16}px` }}
                      onClick={() => handleBulkMoveToFolder(folder.id)}
                    >
                      {folder.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="bulk-action-btn danger" onClick={() => setIsBulkDeleteOpen(true)}>
              削除
            </button>

            <button className="bulk-action-btn secondary" onClick={clearSelection}>
              選択解除
            </button>
          </div>
        </div>
      )}

      <div className={`video-grid ${viewMode}`}>
        {filteredVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      <BulkTagEditDialog
        isOpen={isBulkTagEditOpen}
        videoIds={selectedVideoIds}
        onClose={() => setIsBulkTagEditOpen(false)}
        onSave={() => {
          fetchVideos();
          clearSelection();
        }}
      />

      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        title="動画を削除"
        message={`${selectedCount} 件の動画を削除しますか？`}
        confirmLabel="削除"
        danger
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteOpen(false)}
      />
    </>
  );
}
