/**
 * TagFilter Component
 * Tag filtering with multi-select support
 */

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNoteStore } from '../../stores/noteStore';
import type { Tag } from '../../types/note';

interface TagFilterProps {
  onTagSelect?: (tagIds: string[]) => void;
}

interface TagItemProps {
  tag: Tag;
  isSelected: boolean;
  usageCount: number;
  onClick: (tagId: string) => void;
}

// Tag Item Component
const TagItem: React.FC<TagItemProps> = ({ tag, isSelected, usageCount, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(tag.id);
  }, [tag.id, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(tag.id);
      }
    },
    [tag.id, onClick]
  );

  return (
    <motion.div
      className={`tag-filter-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="checkbox"
      aria-checked={isSelected}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span
        className="tag-filter-color"
        style={{ backgroundColor: tag.color }}
      />
      <span className="tag-filter-name">{tag.name}</span>
      <span className="tag-filter-count">{usageCount}</span>
      {isSelected && (
        <span className="tag-filter-check">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </motion.div>
  );
};

// Create Tag Dialog
interface CreateTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

const CreateTagDialog: React.FC<CreateTagDialogProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
        onCreate(name.trim(), color);
        setName('');
        setColor(TAG_COLORS[0]);
        onClose();
      }
    },
    [name, color, onCreate, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <motion.div
      className="tag-create-dialog"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <input
          type="text"
          className="tag-create-input"
          placeholder="Tag name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="tag-create-colors">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`tag-color-btn ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
        <div className="tag-create-actions">
          <button type="button" className="tag-create-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="tag-create-submit" disabled={!name.trim()}>
            Create
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Main TagFilter Component
export const TagFilter: React.FC<TagFilterProps> = ({ onTagSelect }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tags = useNoteStore((state) => state.tags);
  const filterTagIds = useNoteStore((state) => state.filterTagIds);
  const toggleFilterTag = useNoteStore((state) => state.toggleFilterTag);
  const setFilterTags = useNoteStore((state) => state.setFilterTags);
  const createTag = useNoteStore((state) => state.createTag);
  const getTagUsageCount = useNoteStore((state) => state.getTagUsageCount);

  const allTags = useMemo(() => Array.from(tags.values()), [tags]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags;
    const query = searchQuery.toLowerCase();
    return allTags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [allTags, searchQuery]);

  // Sort tags: selected first, then by usage count
  const sortedTags = useMemo(() => {
    return [...filteredTags].sort((a, b) => {
      const aSelected = filterTagIds.includes(a.id);
      const bSelected = filterTagIds.includes(b.id);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return getTagUsageCount(b.id) - getTagUsageCount(a.id);
    });
  }, [filteredTags, filterTagIds, getTagUsageCount]);

  const handleTagClick = useCallback(
    (tagId: string) => {
      toggleFilterTag(tagId);
      const newFilterTags = filterTagIds.includes(tagId)
        ? filterTagIds.filter((id) => id !== tagId)
        : [...filterTagIds, tagId];
      onTagSelect?.(newFilterTags);
    },
    [filterTagIds, toggleFilterTag, onTagSelect]
  );

  const handleClearAll = useCallback(() => {
    setFilterTags([]);
    onTagSelect?.([]);
  }, [setFilterTags, onTagSelect]);

  const handleCreateTag = useCallback(
    (name: string, color: string) => {
      createTag(name, color);
    },
    [createTag]
  );

  return (
    <div className="tag-filter">
      <div className="tag-filter-header">
        <h3 className="tag-filter-title">Tags</h3>
        <div className="tag-filter-actions">
          {filterTagIds.length > 0 && (
            <button
              className="tag-filter-clear"
              onClick={handleClearAll}
              title="Clear all filters"
            >
              Clear ({filterTagIds.length})
            </button>
          )}
          <button
            className="tag-filter-add"
            onClick={() => setShowCreateDialog(true)}
            title="Create new tag"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {allTags.length > 5 && (
        <div className="tag-filter-search">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tag-filter-search-input"
          />
          {searchQuery && (
            <button
              className="tag-filter-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <svg
                width="12"
                height="12"
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
      )}

      <div className="tag-filter-list">
        <AnimatePresence>
          {sortedTags.length > 0 ? (
            sortedTags.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag}
                isSelected={filterTagIds.includes(tag.id)}
                usageCount={getTagUsageCount(tag.id)}
                onClick={handleTagClick}
              />
            ))
          ) : (
            <motion.div
              className="tag-filter-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {searchQuery ? 'No matching tags' : 'No tags yet'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreateDialog && (
          <CreateTagDialog
            isOpen={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onCreate={handleCreateTag}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TagFilter;
