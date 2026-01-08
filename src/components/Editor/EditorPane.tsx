import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MarkdownEditor, type MarkdownEditorRef } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { EditorToolbar, type EditorViewMode } from './EditorToolbar';
import './Editor.css';

export interface EditorPaneProps {
  /** Markdown content value */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Initial view mode */
  initialViewMode?: EditorViewMode;
  /** Initial split ratio (0-1, where 0.5 means 50/50 split) */
  initialSplitRatio?: number;
  /** Minimum panel width in pixels */
  minPanelWidth?: number;
  /** Callback when whiteboard is clicked in preview */
  onWhiteboardClick?: (whiteboardId: string) => void;
  /** Callback to insert a new whiteboard */
  onInsertWhiteboard?: () => void;
  /** Additional CSS class */
  className?: string;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  value,
  onChange,
  readOnly = false,
  initialViewMode = 'split',
  initialSplitRatio = 0.5,
  minPanelWidth = 200,
  onWhiteboardClick,
  onInsertWhiteboard,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<EditorViewMode>(initialViewMode);
  const [splitRatio, setSplitRatio] = useState(initialSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollRatio, setScrollRatio] = useState(0);

  const editorRef = useRef<MarkdownEditorRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  // Handle editor scroll for sync scrolling
  const handleEditorScroll = useCallback(
    (scrollInfo: { top: number; height: number; clientHeight: number }) => {
      const maxScroll = scrollInfo.height - scrollInfo.clientHeight;
      if (maxScroll > 0) {
        setScrollRatio(scrollInfo.top / maxScroll);
      }
    },
    []
  );

  // Handle cursor position change
  const handleCursorChange = useCallback(
    (_position: { line: number; column: number }) => {
      // Could be used for status bar or other UI elements
      // console.log('Cursor at:', position);
    },
    []
  );

  // Divider drag handling
  const handleDividerMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);
    },
    []
  );

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = event.clientX - containerRect.left;

      // Calculate new split ratio with bounds
      let newRatio = mouseX / containerWidth;

      // Enforce minimum panel widths
      const minRatio = minPanelWidth / containerWidth;
      const maxRatio = 1 - minRatio;

      newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minPanelWidth]);

  // Double-click to reset split ratio
  const handleDividerDoubleClick = useCallback(() => {
    setSplitRatio(0.5);
  }, []);

  // Calculate panel styles based on split ratio and view mode
  const panelStyles = useMemo(() => {
    if (viewMode === 'edit-only') {
      return {
        editor: { flex: 1 },
        preview: { display: 'none' as const },
      };
    }

    if (viewMode === 'preview-only') {
      return {
        editor: { display: 'none' as const },
        preview: { flex: 1 },
      };
    }

    return {
      editor: { flex: splitRatio },
      preview: { flex: 1 - splitRatio },
    };
  }, [viewMode, splitRatio]);

  // Keyboard shortcuts for view mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            setViewMode('edit-only');
            break;
          case '2':
            event.preventDefault();
            setViewMode('split');
            break;
          case '3':
            event.preventDefault();
            setViewMode('preview-only');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get the CSS class for view mode
  const viewModeClass = useMemo(() => {
    switch (viewMode) {
      case 'edit-only':
        return 'editor-pane--edit-only';
      case 'preview-only':
        return 'editor-pane--preview-only';
      default:
        return '';
    }
  }, [viewMode]);

  return (
    <div className={`editor-pane ${viewModeClass} ${className}`}>
      <EditorToolbar
        editorRef={editorRef}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onInsertWhiteboard={onInsertWhiteboard}
      />

      <div
        ref={containerRef}
        className="editor-pane__content"
        style={{ cursor: isDragging ? 'col-resize' : undefined }}
      >
        {/* Editor panel */}
        <div
          ref={editorWrapperRef}
          className="editor-pane__editor-wrapper"
          style={panelStyles.editor}
        >
          <MarkdownEditor
            ref={editorRef}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            autoFocus={viewMode !== 'preview-only'}
            onScroll={handleEditorScroll}
            onCursorChange={handleCursorChange}
          />
        </div>

        {/* Resizable divider */}
        {viewMode === 'split' && (
          <div
            className={`editor-pane__divider ${isDragging ? 'editor-pane__divider--dragging' : ''}`}
            onMouseDown={handleDividerMouseDown}
            onDoubleClick={handleDividerDoubleClick}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor and preview panels"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSplitRatio((prev) => Math.max(0.2, prev - 0.05));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSplitRatio((prev) => Math.min(0.8, prev + 0.05));
              }
            }}
          />
        )}

        {/* Preview panel */}
        <div
          ref={previewWrapperRef}
          className="editor-pane__preview-wrapper"
          style={panelStyles.preview}
        >
          <MarkdownPreview
            content={value}
            scrollRatio={scrollRatio}
            onWhiteboardClick={onWhiteboardClick}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPane;
