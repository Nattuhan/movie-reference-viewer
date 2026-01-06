import { useState, useEffect, useRef } from 'react';
import './Dialog.css';

interface RenameDialogProps {
  isOpen: boolean;
  currentName: string;
  title?: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function RenameDialog({ isOpen, currentName, title = 'Rename', onClose, onRename }: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRename(name.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent VideoModal from capturing key events
    e.stopPropagation();

    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" onKeyDown={handleKeyDown}>
        <div className="dialog-header">
          <h3>{title}</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Video name"
              className="dialog-input"
            />
          </div>
          <div className="dialog-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
