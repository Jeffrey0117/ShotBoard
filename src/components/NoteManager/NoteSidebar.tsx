/**
 * NoteSidebar Component
 * Main sidebar with folder tree, tag filter, and search
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNoteStore } from '../../stores/noteStore';
import { FolderTree } from './FolderTree';
import { TagFilter } from './TagFilter';
import { SearchBar } from './SearchBar';
import { NoteList } from './NoteList';
import type { ContextMenuItem } from '../../types/note';

interface NoteSidebarProps {
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  isCollapsed?: boolean;
  onWidthChange?: (width: number) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNoteSelect?: (noteId: string) => void;
  onNoteDoubleClick?: (noteId: string) => void;
}

type SidebarTab = 'files' | 'tags' | 'list';

// Context Menu Component
interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(x, window.innerWidth - 200),
    y: Math.min(y, window.innerHeight - items.length * 36 - 20),
  };

  return (
    <motion.div
      ref={menuRef}
      className="context-menu"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
    >
      {items.map((item) =>
        item.label === '' ? (
          <div key={item.id} className="context-menu-separator" />
        ) : (
          <button
            key={item.id}
            className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </motion.div>
  );
};

// Tab Button Component
interface TabButtonProps {
  tab: SidebarTab;
  activeTab: SidebarTab;
  label: string;
  icon: React.ReactNode;
  onClick: (tab: SidebarTab) => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  activeTab,
  label,
  icon,
  onClick,
}) => (
  <button
    className={`sidebar-tab ${activeTab === tab ? 'active' : ''}`}
    onClick={() => onClick(tab)}
    title={label}
    aria-selected={activeTab === tab}
    role="tab"
  >
    {icon}
  </button>
);

// Main NoteSidebar Component
export const NoteSidebar: React.FC<NoteSidebarProps> = ({
  width = 280,
  minWidth = 200,
  maxWidth = 500,
  isCollapsed = false,
  onWidthChange,
  onCollapsedChange,
  onNoteSelect,
  onNoteDoubleClick,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const createNote = useNoteStore((state) => state.createNote);
  const createFolder = useNoteStore((state) => state.createFolder);
  const selectedFolderId = useNoteStore((state) => state.selectedFolderId);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, onWidthChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B to toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        onCollapsedChange?.(!isCollapsed);
      }

      // Ctrl+N to create new note
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const folderId = selectedFolderId || 'folder_root';
        const noteId = createNote(folderId);
        onNoteSelect?.(noteId);
        onNoteDoubleClick?.(noteId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, selectedFolderId, createNote, onCollapsedChange, onNoteSelect, onNoteDoubleClick]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, items: ContextMenuItem[]) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, items });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleNewNote = useCallback(() => {
    const folderId = selectedFolderId || 'folder_root';
    const noteId = createNote(folderId);
    onNoteSelect?.(noteId);
    onNoteDoubleClick?.(noteId);
  }, [selectedFolderId, createNote, onNoteSelect, onNoteDoubleClick]);

  const handleNewFolder = useCallback(() => {
    const parentId = selectedFolderId || null;
    createFolder('New Folder', parentId);
  }, [selectedFolderId, createFolder]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeDoubleClick = useCallback(() => {
    onWidthChange?.(280); // Reset to default width
  }, [onWidthChange]);

  if (isCollapsed) {
    return (
      <div className="sidebar-collapsed">
        <button
          className="sidebar-expand-btn"
          onClick={() => onCollapsedChange?.(false)}
          title="Expand sidebar (Ctrl+B)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.div
        ref={sidebarRef}
        className="note-sidebar"
        style={{ width }}
        initial={{ x: -width }}
        animate={{ x: 0 }}
        exit={{ x: -width }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-title">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Notes</span>
          </div>
          <div className="sidebar-actions">
            <button
              className="sidebar-action-btn"
              onClick={handleNewNote}
              title="New Note (Ctrl+N)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              className="sidebar-action-btn"
              onClick={handleNewFolder}
              title="New Folder"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
            <button
              className="sidebar-action-btn"
              onClick={() => onCollapsedChange?.(true)}
              title="Collapse sidebar (Ctrl+B)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <SearchBar
            onNoteSelect={onNoteSelect}
            placeholder="Search notes..."
          />
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs" role="tablist">
          <TabButton
            tab="files"
            activeTab={activeTab}
            label="Files"
            onClick={setActiveTab}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
          <TabButton
            tab="list"
            activeTab={activeTab}
            label="All Notes"
            onClick={setActiveTab}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
          />
          <TabButton
            tab="tags"
            activeTab={activeTab}
            label="Tags"
            onClick={setActiveTab}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            }
          />
        </div>

        {/* Tab Content */}
        <div className="sidebar-content">
          <AnimatePresence mode="wait">
            {activeTab === 'files' && (
              <motion.div
                key="files"
                className="sidebar-panel"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                <FolderTree
                  onNoteSelect={onNoteSelect}
                  onNoteDoubleClick={onNoteDoubleClick}
                  onContextMenu={handleContextMenu}
                />
              </motion.div>
            )}

            {activeTab === 'list' && (
              <motion.div
                key="list"
                className="sidebar-panel"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                <NoteList
                  onNoteSelect={onNoteSelect}
                  onNoteDoubleClick={onNoteDoubleClick}
                  onContextMenu={handleContextMenu}
                />
              </motion.div>
            )}

            {activeTab === 'tags' && (
              <motion.div
                key="tags"
                className="sidebar-panel"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
              >
                <TagFilter />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className={`sidebar-resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
          title="Drag to resize, double-click to reset"
        />
      </motion.div>

      {/* Context Menu Portal */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={handleCloseContextMenu}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default NoteSidebar;
