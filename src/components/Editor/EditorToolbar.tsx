import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { MarkdownEditorRef } from './MarkdownEditor';

export type EditorViewMode = 'split' | 'edit-only' | 'preview-only';

export interface EditorToolbarProps {
  /** Reference to the markdown editor */
  editorRef: React.RefObject<MarkdownEditorRef>;
  /** Current view mode */
  viewMode: EditorViewMode;
  /** Callback when view mode changes */
  onViewModeChange: (mode: EditorViewMode) => void;
  /** Callback when insert whiteboard is clicked */
  onInsertWhiteboard?: () => void;
  /** Additional CSS class */
  className?: string;
}

// SVG Icons as components for better maintainability
const icons = {
  bold: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  strikethrough: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  heading: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16" />
      <path d="M18 4v16" />
      <path d="M6 12h12" />
    </svg>
  ),
  listUnordered: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  listOrdered: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <text x="4" y="8" fontSize="8" fill="currentColor" stroke="none">1</text>
      <text x="4" y="14" fontSize="8" fill="currentColor" stroke="none">2</text>
      <text x="4" y="20" fontSize="8" fill="currentColor" stroke="none">3</text>
    </svg>
  ),
  taskList: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="M5 8l1 1 2-2" />
      <line x1="12" y1="8" x2="21" y2="8" />
      <rect x="3" y="13" width="6" height="6" rx="1" />
      <line x1="12" y1="16" x2="21" y2="16" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  codeBlock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="9 9 7 12 9 15" />
      <polyline points="15 9 17 12 15 15" />
    </svg>
  ),
  quote: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  horizontalRule: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  whiteboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7l3 3-3 3" />
      <circle cx="16" cy="16" r="2" />
      <line x1="10" y1="17" x2="12" y2="17" />
    </svg>
  ),
  splitView: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  ),
  editView: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  previewView: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  shortcut,
}) => {
  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      type="button"
      className={`editor-toolbar__btn ${active ? 'editor-toolbar__btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      aria-pressed={active}
    >
      {icon}
    </button>
  );
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editorRef,
  viewMode,
  onViewModeChange,
  onInsertWhiteboard,
  className = '',
}) => {
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const headingMenuRef = useRef<HTMLDivElement>(null);

  // Close heading menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headingMenuRef.current && !headingMenuRef.current.contains(event.target as Node)) {
        setHeadingMenuOpen(false);
      }
    };

    if (headingMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [headingMenuOpen]);

  // Format actions
  const handleBold = useCallback(() => {
    editorRef.current?.wrapSelection('**', '**');
    editorRef.current?.focus();
  }, [editorRef]);

  const handleItalic = useCallback(() => {
    editorRef.current?.wrapSelection('_', '_');
    editorRef.current?.focus();
  }, [editorRef]);

  const handleStrikethrough = useCallback(() => {
    editorRef.current?.wrapSelection('~~', '~~');
    editorRef.current?.focus();
  }, [editorRef]);

  const handleHeading = useCallback(
    (level: number) => {
      const prefix = '#'.repeat(level) + ' ';
      const selection = editorRef.current?.getSelection() || 'Heading';
      editorRef.current?.replaceSelection(prefix + selection);
      editorRef.current?.focus();
      setHeadingMenuOpen(false);
    },
    [editorRef]
  );

  const handleUnorderedList = useCallback(() => {
    const selection = editorRef.current?.getSelection();
    if (selection) {
      const lines = selection.split('\n').map((line) => `- ${line}`);
      editorRef.current?.replaceSelection(lines.join('\n'));
    } else {
      editorRef.current?.insertText('- ');
    }
    editorRef.current?.focus();
  }, [editorRef]);

  const handleOrderedList = useCallback(() => {
    const selection = editorRef.current?.getSelection();
    if (selection) {
      const lines = selection.split('\n').map((line, i) => `${i + 1}. ${line}`);
      editorRef.current?.replaceSelection(lines.join('\n'));
    } else {
      editorRef.current?.insertText('1. ');
    }
    editorRef.current?.focus();
  }, [editorRef]);

  const handleTaskList = useCallback(() => {
    const selection = editorRef.current?.getSelection();
    if (selection) {
      const lines = selection.split('\n').map((line) => `- [ ] ${line}`);
      editorRef.current?.replaceSelection(lines.join('\n'));
    } else {
      editorRef.current?.insertText('- [ ] ');
    }
    editorRef.current?.focus();
  }, [editorRef]);

  const handleLink = useCallback(() => {
    const selection = editorRef.current?.getSelection();
    if (selection) {
      editorRef.current?.replaceSelection(`[${selection}](url)`);
    } else {
      editorRef.current?.insertText('[link text](url)');
    }
    editorRef.current?.focus();
  }, [editorRef]);

  const handleImage = useCallback(() => {
    const selection = editorRef.current?.getSelection();
    if (selection) {
      editorRef.current?.replaceSelection(`![${selection}](image-url)`);
    } else {
      editorRef.current?.insertText('![alt text](image-url)');
    }
    editorRef.current?.focus();
  }, [editorRef]);

  const handleInlineCode = useCallback(() => {
    editorRef.current?.wrapSelection('`', '`');
    editorRef.current?.focus();
  }, [editorRef]);

  const handleCodeBlock = useCallback(() => {
    const selection = editorRef.current?.getSelection();
    if (selection) {
      editorRef.current?.replaceSelection(`\`\`\`\n${selection}\n\`\`\``);
    } else {
      editorRef.current?.insertText('```\n\n```');
    }
    editorRef.current?.focus();
  }, [editorRef]);

  const handleQuote = useCallback(() => {
    const selection = editorRef.current?.getSelection();
    if (selection) {
      const lines = selection.split('\n').map((line) => `> ${line}`);
      editorRef.current?.replaceSelection(lines.join('\n'));
    } else {
      editorRef.current?.insertText('> ');
    }
    editorRef.current?.focus();
  }, [editorRef]);

  const handleTable = useCallback(() => {
    const table = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;
    editorRef.current?.insertText('\n' + table + '\n');
    editorRef.current?.focus();
  }, [editorRef]);

  const handleHorizontalRule = useCallback(() => {
    editorRef.current?.insertText('\n---\n');
    editorRef.current?.focus();
  }, [editorRef]);

  const handleWhiteboard = useCallback(() => {
    if (onInsertWhiteboard) {
      onInsertWhiteboard();
    } else {
      const id = `wb_${Date.now()}`;
      editorRef.current?.insertText(`\n::whiteboard{id="${id}" width="800" height="400"}\n`);
    }
    editorRef.current?.focus();
  }, [editorRef, onInsertWhiteboard]);

  return (
    <div className={`editor-toolbar ${className}`} role="toolbar" aria-label="Formatting options">
      {/* Format group */}
      <div className="editor-toolbar__group" role="group" aria-label="Text formatting">
        <ToolbarButton
          icon={icons.bold}
          label="Bold"
          onClick={handleBold}
          shortcut="Ctrl+B"
        />
        <ToolbarButton
          icon={icons.italic}
          label="Italic"
          onClick={handleItalic}
          shortcut="Ctrl+I"
        />
        <ToolbarButton
          icon={icons.strikethrough}
          label="Strikethrough"
          onClick={handleStrikethrough}
          shortcut="Ctrl+Shift+X"
        />
      </div>

      <div className="editor-toolbar__divider" role="separator" />

      {/* Heading dropdown */}
      <div className="editor-toolbar__group" role="group" aria-label="Headings">
        <div className="editor-toolbar__dropdown" ref={headingMenuRef}>
          <button
            type="button"
            className={`editor-toolbar__btn ${headingMenuOpen ? 'editor-toolbar__btn--active' : ''}`}
            onClick={() => setHeadingMenuOpen(!headingMenuOpen)}
            aria-label="Insert heading"
            aria-expanded={headingMenuOpen}
            aria-haspopup="menu"
          >
            {icons.heading}
            <span style={{ width: 8, height: 8, marginLeft: 2 }}>{icons.chevronDown}</span>
          </button>
          {headingMenuOpen && (
            <div className="editor-toolbar__dropdown-menu" role="menu">
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <button
                  key={level}
                  type="button"
                  className="editor-toolbar__dropdown-item"
                  onClick={() => handleHeading(level)}
                  role="menuitem"
                >
                  Heading {level}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="editor-toolbar__divider" role="separator" />

      {/* List group */}
      <div className="editor-toolbar__group" role="group" aria-label="Lists">
        <ToolbarButton
          icon={icons.listUnordered}
          label="Bullet list"
          onClick={handleUnorderedList}
        />
        <ToolbarButton
          icon={icons.listOrdered}
          label="Numbered list"
          onClick={handleOrderedList}
        />
        <ToolbarButton
          icon={icons.taskList}
          label="Task list"
          onClick={handleTaskList}
        />
      </div>

      <div className="editor-toolbar__divider" role="separator" />

      {/* Insert group */}
      <div className="editor-toolbar__group" role="group" aria-label="Insert">
        <ToolbarButton
          icon={icons.link}
          label="Insert link"
          onClick={handleLink}
          shortcut="Ctrl+K"
        />
        <ToolbarButton
          icon={icons.image}
          label="Insert image"
          onClick={handleImage}
        />
        <ToolbarButton
          icon={icons.code}
          label="Inline code"
          onClick={handleInlineCode}
        />
        <ToolbarButton
          icon={icons.codeBlock}
          label="Code block"
          onClick={handleCodeBlock}
          shortcut="Ctrl+Shift+K"
        />
        <ToolbarButton
          icon={icons.quote}
          label="Blockquote"
          onClick={handleQuote}
        />
        <ToolbarButton
          icon={icons.table}
          label="Insert table"
          onClick={handleTable}
        />
        <ToolbarButton
          icon={icons.horizontalRule}
          label="Horizontal rule"
          onClick={handleHorizontalRule}
        />
      </div>

      <div className="editor-toolbar__divider" role="separator" />

      {/* Whiteboard */}
      <div className="editor-toolbar__group" role="group" aria-label="Whiteboard">
        <ToolbarButton
          icon={icons.whiteboard}
          label="Insert whiteboard"
          onClick={handleWhiteboard}
        />
      </div>

      {/* View mode toggle - pushed to the right */}
      <div className="editor-toolbar__view-toggle" role="group" aria-label="View mode">
        <ToolbarButton
          icon={icons.editView}
          label="Editor only"
          onClick={() => onViewModeChange('edit-only')}
          active={viewMode === 'edit-only'}
        />
        <ToolbarButton
          icon={icons.splitView}
          label="Split view"
          onClick={() => onViewModeChange('split')}
          active={viewMode === 'split'}
        />
        <ToolbarButton
          icon={icons.previewView}
          label="Preview only"
          onClick={() => onViewModeChange('preview-only')}
          active={viewMode === 'preview-only'}
        />
      </div>
    </div>
  );
};

export default EditorToolbar;
