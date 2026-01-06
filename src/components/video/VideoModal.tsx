import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useVideoStore } from '../../stores/videoStore';
import { MemoEditDialog } from '../common/MemoEditDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './VideoModal.css';

// Playback speed options (YouTube style)
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const FRAME_TIME = 1 / 60; // Assume 60fps for frame stepping

export function VideoModal() {
  const {
    isVideoModalOpen,
    closeVideoModal,
    selectedVideo,
    updateSelectedVideo,
    playerVolume,
    playerMuted,
    playerSpeed,
    playerLoop,
    setPlayerVolume,
    setPlayerMuted,
    setPlayerSpeed,
    setPlayerLoop,
  } = useUIStore();
  const { removeVideo, fetchVideos, updateVideo } = useVideoStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isMemoEditOpen, setIsMemoEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          closeVideoModal();
          break;

        // Play/Pause: Space or K
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          e.stopPropagation();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;

        // Rewind 10s: J
        case 'j':
        case 'J':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;

        // Forward 10s: L
        case 'l':
        case 'L':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;

        // Rewind 5s: Left arrow
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;

        // Forward 5s: Right arrow
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;

        // Volume up: Up arrow
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.05);
          break;

        // Volume down: Down arrow
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.05);
          break;

        // Frame forward: . (period)
        case '.':
          e.preventDefault();
          e.stopPropagation();
          video.pause();
          video.currentTime = Math.min(video.duration, video.currentTime + FRAME_TIME);
          break;

        // Frame backward: , (comma)
        case ',':
          e.preventDefault();
          e.stopPropagation();
          video.pause();
          video.currentTime = Math.max(0, video.currentTime - FRAME_TIME);
          break;

        // Speed up: > (Shift+.)
        case '>':
          e.preventDefault();
          e.stopPropagation();
          {
            const currentIndex = SPEED_OPTIONS.indexOf(playerSpeed);
            if (currentIndex < SPEED_OPTIONS.length - 1) {
              const newSpeed = SPEED_OPTIONS[currentIndex + 1];
              video.playbackRate = newSpeed;
              setPlayerSpeed(newSpeed);
            }
          }
          break;

        // Speed down: < (Shift+,)
        case '<':
          e.preventDefault();
          e.stopPropagation();
          {
            const currentIndex = SPEED_OPTIONS.indexOf(playerSpeed);
            if (currentIndex > 0) {
              const newSpeed = SPEED_OPTIONS[currentIndex - 1];
              video.playbackRate = newSpeed;
              setPlayerSpeed(newSpeed);
            }
          }
          break;

        // Mute: M
        case 'm':
        case 'M':
          e.preventDefault();
          video.muted = !video.muted;
          setPlayerMuted(video.muted);
          break;

        // Fullscreen: F
        case 'f':
        case 'F':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            video.requestFullscreen();
          }
          break;

        // Jump to percentage: 0-9
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          video.currentTime = (video.duration * percent) / 100;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoModalOpen, closeVideoModal, playerSpeed, setPlayerSpeed]);

  // Apply stored settings when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoModalOpen) return;

    const applySettings = () => {
      video.volume = playerVolume;
      video.muted = playerMuted;
      video.playbackRate = playerSpeed;
      video.loop = playerLoop;
    };

    video.addEventListener('loadedmetadata', applySettings);
    // Also apply immediately in case video is already loaded
    if (video.readyState >= 1) {
      applySettings();
    }

    return () => {
      video.removeEventListener('loadedmetadata', applySettings);
    };
  }, [isVideoModalOpen, playerVolume, playerMuted, playerSpeed, playerLoop]);

  // Video event listeners for custom controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoModalOpen) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [isVideoModalOpen]);

  // High frequency time update using requestAnimationFrame
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoModalOpen) return;

    const updateTime = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
      }
      animationRef.current = requestAnimationFrame(updateTime);
    };

    animationRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVideoModalOpen, isSeeking]);

  useEffect(() => {
    if (isVideoModalOpen && selectedVideo && videoRef.current) {
      window.electronAPI.video.incrementPlayCount(selectedVideo.id);
    }
  }, [isVideoModalOpen, selectedVideo]);

  if (!isVideoModalOpen || !selectedVideo) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeVideoModal();
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleteConfirmOpen(false);
    await window.electronAPI.video.delete(selectedVideo.id);
    removeVideo(selectedVideo.id);
    closeVideoModal();
    fetchVideos();
  };

  const handleMemoSave = async (memo: string) => {
    await window.electronAPI.video.update(selectedVideo.id, { description: memo });
    updateVideo(selectedVideo.id, { description: memo });
    updateSelectedVideo({ description: memo });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const seekToPosition = (clientX: number) => {
    const video = videoRef.current;
    const progressBar = progressRef.current;
    if (!video || !progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = percent * video.duration;
    setCurrentTime(percent * video.duration);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsSeeking(true);
    seekToPosition(e.clientX);

    const handleMouseMove = (e: MouseEvent) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsSeeking(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setPlayerVolume(newVolume);
    if (newVolume > 0 && video.muted) {
      video.muted = false;
      setPlayerMuted(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setPlayerMuted(video.muted);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newSpeed = parseFloat(e.target.value);
    video.playbackRate = newSpeed;
    setPlayerSpeed(newSpeed);
  };

  const toggleLoop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = !video.loop;
    setPlayerLoop(video.loop);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  // Convert path to proper file URL (works on Windows and Mac)
  const toFileUrl = (filePath: string) => {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.startsWith('/')
      ? `file://${normalized}`
      : `file:///${normalized}`;
  };

  const videoUrl = toFileUrl(selectedVideo.filePath);

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="video-modal">
        <button className="modal-close" onClick={closeVideoModal}>
          ✕
        </button>

        <div className="modal-content">
          <div className="video-player-container">
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              className="video-player"
              onClick={togglePlay}
              onKeyDown={(e) => e.preventDefault()}
            />
            {playerSpeed !== 1 && (
              <div className="speed-indicator">{playerSpeed}x</div>
            )}
          </div>
          <div className="video-controls">
            <button className="control-btn" onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div
              ref={progressRef}
              className="progress-container"
              onMouseDown={handleProgressMouseDown}
            >
              <div
                className="progress-bar"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="volume-container">
              <button className="control-btn" onClick={toggleMute}>
                {playerMuted || playerVolume === 0 ? '🔇' : '🔊'}
              </button>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={playerMuted ? 0 : playerVolume}
                onChange={handleVolumeChange}
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(playerMuted ? 0 : playerVolume) * 100}%, var(--bg-secondary) ${(playerMuted ? 0 : playerVolume) * 100}%, var(--bg-secondary) 100%)`
                }}
              />
            </div>
            <select
              className="speed-select"
              value={playerSpeed}
              onChange={handleSpeedChange}
            >
              {SPEED_OPTIONS.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
            <button
              className={`control-btn ${playerLoop ? 'active' : ''}`}
              onClick={toggleLoop}
              title="Loop"
            >
              🔁
            </button>
            <button className="control-btn" onClick={toggleFullscreen}>
              ⛶
            </button>
          </div>
          <div className="shortcut-hint">
            Space: 再生/停止 | J/L: ±10秒 | ←/→: ±5秒 | ,/.: コマ送り | Shift+&lt;/&gt;: 速度 | 0-9: シーク | F: フルスクリーン
          </div>

          <div className="video-details">
            <h2 className="video-modal-title">{selectedVideo.title}</h2>

            <div className="video-modal-meta">
              <div className="meta-item">
                <span className="meta-label">Duration</span>
                <span className="meta-value">{formatDuration(selectedVideo.duration)}</span>
              </div>

              {selectedVideo.width && selectedVideo.height && (
                <div className="meta-item">
                  <span className="meta-label">Resolution</span>
                  <span className="meta-value">{selectedVideo.width}×{selectedVideo.height}</span>
                </div>
              )}

              <div className="meta-item">
                <span className="meta-label">Size</span>
                <span className="meta-value">{formatFileSize(selectedVideo.fileSize)}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Source</span>
                <span className="meta-value">
                  {selectedVideo.sourceType === 'youtube' ? 'YouTube' : 'Local'}
                </span>
              </div>

              {selectedVideo.sourceUrl && (
                <div className="meta-item">
                  <span className="meta-label">Original URL</span>
                  <a
                    href="#"
                    className="meta-value link"
                    onClick={(e) => {
                      e.preventDefault();
                      const url = selectedVideo.sourceUrl!;
                      const clipStart = selectedVideo.clipStart || 0;
                      const separator = url.includes('?') ? '&' : '?';
                      const urlWithTime = clipStart > 0 ? `${url}${separator}t=${clipStart}` : url;
                      window.electronAPI.app.openExternal(urlWithTime);
                    }}
                  >
                    Open in browser{selectedVideo.clipStart ? ` (${formatDuration(selectedVideo.clipStart)})` : ''}
                  </a>
                </div>
              )}
            </div>

            <div className="video-memo">
              <div className="memo-header">
                <span className="memo-label">Memo</span>
                <button className="memo-edit-btn" onClick={() => setIsMemoEditOpen(true)}>
                  Edit
                </button>
              </div>
              <div className="memo-content">
                {selectedVideo.description || <span className="memo-empty">No memo</span>}
              </div>
            </div>

            {selectedVideo.tags && selectedVideo.tags.length > 0 && (
              <div className="video-modal-tags">
                <span className="tags-label">Tags:</span>
                <div className="tags-list">
                  {selectedVideo.tags.map((tag) => (
                    <span key={tag.id} className="tag-badge">{tag.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="video-modal-actions">
              <button className="action-btn danger" onClick={handleDeleteClick}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <MemoEditDialog
        isOpen={isMemoEditOpen}
        currentMemo={selectedVideo.description}
        onClose={() => setIsMemoEditOpen(false)}
        onSave={handleMemoSave}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Video"
        message={`"${selectedVideo.title}" を削除しますか？`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
