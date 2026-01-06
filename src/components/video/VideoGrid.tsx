import { useEffect } from 'react';
import { useVideoStore } from '../../stores/videoStore';
import { useUIStore } from '../../stores/uiStore';
import { VideoCard } from './VideoCard';
import './VideoGrid.css';

export function VideoGrid() {
  const { fetchVideos, isLoading, getFilteredVideos } = useVideoStore();
  const { viewMode } = useUIStore();

  const filteredVideos = getFilteredVideos();

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

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
    <div className={`video-grid ${viewMode}`}>
      {filteredVideos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
