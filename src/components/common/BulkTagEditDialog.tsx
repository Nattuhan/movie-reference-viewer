import { useState, useEffect, useRef } from 'react';
import { useTagStore } from '../../stores/tagStore';
import './Dialog.css';

const TAG_COLOR = '#6b7280';

interface BulkTagEditDialogProps {
  isOpen: boolean;
  videoIds: number[];
  onClose: () => void;
  onSave: () => void;
}

export function BulkTagEditDialog({ isOpen, videoIds, onClose, onSave }: BulkTagEditDialogProps) {
  const { tags, fetchTags, createTag } = useTagStore();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      setSelectedTagIds([]);
      setNewTagName('');
      setIsCreating(false);
    }
  }, [isOpen, fetchTags]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const newTag = await createTag(newTagName.trim(), TAG_COLOR);
    setSelectedTagIds((prev) => [...prev, newTag.id]);
    setNewTagName('');
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (selectedTagIds.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      // Add selected tags to each video
      for (const videoId of videoIds) {
        const currentTags = await window.electronAPI.tag.getByVideo(videoId);
        const currentTagIds = currentTags.map((t: { id: number }) => t.id);
        const newTagIds = [...new Set([...currentTagIds, ...selectedTagIds])];
        await window.electronAPI.tag.setForVideo(videoId, newTagIds);
      }
      onSave();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isCreating) {
        setIsCreating(false);
        setNewTagName('');
      } else {
        onClose();
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTagName('');
    }
  };

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" onKeyDown={handleKeyDown}>
        <div className="dialog-header">
          <h3>{videoIds.length} 件の動画にタグを追加</h3>
        </div>
        <div className="dialog-body">
          <p className="dialog-hint">選択したタグが追加されます（既存のタグは保持）</p>
          <div className="tag-list-edit">
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={`tag-checkbox ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}

            {isCreating ? (
              <div className="new-tag-input">
                <input
                  ref={inputRef}
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Tag name..."
                  className="tag-input"
                />
                <button className="tag-input-btn" onClick={handleCreateTag}>+</button>
              </div>
            ) : (
              <button className="tag-checkbox add-tag" onClick={() => setIsCreating(true)}>
                + New Tag
              </button>
            )}
          </div>
        </div>
        <div className="dialog-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add Tags'}
          </button>
        </div>
      </div>
    </div>
  );
}
