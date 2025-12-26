import { useCallback, useRef, useState } from 'react';
import { usePageStore } from '../../stores/pageStore';
import { PageItem } from './PageItem';
import './styles.css';

interface PagePanelProps {
  onPageSwitch?: (pageId: string) => void;
  onBeforePageSwitch?: () => void;
}

export function PagePanel({ onPageSwitch, onBeforePageSwitch }: PagePanelProps) {
  const pages = usePageStore((state) => state.pages);
  const currentPageId = usePageStore((state) => state.currentPageId);
  const addPage = usePageStore((state) => state.addPage);
  const deletePage = usePageStore((state) => state.deletePage);
  const duplicatePage = usePageStore((state) => state.duplicatePage);
  const renamePage = usePageStore((state) => state.renamePage);
  const switchPage = usePageStore((state) => state.switchPage);
  const reorderPages = usePageStore((state) => state.reorderPages);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageId: string } | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const handlePageClick = useCallback((pageId: string) => {
    if (pageId !== currentPageId) {
      onBeforePageSwitch?.();
      switchPage(pageId);
      onPageSwitch?.(pageId);
    }
  }, [currentPageId, switchPage, onPageSwitch, onBeforePageSwitch]);

  const handleAddPage = useCallback(() => {
    onBeforePageSwitch?.();
    const newId = addPage();
    switchPage(newId);
    onPageSwitch?.(newId);
  }, [addPage, switchPage, onPageSwitch, onBeforePageSwitch]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, pageId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (contextMenu && pages.length > 1) {
      deletePage(contextMenu.pageId);
    }
    closeContextMenu();
  }, [contextMenu, pages.length, deletePage, closeContextMenu]);

  const handleDuplicate = useCallback(() => {
    if (contextMenu) {
      const newId = duplicatePage(contextMenu.pageId);
      if (newId) {
        onBeforePageSwitch?.();
        switchPage(newId);
        onPageSwitch?.(newId);
      }
    }
    closeContextMenu();
  }, [contextMenu, duplicatePage, switchPage, onPageSwitch, onBeforePageSwitch, closeContextMenu]);

  const handleRename = useCallback(() => {
    if (contextMenu) {
      setEditingPageId(contextMenu.pageId);
    }
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleRenameSubmit = useCallback((pageId: string, newName: string) => {
    if (newName.trim()) {
      renamePage(pageId, newName.trim());
    }
    setEditingPageId(null);
  }, [renamePage]);

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropTargetIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      reorderPages(draggedIndex, dropTargetIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, [draggedIndex, dropTargetIndex, reorderPages]);

  return (
    <div className="page-panel" ref={panelRef} onClick={closeContextMenu}>
      <div className="page-panel-header">
        <span className="page-panel-title">頁面</span>
        <button className="page-panel-add-btn" onClick={handleAddPage} title="新增頁面 (Ctrl+N)">
          +
        </button>
      </div>

      <div className="page-panel-list">
        {pages.map((page, index) => (
          <PageItem
            key={page.id}
            page={page}
            index={index}
            isActive={page.id === currentPageId}
            isEditing={page.id === editingPageId}
            isDragging={draggedIndex === index}
            isDropTarget={dropTargetIndex === index}
            onClick={() => handlePageClick(page.id)}
            onContextMenu={(e) => handleContextMenu(e, page.id)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onRenameSubmit={(name) => handleRenameSubmit(page.id, name)}
            onRenameCancel={() => setEditingPageId(null)}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="page-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleRename}>重新命名</button>
          <button onClick={handleDuplicate}>複製頁面</button>
          <button
            onClick={handleDelete}
            disabled={pages.length <= 1}
            className={pages.length <= 1 ? 'disabled' : ''}
          >
            刪除頁面
          </button>
        </div>
      )}
    </div>
  );
}

export default PagePanel;
