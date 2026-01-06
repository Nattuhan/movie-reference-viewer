import { useEffect, useState } from 'react';
import './ImportQueue.css';

interface QueueItem {
  id: string;
  title: string;
  type: 'local' | 'youtube';
  progress: number;
  status: string;
}

interface ProgressEvent {
  taskId: string;
  type: string;
  progress: number;
  status: string;
  message?: string;
}

export function ImportQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onProgress((event: ProgressEvent) => {
      setQueue((prev) => {
        const existing = prev.find((item) => item.id === event.taskId);
        if (existing) {
          if (event.status === 'complete') {
            // Remove after a delay
            setTimeout(() => {
              setQueue((p) => p.filter((item) => item.id !== event.taskId));
            }, 2000);
          }
          return prev.map((item) =>
            item.id === event.taskId
              ? { ...item, progress: event.progress, status: event.status }
              : item
          );
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  // Listen for new queue items
  useEffect(() => {
    const handleAddToQueue = (e: CustomEvent<QueueItem>) => {
      setQueue((prev) => [...prev, e.detail]);
    };

    window.addEventListener('import-queue-add' as any, handleAddToQueue);
    return () => window.removeEventListener('import-queue-add' as any, handleAddToQueue);
  }, []);

  if (queue.length === 0) return null;

  const activeCount = queue.filter((item) => item.status !== 'complete').length;

  return (
    <div className={`import-queue ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="queue-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="queue-title">
          Import Queue {activeCount > 0 && `(${activeCount})`}
        </span>
        <span className="queue-toggle">{isExpanded ? '▼' : '▲'}</span>
      </div>

      {isExpanded && (
        <div className="queue-items">
          {queue.map((item) => (
            <div key={item.id} className={`queue-item ${item.status}`}>
              <div className="queue-item-info">
                <span className="queue-item-icon">
                  {item.type === 'youtube' ? '▶' : '◉'}
                </span>
                <span className="queue-item-title">{item.title}</span>
              </div>
              <div className="queue-item-progress">
                <div
                  className="queue-item-progress-bar"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="queue-item-status">
                {item.status === 'complete' ? '✓' : `${item.progress}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to add items to queue
export function addToImportQueue(item: Omit<QueueItem, 'progress' | 'status'>) {
  window.dispatchEvent(
    new CustomEvent('import-queue-add', {
      detail: { ...item, progress: 0, status: 'pending' },
    })
  );
}
