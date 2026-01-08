/**
 * SearchBar Component
 * Full-text search with Fuse.js fuzzy matching
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import { useNoteStore } from '../../stores/noteStore';
import type { Note } from '../../types/note';

interface SearchBarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNoteSelect?: (noteId: string) => void;
  placeholder?: string;
  showHistory?: boolean;
}

interface FuseMatch {
  key?: string;
  value?: string;
  refIndex?: number;
  indices: ReadonlyArray<readonly [number, number]>;
}

interface FuseResult {
  item: Note;
  refIndex: number;
  score?: number;
  matches?: ReadonlyArray<FuseMatch>;
}

// Highlight matched text
const HighlightedText: React.FC<{
  text: string;
  indices: ReadonlyArray<readonly [number, number]> | [number, number][];
}> = ({ text, indices }) => {
  if (!indices || indices.length === 0) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort indices by start position
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

  sortedIndices.forEach(([start, end], i) => {
    // Add text before match
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>
      );
    }
    // Add highlighted match
    parts.push(
      <mark key={`match-${i}`} className="search-highlight">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
};

// Search Result Item
interface SearchResultItemProps {
  result: FuseResult;
  isSelected: boolean;
  onClick: (noteId: string) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  isSelected,
  onClick,
}) => {
  const { item: note, matches } = result;

  const titleMatch = matches?.find((m: FuseMatch) => m.key === 'title');
  const contentMatch = matches?.find((m: FuseMatch) => m.key === 'content');

  const handleClick = useCallback(() => {
    onClick(note.id);
  }, [note.id, onClick]);

  // Get content preview around match
  const contentPreview = useMemo(() => {
    if (!contentMatch?.value) {
      // No content match, show beginning of content
      const preview = note.content.slice(0, 100).replace(/^#.*\n/, '').trim();
      return preview.length < note.content.length ? preview + '...' : preview;
    }

    const value = contentMatch.value;
    const firstMatch = contentMatch.indices[0];
    if (!firstMatch) return value.slice(0, 100);

    const start = Math.max(0, firstMatch[0] - 30);
    const end = Math.min(value.length, firstMatch[1] + 50);
    let preview = value.slice(start, end);

    if (start > 0) preview = '...' + preview;
    if (end < value.length) preview = preview + '...';

    return preview;
  }, [note.content, contentMatch]);

  const adjustedContentIndices = useMemo(() => {
    if (!contentMatch?.indices) return [];

    // contentMatch.value is used internally by Fuse.js
    const firstMatch = contentMatch.indices[0];
    if (!firstMatch) return [];

    const start = Math.max(0, firstMatch[0] - 30);
    const offset = start > 0 ? start - 3 : 0; // Account for "..."

    return contentMatch.indices.map((pair: readonly [number, number]) => [
      Math.max(0, pair[0] - offset),
      pair[1] - offset,
    ] as [number, number]);
  }, [contentMatch]);

  return (
    <motion.div
      className={`search-result-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.1 }}
    >
      <div className="search-result-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="search-result-content">
        <div className="search-result-title">
          {titleMatch ? (
            <HighlightedText
              text={note.title}
              indices={titleMatch.indices}
            />
          ) : (
            note.title
          )}
        </div>
        <div className="search-result-preview">
          {contentMatch ? (
            <HighlightedText
              text={contentPreview}
              indices={adjustedContentIndices}
            />
          ) : (
            contentPreview
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Main SearchBar Component
export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen = true,
  onClose,
  onNoteSelect,
  placeholder = 'Search notes... (Ctrl+P)',
  showHistory = true,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const notes = useNoteStore((state) => state.notes);
  const searchHistory = useNoteStore((state) => state.searchHistory);
  const addToSearchHistory = useNoteStore((state) => state.addToSearchHistory);
  const clearSearchHistory = useNoteStore((state) => state.clearSearchHistory);
  const setActiveNote = useNoteStore((state) => state.setActiveNote);

  // Convert notes Map to array for Fuse
  const notesArray = useMemo(
    () => Array.from(notes.values()).filter((n) => !n.isDeleted),
    [notes]
  );

  // Initialize Fuse.js
  const fuse = useMemo(
    () =>
      new Fuse(notesArray, {
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'content', weight: 0.3 },
          { name: 'tagIds', weight: 0.1 },
        ],
        threshold: 0.4,
        includeMatches: true,
        includeScore: true,
        minMatchCharLength: 2,
        ignoreLocation: true,
        findAllMatches: true,
      }),
    [notesArray]
  );

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 10);
  }, [fuse, query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(true);
  }, []);

  const handleSelectNote = useCallback(
    (noteId: string) => {
      if (query.trim()) {
        addToSearchHistory(query.trim());
      }
      setActiveNote(noteId);
      onNoteSelect?.(noteId);
      setQuery('');
      setShowResults(false);
      onClose?.();
    },
    [query, addToSearchHistory, setActiveNote, onNoteSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectNote(results[selectedIndex].item.id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (query) {
            setQuery('');
            setShowResults(false);
          } else {
            onClose?.();
          }
          break;
      }
    },
    [results, selectedIndex, query, handleSelectNote, onClose]
  );

  const handleHistoryClick = useCallback(
    (historyQuery: string) => {
      setQuery(historyQuery);
      setShowResults(true);
      inputRef.current?.focus();
    },
    []
  );

  const handleClearHistory = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clearSearchHistory();
    },
    [clearSearchHistory]
  );

  const handleFocus = useCallback(() => {
    setShowResults(true);
  }, []);

  const handleBlur = useCallback((_e: React.FocusEvent) => {
    // Delay hiding results to allow click events to fire
    setTimeout(() => {
      if (!resultsRef.current?.contains(document.activeElement)) {
        setShowResults(false);
      }
    }, 150);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="search-bar-container">
      <div className="search-bar">
        <div className="search-bar-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="search-bar-input"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-label="Search notes"
          aria-haspopup="listbox"
          aria-expanded={showResults && (results.length > 0 || searchHistory.length > 0)}
        />
        {query && (
          <button
            className="search-bar-clear"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            className="search-results"
            ref={resultsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            role="listbox"
          >
            {/* Search Results */}
            {results.length > 0 ? (
              results.map((result, index) => (
                <SearchResultItem
                  key={result.item.id}
                  result={result}
                  isSelected={index === selectedIndex}
                  onClick={handleSelectNote}
                />
              ))
            ) : query.trim() ? (
              <div className="search-no-results">
                No notes found for "{query}"
              </div>
            ) : null}

            {/* Search History */}
            {!query.trim() && showHistory && searchHistory.length > 0 && (
              <div className="search-history">
                <div className="search-history-header">
                  <span>Recent Searches</span>
                  <button
                    className="search-history-clear"
                    onClick={handleClearHistory}
                  >
                    Clear
                  </button>
                </div>
                {searchHistory.map((historyQuery, index) => (
                  <div
                    key={index}
                    className="search-history-item"
                    onClick={() => handleHistoryClick(historyQuery)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{historyQuery}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!query.trim() && (!showHistory || searchHistory.length === 0) && (
              <div className="search-empty">
                Type to search notes by title or content
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
