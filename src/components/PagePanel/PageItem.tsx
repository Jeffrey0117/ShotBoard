import { useState, useRef, useEffect } from 'react';
import type { WhiteboardPage } from '../../stores/pageStore';

interface PageItemProps {
  page: WhiteboardPage;
  index: number;
  isActive: boolean;
  isEditing: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRenameSubmit: (name: string) => void;
  onRenameCancel: () => void;
}

export function PageItem({
  page,
  index,
  isActive,
  isEditing,
  isDragging,
  isDropTarget,
  onClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRenameSubmit,
  onRenameCancel,
}: PageItemProps) {
  const [editName, setEditName] = useState(page.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditName(page.name);
  }, [page.name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRenameSubmit(editName);
    } else if (e.key === 'Escape') {
      setEditName(page.name);
      onRenameCancel();
    }
  };

  const handleBlur = () => {
    onRenameSubmit(editName);
  };

  const classNames = [
    'page-item',
    isActive && 'active',
    isDragging && 'dragging',
    isDropTarget && 'drop-target',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="page-item-thumbnail">
        {page.thumbnail ? (
          <img src={page.thumbnail} alt={page.name} />
        ) : (
          <div className="page-item-placeholder">
            <span>{index + 1}</span>
          </div>
        )}
      </div>

      <div className="page-item-info">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="page-item-name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="page-item-name">{page.name}</span>
        )}
        <span className="page-item-index">{index + 1}</span>
      </div>
    </div>
  );
}

export default PageItem;
