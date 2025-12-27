/**
 * NotesPanel - 演講者備忘稿面板
 * 顯示當前頁面的備忘稿，不會被錄影
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePageStore } from '../../stores/pageStore';
import './styles.css';

interface NotesPanelProps {
  className?: string;
}

export function NotesPanel({ className }: NotesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentPage = usePageStore((state) => state.getCurrentPage());
  const updateNotes = usePageStore((state) => state.updateNotes);

  const [localNotes, setLocalNotes] = useState(currentPage?.notes || '');

  // Sync local notes when page changes
  useEffect(() => {
    setLocalNotes(currentPage?.notes || '');
  }, [currentPage?.id, currentPage?.notes]);

  // Debounced save
  useEffect(() => {
    if (!currentPage) return;

    const timer = setTimeout(() => {
      if (localNotes !== currentPage.notes) {
        updateNotes(currentPage.id, localNotes);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localNotes, currentPage, updateNotes]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if (!currentPage) return null;

  return (
    <div className={`notes-panel ${isExpanded ? 'expanded' : 'collapsed'} ${className || ''}`}>
      <div className="notes-panel-header" onClick={toggleExpanded}>
        <div className="notes-panel-title">
          <span className="notes-icon">📝</span>
          <span>備忘稿</span>
          <span className="notes-page-name">- {currentPage.name}</span>
        </div>
        <div className="notes-panel-actions">
          <span className="notes-hint">(不會錄進影片)</span>
          <button className="notes-toggle-btn" title={isExpanded ? '收合' : '展開'}>
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="notes-panel-content">
          <textarea
            ref={textareaRef}
            className="notes-textarea"
            value={localNotes}
            onChange={handleChange}
            placeholder="在這裡輸入備忘稿、逐字稿或提示內容...&#10;&#10;這些內容只有你看得到，不會出現在錄影中。"
          />
        </div>
      )}
    </div>
  );
}

export default NotesPanel;
