/**
 * 白板分頁 Store
 * 簡單的多頁白板管理
 */

import { create } from 'zustand';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { BinaryFiles } from '@excalidraw/excalidraw/types/types';

// ============================================================================
// 類型定義
// ============================================================================

/** 投影片背景設定 */
export interface SlideBackground {
  type: 'slide';
  content: string;      // Markdown 內容
  theme: string;        // 主題 ID
}

export interface WhiteboardPage {
  id: string;
  name: string;
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  viewBackgroundColor: string;
  scrollX: number;
  scrollY: number;
  zoom: number;
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
  /** 投影片背景（可選） */
  slideBackground?: SlideBackground;
}

interface PageState {
  pages: WhiteboardPage[];
  currentPageId: string;
  isGeneratingThumbnail: boolean;
}

interface PageActions {
  // 頁面操作
  addPage: (name?: string) => string;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => string;
  renamePage: (id: string, name: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;

  // 切換頁面
  switchPage: (id: string) => void;
  goToPageByIndex: (index: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // 保存當前頁面狀態
  saveCurrentPageState: (
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
    appState: { viewBackgroundColor: string; scrollX: number; scrollY: number; zoom: { value: number } }
  ) => void;

  // 縮圖
  updateThumbnail: (id: string, thumbnail: string) => void;

  // 取得器
  getCurrentPage: () => WhiteboardPage | null;
  getPageById: (id: string) => WhiteboardPage | undefined;
  getCurrentPageIndex: () => number;

  // 專案載入/儲存
  loadPages: (pages: WhiteboardPage[], currentPageId?: string) => void;
  exportPages: () => { pages: WhiteboardPage[]; currentPageId: string };
  reset: () => void;

  // 簡報整合
  importSlidesAsPages: (markdown: string, theme?: string) => void;
}

type PageStore = PageState & PageActions;

// ============================================================================
// 工具函數
// ============================================================================

const generateId = () => `page_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createEmptyPage = (name?: string): WhiteboardPage => {
  const id = generateId();
  return {
    id,
    name: name || '新頁面',
    elements: [],
    files: {},
    viewBackgroundColor: '#1a1a2e',
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
    thumbnail: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ============================================================================
// 初始狀態
// ============================================================================

const initialPage = createEmptyPage('頁面 1');

const initialState: PageState = {
  pages: [initialPage],
  currentPageId: initialPage.id,
  isGeneratingThumbnail: false,
};

// ============================================================================
// Store 實作
// ============================================================================

export const usePageStore = create<PageStore>((set, get) => ({
  ...initialState,

  // ===== 頁面操作 =====

  addPage: (name) => {
    const pages = get().pages;
    const newName = name || `頁面 ${pages.length + 1}`;
    const newPage = createEmptyPage(newName);

    set((state) => ({
      pages: [...state.pages, newPage],
    }));

    return newPage.id;
  },

  deletePage: (id) => {
    const state = get();
    if (state.pages.length <= 1) return; // 至少保留一頁

    const pageIndex = state.pages.findIndex((p) => p.id === id);
    if (pageIndex === -1) return;

    const newPages = state.pages.filter((p) => p.id !== id);

    // 如果刪除的是當前頁面，切換到相鄰頁面
    let newCurrentId = state.currentPageId;
    if (id === state.currentPageId) {
      const newIndex = Math.min(pageIndex, newPages.length - 1);
      newCurrentId = newPages[newIndex].id;
    }

    set({
      pages: newPages,
      currentPageId: newCurrentId,
    });
  },

  duplicatePage: (id) => {
    const state = get();
    const originalPage = state.pages.find((p) => p.id === id);
    if (!originalPage) return '';

    const newPage: WhiteboardPage = {
      ...originalPage,
      id: generateId(),
      name: `${originalPage.name} (複製)`,
      thumbnail: originalPage.thumbnail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const originalIndex = state.pages.findIndex((p) => p.id === id);
    const newPages = [...state.pages];
    newPages.splice(originalIndex + 1, 0, newPage);

    set({ pages: newPages });
    return newPage.id;
  },

  renamePage: (id, name) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p
      ),
    }));
  },

  reorderPages: (fromIndex, toIndex) => {
    set((state) => {
      const newPages = [...state.pages];
      const [removed] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, removed);
      return { pages: newPages };
    });
  },

  // ===== 切換頁面 =====

  switchPage: (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (page) {
      set({ currentPageId: id });
    }
  },

  goToPageByIndex: (index) => {
    const pages = get().pages;
    if (index >= 0 && index < pages.length) {
      set({ currentPageId: pages[index].id });
    }
  },

  nextPage: () => {
    const state = get();
    const currentIndex = state.pages.findIndex((p) => p.id === state.currentPageId);
    if (currentIndex < state.pages.length - 1) {
      set({ currentPageId: state.pages[currentIndex + 1].id });
    }
  },

  prevPage: () => {
    const state = get();
    const currentIndex = state.pages.findIndex((p) => p.id === state.currentPageId);
    if (currentIndex > 0) {
      set({ currentPageId: state.pages[currentIndex - 1].id });
    }
  },

  // ===== 保存當前頁面狀態 =====

  saveCurrentPageState: (elements, files, appState) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === state.currentPageId
          ? {
              ...p,
              elements,
              files,
              viewBackgroundColor: appState.viewBackgroundColor,
              scrollX: appState.scrollX,
              scrollY: appState.scrollY,
              zoom: appState.zoom.value,
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  },

  // ===== 縮圖 =====

  updateThumbnail: (id, thumbnail) => {
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === id ? { ...p, thumbnail } : p
      ),
    }));
  },

  // ===== 取得器 =====

  getCurrentPage: () => {
    const state = get();
    return state.pages.find((p) => p.id === state.currentPageId) || null;
  },

  getPageById: (id) => {
    return get().pages.find((p) => p.id === id);
  },

  getCurrentPageIndex: () => {
    const state = get();
    return state.pages.findIndex((p) => p.id === state.currentPageId);
  },

  // ===== 專案載入/儲存 =====

  loadPages: (pages, currentPageId) => {
    if (pages.length === 0) {
      const newPage = createEmptyPage('頁面 1');
      set({
        pages: [newPage],
        currentPageId: newPage.id,
      });
    } else {
      set({
        pages,
        currentPageId: currentPageId || pages[0].id,
      });
    }
  },

  exportPages: () => {
    const state = get();
    return {
      pages: state.pages,
      currentPageId: state.currentPageId,
    };
  },

  reset: () => {
    const newPage = createEmptyPage('頁面 1');
    set({
      pages: [newPage],
      currentPageId: newPage.id,
      isGeneratingThumbnail: false,
    });
  },

  // ===== 簡報整合 =====

  importSlidesAsPages: (markdown, theme = 'default') => {
    // 正規化換行符
    const normalizedMarkdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 分離 front matter 和內容
    const frontMatterMatch = normalizedMarkdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    let content = normalizedMarkdown;
    let slideTitle = '簡報';

    if (frontMatterMatch) {
      const yamlContent = frontMatterMatch[1];
      content = frontMatterMatch[2];

      // 提取標題
      const titleMatch = yamlContent.match(/title:\s*(.+)/);
      if (titleMatch) {
        slideTitle = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }

    // 用 --- 分割投影片
    const slideContents = content.split(/\n---\s*\n/).filter(s => s.trim());

    if (slideContents.length === 0) {
      console.warn('No slides found in markdown');
      return;
    }

    // 為每張投影片建立一個頁面
    const newPages: WhiteboardPage[] = slideContents.map((slideContent, index) => {
      // 從內容提取標題作為頁面名稱
      const h1Match = slideContent.match(/^#\s+(.+)$/m);
      const h2Match = slideContent.match(/^##\s+(.+)$/m);
      const pageName = h1Match?.[1] || h2Match?.[1] || `${slideTitle} - ${index + 1}`;

      return {
        id: generateId(),
        name: pageName.trim(),
        elements: [],
        files: {},
        viewBackgroundColor: 'transparent', // 透明背景讓投影片內容可見
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        thumbnail: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        slideBackground: {
          type: 'slide',
          content: slideContent.trim(),
          theme,
        },
      };
    });

    set({
      pages: newPages,
      currentPageId: newPages[0].id,
    });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectPages = (state: PageStore) => state.pages;
export const selectCurrentPageId = (state: PageStore) => state.currentPageId;
export const selectCurrentPage = (state: PageStore) => state.getCurrentPage();
export const selectPageCount = (state: PageStore) => state.pages.length;
