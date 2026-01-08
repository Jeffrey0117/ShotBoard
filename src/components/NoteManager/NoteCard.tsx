/**
 * NoteCard Component
 * Display note title, summary, tags, and update time
 */

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNoteStore } from '../../stores/noteStore';
import type { Note, Tag } from '../../types/note';

interface NoteCardProps {
  note: Note;
  isSelected?: boolean;
  onClick?: (noteId: string) => void;
  onDoubleClick?: (noteId: string) => void;
  onContextMenu?: (e: React.MouseEvent, noteId: string) => void;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Extract summary from markdown content
function extractSummary(content: string, maxLength = 100): string {
  // Remove markdown syntax
  let text = content
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove bold/italic
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove whiteboard directives
    .replace(/::whiteboard\{[^}]*\}/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim() + '...';
  }

  return text || 'No content';
}

// Tag Badge Component
const TagBadge: React.FC<{ tag: Tag }> = ({ tag }) => (
  <span
    className="note-card-tag"
    style={{
      backgroundColor: `${tag.color}20`,
      color: tag.color,
      borderColor: `${tag.color}40`,
    }}
  >
    {tag.name}
  </span>
);

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected = false,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const tags = useNoteStore((state) => state.tags);

  const noteTags = useMemo(() => {
    return note.tagIds
      .map((tagId) => tags.get(tagId))
      .filter((tag): tag is Tag => tag !== undefined)
      .slice(0, 3); // Show max 3 tags
  }, [note.tagIds, tags]);

  const summary = useMemo(() => extractSummary(note.content), [note.content]);
  const relativeTime = useMemo(() => formatRelativeTime(note.updatedAt), [note.updatedAt]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.(note.id);
    },
    [note.id, onClick]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onDoubleClick?.(note.id);
    },
    [note.id, onDoubleClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(e, note.id);
    },
    [note.id, onContextMenu]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onDoubleClick?.(note.id);
      }
    },
    [note.id, onDoubleClick]
  );

  return (
    <motion.div
      className={`note-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="note-card-header">
        <h3 className="note-card-title" title={note.title}>
          {note.title}
        </h3>
        <span className="note-card-time" title={new Date(note.updatedAt).toLocaleString()}>
          {relativeTime}
        </span>
      </div>

      <p className="note-card-summary">{summary}</p>

      {noteTags.length > 0 && (
        <div className="note-card-tags">
          {noteTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          {note.tagIds.length > 3 && (
            <span className="note-card-tag-more">+{note.tagIds.length - 3}</span>
          )}
        </div>
      )}

      {/* Whiteboard indicator */}
      {note.embeddedWhiteboardIds.length > 0 && (
        <div className="note-card-indicators">
          <span className="note-card-indicator" title="Contains whiteboard">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 12h.01M12 12h.01M16 12h.01" />
            </svg>
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default NoteCard;
