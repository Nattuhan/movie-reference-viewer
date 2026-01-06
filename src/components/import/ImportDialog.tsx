import { useState, useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useVideoStore } from '../../stores/videoStore';
import { useFolderStore, Folder } from '../../stores/folderStore';
import { addToImportQueue } from './ImportQueue';
import './ImportDialog.css';

type ImportTab = 'local' | 'youtube';

export function ImportDialog() {
  const { isImportDialogOpen, closeImportDialog } = useUIStore();
  const { fetchVideos, addVideo } = useVideoStore();
  const { folders, fetchFolders } = useFolderStore();

  const [activeTab, setActiveTab] = useState<ImportTab>('youtube');

  // Local import state
  const [localFilePath, setLocalFilePath] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [localFolderId, setLocalFolderId] = useState(1);

  // YouTube import state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeFolderId, setYoutubeFolderId] = useState(1);
  const [youtubeInfo, setYoutubeInfo] = useState<{
    title: string;
    duration: number;
    thumbnail: string;
  } | null>(null);
  const [clipStart, setClipStart] = useState('');
  const [clipEnd, setClipEnd] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isImportDialogOpen) {
      fetchFolders();
    }
  }, [isImportDialogOpen, fetchFolders]);

  const resetForm = () => {
    setLocalFilePath('');
    setLocalTitle('');
    setYoutubeUrl('');
    setYoutubeTitle('');
    setYoutubeInfo(null);
    setClipStart('');
    setClipEnd('');
  };

  const handleClose = () => {
    resetForm();
    closeImportDialog();
  };

  const handleSelectFile = async () => {
    const filePath = await window.electronAPI.dialog.openFile();
    if (filePath) {
      setLocalFilePath(filePath);
      const filename = filePath.split(/[/\\]/).pop() || '';
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      setLocalTitle(nameWithoutExt);
    }
  };

  const handleLocalImport = async () => {
    if (!localFilePath) return;

    const taskId = `local_${Date.now()}`;
    const title = localTitle || localFilePath.split(/[/\\]/).pop() || 'Video';

    // Add to queue
    addToImportQueue({
      id: taskId,
      title,
      type: 'local',
    });

    // Reset form and keep dialog open for more imports
    resetForm();

    // Start import in background
    try {
      const video = await window.electronAPI.video.import({
        filePath: localFilePath,
        title: localTitle || undefined,
        folderId: localFolderId,
        taskId,
      });
      addVideo(video as typeof video & { tags?: [] });
      fetchVideos();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleFetchYouTubeInfo = async () => {
    if (!youtubeUrl) return;

    setIsFetching(true);
    try {
      const isValid = await window.electronAPI.youtube.validateUrl(youtubeUrl);
      if (!isValid) {
        alert('Invalid YouTube URL');
        return;
      }

      const info = await window.electronAPI.youtube.getInfo(youtubeUrl);
      setYoutubeInfo(info);
      setYoutubeTitle(info.title);
    } catch (error) {
      alert(`Failed to fetch video info: ${(error as Error).message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleYouTubeImport = async () => {
    if (!youtubeUrl) return;

    const taskId = `yt_${Date.now()}`;
    const title = youtubeTitle || youtubeInfo?.title || 'YouTube Video';

    // Add to queue
    addToImportQueue({
      id: taskId,
      title,
      type: 'youtube',
    });

    // Store values before reset
    const importOptions = {
      url: youtubeUrl,
      title: youtubeTitle || undefined,
      clipStart: parseTimeInput(clipStart),
      clipEnd: parseTimeInput(clipEnd),
      folderId: youtubeFolderId,
      taskId,
    };

    // Reset form and keep dialog open for more imports
    resetForm();

    // Start import in background
    try {
      const video = await window.electronAPI.video.importFromYouTube(importOptions);
      addVideo(video as typeof video & { tags?: [] });
      fetchVideos();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse time string supporting both seconds (30) and colon format (1:30, 1:30:00)
  const parseTimeInput = (input: string): number | undefined => {
    if (!input || input.trim() === '') return undefined;

    const trimmed = input.trim();

    // Check if it's a colon format (1:30 or 1:30:00)
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(p => parseFloat(p) || 0);
      if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return undefined;
    }

    // Plain seconds
    const num = parseFloat(trimmed);
    return isNaN(num) ? undefined : num;
  };

  const flattenFolders = (folderList: Folder[], depth = 0): Array<{ id: number; name: string; depth: number }> => {
    const result: Array<{ id: number; name: string; depth: number }> = [];
    for (const folder of folderList) {
      // Rename folder ID 1 to "Uncategorized"
      const displayName = folder.id === 1 ? 'Uncategorized' : folder.name;
      result.push({ id: folder.id, name: displayName, depth });
      if (folder.children) {
        result.push(...flattenFolders(folder.children, depth + 1));
      }
    }
    return result;
  };

  const flatFolders = flattenFolders(folders);

  if (!isImportDialogOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="import-dialog">
        <div className="dialog-header">
          <h2>Import Video</h2>
          <button className="dialog-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="dialog-tabs">
          <button
            className={`tab ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            Local File
          </button>
          <button
            className={`tab ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            YouTube
          </button>
        </div>

        <div className="dialog-content">
          {activeTab === 'local' && (
            <div className="import-form">
              <div className="form-group">
                <label>Video File</label>
                <div className="file-input">
                  <input
                    type="text"
                    value={localFilePath}
                    readOnly
                    placeholder="Select a video file..."
                  />
                  <button onClick={handleSelectFile}>
                    Browse
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  placeholder="Video title"
                />
              </div>

              <div className="form-group">
                <label>Folder</label>
                <select
                  value={localFolderId}
                  onChange={(e) => setLocalFolderId(Number(e.target.value))}
                >
                  {flatFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {'  '.repeat(folder.depth)}{folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="import-form">
              <div className="form-group">
                <label>YouTube URL</label>
                <div className="file-input">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <button onClick={handleFetchYouTubeInfo} disabled={isFetching || !youtubeUrl}>
                    {isFetching ? '...' : 'Fetch'}
                  </button>
                </div>
              </div>

              {youtubeInfo && (
                <div className="youtube-preview">
                  <img src={youtubeInfo.thumbnail} alt={youtubeInfo.title} />
                  <div className="youtube-info">
                    <span className="youtube-title">{youtubeInfo.title}</span>
                    <span className="youtube-duration">{formatDuration(youtubeInfo.duration)}</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  placeholder="Video title"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Clip Start</label>
                  <input
                    type="text"
                    value={clipStart}
                    onChange={(e) => setClipStart(e.target.value)}
                    placeholder="0 or 1:30"
                  />
                </div>
                <div className="form-group">
                  <label>Clip End</label>
                  <input
                    type="text"
                    value={clipEnd}
                    onChange={(e) => setClipEnd(e.target.value)}
                    placeholder={youtubeInfo ? formatDuration(youtubeInfo.duration) : ''}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Folder</label>
                <select
                  value={youtubeFolderId}
                  onChange={(e) => setYoutubeFolderId(Number(e.target.value))}
                >
                  {flatFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {'  '.repeat(folder.depth)}{folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn-secondary" onClick={handleClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={activeTab === 'local' ? handleLocalImport : handleYouTubeImport}
            disabled={activeTab === 'local' ? !localFilePath : !youtubeUrl}
          >
            Add to Queue
          </button>
        </div>
      </div>
    </div>
  );
}
