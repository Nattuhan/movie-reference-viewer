import { useState, useEffect, useRef } from 'react';
import './Dialog.css';

interface MemoEditDialogProps {
  isOpen: boolean;
  currentMemo: string | null;
  onClose: () => void;
  onSave: (memo: string) => void;
}

export function MemoEditDialog({ isOpen, currentMemo, onClose, onSave }: MemoEditDialogProps) {
  const [memo, setMemo] = useState(currentMemo || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMemo(currentMemo || '');
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isOpen, currentMemo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(memo);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent VideoModal from capturing key events
    e.stopPropagation();

    if (e.key === 'Escape') {
      onClose();
    }
    // Ctrl+Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog memo-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Edit Memo</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <textarea
              ref={textareaRef}
              className="dialog-textarea"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter memo..."
              rows={6}
            />
            <div className="dialog-hint">Ctrl+Enter to save</div>
          </div>
          <div className="dialog-footer">
            <button type="button" className="dialog-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dialog-btn primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
