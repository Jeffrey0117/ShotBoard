/**
 * NoteList Component
 * Virtualized note list with sorting and filtering
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNoteStore } from '../../stores/noteStore';
import { NoteCard } from './NoteCard';
import type { Note, NoteSortOption, ContextMenuItem } from '../../types/note';

interface NoteListProps {
  onNoteSelect?: (noteId: string) => void;
  onNoteDoubleClick?: (noteId: string) => void;
  onContextMenu?: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
  maxHeight?: number;
  virtualizeThreshold?: number;
}

// Sort option labels
const SORT_OPTIONS: { value: NoteSortOption; label: string }[] = [
  { value: 'updated-desc', label: 'Last Modified' },
  { value: 'updated-asc', label: 'Oldest Modified' },
  { value: 'created-desc', label: 'Newest Created' },
  { value: 'created-asc', label: 'Oldest Created' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
];

// Virtualized List Item
interface VirtualListItemProps {
  note: Note;
  style: React.CSSProperties;
  isSelected: boolean;
  onClick: (noteId: string) => void;
  onDoubleClick: (noteId: string) => void;
  onContextMenu: (e: React.MouseEvent, noteId: string) => void;
}

const VirtualListItem: React.FC<VirtualListItemProps> = ({
  note,
  style,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => (
  <div style={style}>
    <NoteCard
      note={note}
      isSelected={isSelected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    />
  </div>
);

// Sort Dropdown
interface SortDropdownProps {
  value: NoteSortOption;
  onChange: (value: NoteSortOption) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === value)?.label || 'Sort';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (option: NoteSortOption) => {
      onChange(option);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div className="note-list-sort" ref={dropdownRef}>
      <button
        className="note-list-sort-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="16" y2="12" />
          <line x1="4" y1="18" x2="12" y2="18" />
        </svg>
        <span>{currentLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`sort-chevron ${isOpen ? 'open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="note-list-sort-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.1 }}
            role="listbox"
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`sort-option ${value === option.value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
                {value === option.value && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main NoteList Component
export const NoteList: React.FC<NoteListProps> = ({
  onNoteSelect,
  onNoteDoubleClick,
  onContextMenu,
  maxHeight,
  virtualizeThreshold = 50,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const notes = useNoteStore((state) => state.getFilteredNotes());
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
  const sortOption = useNoteStore((state) => state.sortOption);
  const setSortOption = useNoteStore((state) => state.setSortOption);
  const filterTagIds = useNoteStore((state) => state.filterTagIds);
  const selectedFolderId = useNoteStore((state) => state.selectedFolderId);
  const setActiveNote = useNoteStore((state) => state.setActiveNote);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const duplicateNote = useNoteStore((state) => state.duplicateNote);

  // Virtual list settings
  const itemHeight = 100; // Height of each note card
  const containerHeight = maxHeight || (listRef.current?.clientHeight ?? 400);
  const overscan = 3;

  // Calculate visible range for virtualization
  const visibleRange = useMemo(() => {
    if (notes.length < virtualizeThreshold) {
      return { start: 0, end: notes.length };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const end = Math.min(notes.length, start + visibleCount);

    return { start, end };
  }, [notes.length, scrollTop, containerHeight, itemHeight, virtualizeThreshold]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleNoteClick = useCallback(
    (noteId: string) => {
      setActiveNote(noteId);
      onNoteSelect?.(noteId);
    },
    [setActiveNote, onNoteSelect]
  );

  const handleNoteDoubleClick = useCallback(
    (noteId: string) => {
      onNoteDoubleClick?.(noteId);
    },
    [onNoteDoubleClick]
  );

  const handleNoteContextMenu = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      const items: ContextMenuItem[] = [
        {
          id: 'open',
          label: 'Open',
          onClick: () => {
            setActiveNote(noteId);
            onNoteDoubleClick?.(noteId);
          },
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          onClick: () => duplicateNote(noteId),
        },
        {
          id: 'separator',
          label: '',
          onClick: () => {},
        },
        {
          id: 'delete',
          label: 'Delete',
          danger: true,
          onClick: () => deleteNote(noteId),
        },
      ];

      onContextMenu?.(e, items);
    },
    [setActiveNote, onNoteDoubleClick, duplicateNote, deleteNote, onContextMenu]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeNoteId || notes.length === 0) return;

      const currentIndex = notes.findIndex((n) => n.id === activeNoteId);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      if (e.key === 'ArrowDown' && currentIndex < notes.length - 1) {
        e.preventDefault();
        newIndex = currentIndex + 1;
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        newIndex = currentIndex - 1;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onNoteDoubleClick?.(activeNoteId);
        return;
      }

      if (newIndex !== currentIndex) {
        setActiveNote(notes[newIndex].id);
        onNoteSelect?.(notes[newIndex].id);

        // Scroll into view
        if (listRef.current && notes.length >= virtualizeThreshold) {
          const itemTop = newIndex * itemHeight;
          const itemBottom = itemTop + itemHeight;
          const viewTop = listRef.current.scrollTop;
          const viewBottom = viewTop + containerHeight;

          if (itemTop < viewTop) {
            listRef.current.scrollTop = itemTop;
          } else if (itemBottom > viewBottom) {
            listRef.current.scrollTop = itemBottom - containerHeight;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeNoteId,
    notes,
    setActiveNote,
    onNoteSelect,
    onNoteDoubleClick,
    containerHeight,
    virtualizeThreshold,
  ]);

  // Build filter description
  const filterDescription = useMemo(() => {
    const parts: string[] = [];

    if (selectedFolderId && selectedFolderId !== 'folder_root') {
      parts.push('in folder');
    }

    if (filterTagIds.length > 0) {
      parts.push(`${filterTagIds.length} tag${filterTagIds.length > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? `Filtered by ${parts.join(' and ')}` : null;
  }, [selectedFolderId, filterTagIds]);

  const shouldVirtualize = notes.length >= virtualizeThreshold;

  return (
    <div className="note-list">
      <div className="note-list-header">
        <div className="note-list-info">
          <span className="note-list-count">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
          {filterDescription && (
            <span className="note-list-filter-desc">{filterDescription}</span>
          )}
        </div>
        <SortDropdown value={sortOption} onChange={setSortOption} />
      </div>

      <div
        ref={listRef}
        className="note-list-content"
        style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
        onScroll={shouldVirtualize ? handleScroll : undefined}
      >
        {notes.length > 0 ? (
          shouldVirtualize ? (
            // Virtualized list
            <div
              className="note-list-virtual"
              style={{ height: `${notes.length * itemHeight}px` }}
            >
              {notes.slice(visibleRange.start, visibleRange.end).map((note, i) => (
                <VirtualListItem
                  key={note.id}
                  note={note}
                  style={{
                    position: 'absolute',
                    top: (visibleRange.start + i) * itemHeight,
                    left: 0,
                    right: 0,
                    height: itemHeight,
                  }}
                  isSelected={note.id === activeNoteId}
                  onClick={handleNoteClick}
                  onDoubleClick={handleNoteDoubleClick}
                  onContextMenu={handleNoteContextMenu}
                />
              ))}
            </div>
          ) : (
            // Regular list
            <AnimatePresence mode="popLayout">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={note.id === activeNoteId}
                  onClick={handleNoteClick}
                  onDoubleClick={handleNoteDoubleClick}
                  onContextMenu={handleNoteContextMenu}
                />
              ))}
            </AnimatePresence>
          )
        ) : (
          <motion.div
            className="note-list-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="empty-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="empty-text">No notes found</p>
            <p className="empty-hint">
              {filterTagIds.length > 0 || selectedFolderId
                ? 'Try adjusting your filters'
                : 'Create a new note to get started'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NoteList;
