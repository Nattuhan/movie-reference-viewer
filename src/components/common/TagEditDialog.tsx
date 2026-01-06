import { useState, useEffect, useRef } from 'react';
import { useTagStore } from '../../stores/tagStore';
import './Dialog.css';

// Single gray color for all tags
const TAG_COLOR = '#6b7280';

interface TagEditDialogProps {
  isOpen: boolean;
  videoId: number;
  currentTagIds: number[];
  onClose: () => void;
  onSave: (tagIds: number[]) => void;
}

export function TagEditDialog({ isOpen, videoId: _videoId, currentTagIds, onClose, onSave }: TagEditDialogProps) {
  const { tags, fetchTags, createTag } = useTagStore();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(currentTagIds);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      setSelectedTagIds(currentTagIds);
      setNewTagName('');
      setIsCreating(false);
    }
  }, [isOpen, currentTagIds, fetchTags]);

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

  const handleSave = () => {
    onSave(selectedTagIds);
    onClose();
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
          <h3>Edit Tags</h3>
        </div>
        <div className="dialog-body">
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
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
