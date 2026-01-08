/**
 * FolderTree Component
 * Recursive folder tree with drag-and-drop support
 */

import React, { useCallback, useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNoteStore } from '../../stores/noteStore';
import type { FileTreeNode, ContextMenuItem } from '../../types/note';

interface FolderTreeProps {
  onNoteSelect?: (noteId: string) => void;
  onNoteDoubleClick?: (noteId: string) => void;
  onContextMenu?: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
}

interface TreeItemProps {
  node: FileTreeNode;
  onSelect: (id: string, type: 'folder' | 'note') => void;
  onDoubleClick: (id: string, type: 'folder' | 'note') => void;
  onContextMenu: (e: React.MouseEvent, node: FileTreeNode) => void;
  onDragStart: (e: React.DragEvent, node: FileTreeNode) => void;
  onDragOver: (e: React.DragEvent, node: FileTreeNode) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, node: FileTreeNode) => void;
  dragOverId: string | null;
  renamingId: string | null;
  onRenameStart: (id: string) => void;
  onRenameEnd: (id: string, newName: string) => void;
  onRenameCancel: () => void;
}

// Icons
const FolderIcon: React.FC<{ isOpen?: boolean }> = ({ isOpen }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="tree-icon folder-icon"
  >
    {isOpen ? (
      <>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </>
    ) : (
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    )}
  </svg>
);

const NoteIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="tree-icon note-icon"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ChevronIcon: React.FC<{ isOpen?: boolean }> = ({ isOpen }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`tree-chevron ${isOpen ? 'open' : ''}`}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Tree Item Component
const TreeItem: React.FC<TreeItemProps> = ({
  node,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverId,
  renamingId,
  onRenameStart,
  onRenameEnd,
  onRenameCancel,
}) => {
  const [localName, setLocalName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleFolderExpanded = useNoteStore((state) => state.toggleFolderExpanded);

  const isRenaming = renamingId === node.id;
  const isDragOver = dragOverId === node.id;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    setLocalName(node.name);
  }, [node.name]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isRenaming) {
        onSelect(node.id, node.type);
      }
    },
    [node.id, node.type, isRenaming, onSelect]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isRenaming) {
        if (node.type === 'folder') {
          toggleFolderExpanded(node.id);
        } else {
          onDoubleClick(node.id, node.type);
        }
      }
    },
    [node.id, node.type, isRenaming, onDoubleClick, toggleFolderExpanded]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, node);
    },
    [node, onContextMenu]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        if (node.type === 'folder') {
          toggleFolderExpanded(node.id);
        } else {
          onDoubleClick(node.id, node.type);
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        onRenameStart(node.id);
      }
    },
    [node.id, node.type, onDoubleClick, onRenameStart, toggleFolderExpanded]
  );

  const handleRenameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onRenameEnd(node.id, localName);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setLocalName(node.name);
        onRenameCancel();
      }
    },
    [node.id, node.name, localName, onRenameEnd, onRenameCancel]
  );

  const handleRenameBlur = useCallback(() => {
    if (localName.trim()) {
      onRenameEnd(node.id, localName);
    } else {
      setLocalName(node.name);
      onRenameCancel();
    }
  }, [node.id, node.name, localName, onRenameEnd, onRenameCancel]);

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.type === 'folder') {
        toggleFolderExpanded(node.id);
      }
    },
    [node.id, node.type, toggleFolderExpanded]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      onDragStart(e, node);
    },
    [node, onDragStart]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (node.type === 'folder') {
        onDragOver(e, node);
      }
    },
    [node, onDragOver]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      onDragLeave(e);
    },
    [onDragLeave]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (node.type === 'folder') {
        onDrop(e, node);
      }
    },
    [node, onDrop]
  );

  return (
    <div className="tree-item-container">
      <div
        className={`tree-item ${node.isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        role="treeitem"
        aria-expanded={node.type === 'folder' ? node.isExpanded : undefined}
        aria-selected={node.isSelected}
      >
        {node.type === 'folder' && (
          <span className="tree-chevron-wrapper" onClick={handleChevronClick}>
            <ChevronIcon isOpen={node.isExpanded} />
          </span>
        )}
        {node.type === 'folder' ? (
          <FolderIcon isOpen={node.isExpanded} />
        ) : (
          <NoteIcon />
        )}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            className="tree-rename-input"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-item-name" title={node.name}>
            {node.name}
          </span>
        )}
      </div>

      {/* Children */}
      {node.type === 'folder' && node.children && node.children.length > 0 && (
        <AnimatePresence initial={false}>
          {node.isExpanded && (
            <motion.div
              className="tree-children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              {node.children.map((child) => (
                <TreeItem
                  key={child.id}
                  node={child}
                  onSelect={onSelect}
                  onDoubleClick={onDoubleClick}
                  onContextMenu={onContextMenu}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  dragOverId={dragOverId}
                  renamingId={renamingId}
                  onRenameStart={onRenameStart}
                  onRenameEnd={onRenameEnd}
                  onRenameCancel={onRenameCancel}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

// Main FolderTree Component
export const FolderTree: React.FC<FolderTreeProps> = ({
  onNoteSelect,
  onNoteDoubleClick,
  onContextMenu,
}) => {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<FileTreeNode | null>(null);

  const fileTree = useNoteStore((state) => state.getFileTree());
  const setActiveNote = useNoteStore((state) => state.setActiveNote);
  const setSelectedFolder = useNoteStore((state) => state.setSelectedFolder);
  const moveNote = useNoteStore((state) => state.moveNote);
  const moveFolder = useNoteStore((state) => state.moveFolder);
  const updateNote = useNoteStore((state) => state.updateNote);
  const updateFolder = useNoteStore((state) => state.updateFolder);
  const createNote = useNoteStore((state) => state.createNote);
  const createFolder = useNoteStore((state) => state.createFolder);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const deleteFolder = useNoteStore((state) => state.deleteFolder);

  const handleSelect = useCallback(
    (id: string, type: 'folder' | 'note') => {
      if (type === 'note') {
        setActiveNote(id);
        onNoteSelect?.(id);
      } else {
        setSelectedFolder(id);
      }
    },
    [setActiveNote, setSelectedFolder, onNoteSelect]
  );

  const handleDoubleClick = useCallback(
    (id: string, type: 'folder' | 'note') => {
      if (type === 'note') {
        onNoteDoubleClick?.(id);
      }
    },
    [onNoteDoubleClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: FileTreeNode) => {
      const items: ContextMenuItem[] = [];

      if (node.type === 'folder') {
        items.push(
          {
            id: 'new-note',
            label: 'New Note',
            shortcut: 'Ctrl+N',
            onClick: () => createNote(node.id),
          },
          {
            id: 'new-folder',
            label: 'New Folder',
            onClick: () => createFolder('New Folder', node.id),
          },
          {
            id: 'separator-1',
            label: '',
            onClick: () => {},
          },
          {
            id: 'rename',
            label: 'Rename',
            shortcut: 'F2',
            onClick: () => setRenamingId(node.id),
          }
        );

        if (node.id !== 'folder_root') {
          items.push({
            id: 'delete',
            label: 'Delete Folder',
            danger: true,
            onClick: () => deleteFolder(node.id),
          });
        }
      } else {
        items.push(
          {
            id: 'open',
            label: 'Open',
            onClick: () => {
              setActiveNote(node.id);
              onNoteDoubleClick?.(node.id);
            },
          },
          {
            id: 'rename',
            label: 'Rename',
            shortcut: 'F2',
            onClick: () => setRenamingId(node.id),
          },
          {
            id: 'separator-1',
            label: '',
            onClick: () => {},
          },
          {
            id: 'delete',
            label: 'Delete Note',
            danger: true,
            onClick: () => deleteNote(node.id),
          }
        );
      }

      onContextMenu?.(e, items);
    },
    [createNote, createFolder, deleteNote, deleteFolder, setActiveNote, onNoteDoubleClick, onContextMenu]
  );

  const handleDragStart = useCallback((e: React.DragEvent, node: FileTreeNode) => {
    setDraggedNode(node);
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: node.id, type: node.type }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, node: FileTreeNode) => {
    if (node.type === 'folder') {
      setDragOverId(node.id);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (_e: React.DragEvent, targetNode: FileTreeNode) => {
      if (!draggedNode || targetNode.type !== 'folder') return;

      // Don't drop on self
      if (draggedNode.id === targetNode.id) {
        setDragOverId(null);
        setDraggedNode(null);
        return;
      }

      // Move item
      if (draggedNode.type === 'note') {
        moveNote(draggedNode.id, targetNode.id);
      } else {
        // Don't allow dropping folder into its own descendant
        moveFolder(draggedNode.id, targetNode.id);
      }

      setDragOverId(null);
      setDraggedNode(null);
    },
    [draggedNode, moveNote, moveFolder]
  );

  const handleRenameStart = useCallback((id: string) => {
    setRenamingId(id);
  }, []);

  const handleRenameEnd = useCallback(
    (id: string, newName: string) => {
      const trimmedName = newName.trim();
      if (!trimmedName) {
        setRenamingId(null);
        return;
      }

      // Check if it's a note or folder
      const node = findNodeById(fileTree, id);
      if (node) {
        if (node.type === 'note') {
          updateNote(id, { title: trimmedName });
        } else {
          updateFolder(id, { name: trimmedName });
        }
      }

      setRenamingId(null);
    },
    [fileTree, updateNote, updateFolder]
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && renamingId) {
        setRenamingId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [renamingId]);

  return (
    <div className="folder-tree" role="tree" aria-label="File tree">
      {fileTree.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          onSelect={handleSelect}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverId={dragOverId}
          renamingId={renamingId}
          onRenameStart={handleRenameStart}
          onRenameEnd={handleRenameEnd}
          onRenameCancel={handleRenameCancel}
        />
      ))}
    </div>
  );
};

// Helper to find node by ID in tree
function findNodeById(nodes: FileTreeNode[], id: string): FileTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export default FolderTree;
