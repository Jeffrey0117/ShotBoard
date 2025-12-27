/**
 * 簡報系統 Store
 * Zustand store for managing presentation slides, playback, and annotations
 * @module stores/slideStore
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type {
  Slide,
  Presentation,
  PresentationMeta,
  SlideMeta,
  SlideTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  AnnotationState,
  PlayMode,
  AnimatedElement,
  ParseOptions,
  ParseResult,
} from '../types/slide';
import {
  DEFAULT_PRESENTATION_META,
  DEFAULT_SLIDE_META,
} from '../types/slide';

// ============================================================================
// ID 生成與時間工具
// ============================================================================

const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const now = () => new Date().toISOString();

// ============================================================================
// 預設主題
// ============================================================================

const defaultThemeColors: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#f59e0b',
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  codeBackground: '#1e293b',
  codeForeground: '#e2e8f0',
};

const defaultThemeTypography: ThemeTypography = {
  fontFamily: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  fontSize: {
    h1: '3rem',
    h2: '2.25rem',
    h3: '1.5rem',
    body: '1.125rem',
    small: '0.875rem',
    code: '0.9rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

const defaultThemeSpacing: ThemeSpacing = {
  slidePadding: '3rem',
  contentGap: '1.5rem',
  sectionGap: '2rem',
};

const defaultTheme: SlideTheme = {
  id: 'default',
  name: 'Default',
  description: 'Clean and modern default theme',
  colors: defaultThemeColors,
  typography: defaultThemeTypography,
  spacing: defaultThemeSpacing,
  isDark: false,
};

// Export default theme for external use
export const DEFAULT_THEME = defaultTheme;

// ============================================================================
// 預設標記狀態
// ============================================================================

const initialAnnotationState: AnnotationState = {
  enabled: false,
  tool: 'pen',
  color: '#ff0000',
  strokeWidth: 2,
  elements: [],
};

// ============================================================================
// Store 狀態與 Actions 介面
// ============================================================================

interface SlideStoreState {
  /** 當前簡報 */
  presentation: Presentation | null;

  /** 當前投影片索引 */
  currentSlideIndex: number;

  /** 當前動畫索引 */
  currentClickIndex: number;

  /** 是否正在播放 */
  isPlaying: boolean;

  /** 是否全螢幕 */
  isFullscreen: boolean;

  /** 播放模式 */
  mode: PlayMode;

  /** 當前主題 */
  theme: SlideTheme;

  /** 標記狀態 */
  annotation: AnnotationState;

  /** 各投影片的標記 */
  slideAnnotations: Map<string, ExcalidrawElement[]>;

  /** 簡報開始時間 */
  presentationStartTime: string | null;

  /** 經過秒數 */
  elapsedSeconds: number;

  /** 計時器 ID */
  timerIntervalId: number | null;

  /** 是否正在解析 */
  isParsing: boolean;

  /** 解析錯誤 */
  parseError: string | null;

  /** 解析警告 */
  parseWarnings: string[];

  /** 是否有未儲存的變更 */
  hasUnsavedChanges: boolean;

  /** 來源檔案路徑 */
  sourceFilePath: string | null;

  /** 是否顯示總覽視圖 */
  isOverviewVisible: boolean;

  /** 是否顯示演講者視圖 */
  isPresenterViewOpen: boolean;
}

interface SlideStoreActions {
  // ===== 簡報管理 =====
  /** 從 Markdown 解析簡報 */
  parseFromMarkdown: (markdown: string, options?: ParseOptions) => ParseResult;

  /** 建立新簡報 */
  createPresentation: (meta?: Partial<PresentationMeta>) => string;

  /** 載入簡報 */
  loadPresentation: (presentation: Presentation) => void;

  /** 更新簡報 metadata */
  updatePresentationMeta: (meta: Partial<PresentationMeta>) => void;

  /** 清除簡報 */
  clearPresentation: () => void;

  // ===== 投影片管理 =====
  /** 新增投影片 */
  addSlide: (content: string, meta?: Partial<SlideMeta>, insertAt?: number) => string;

  /** 更新投影片內容 */
  updateSlide: (slideId: string, content: string) => void;

  /** 更新投影片 metadata */
  updateSlideMeta: (slideId: string, meta: Partial<SlideMeta>) => void;

  /** 刪除投影片 */
  deleteSlide: (slideId: string) => void;

  /** 移動投影片 */
  moveSlide: (fromIndex: number, toIndex: number) => void;

  /** 複製投影片 */
  duplicateSlide: (slideId: string) => string;

  // ===== 導覽控制 =====
  /** 跳轉到指定投影片 */
  goToSlide: (index: number) => void;

  /** 下一張投影片或動畫 */
  next: () => void;

  /** 上一張投影片或動畫 */
  previous: () => void;

  /** 跳到第一張 */
  goToFirst: () => void;

  /** 跳到最後一張 */
  goToLast: () => void;

  // ===== 播放控制 =====
  /** 開始播放 */
  startPresentation: (mode?: PlayMode) => void;

  /** 停止播放 */
  stopPresentation: () => void;

  /** 暫停/繼續 */
  togglePause: () => void;

  /** 切換全螢幕 */
  toggleFullscreen: () => void;

  /** 設定播放模式 */
  setMode: (mode: PlayMode) => void;

  // ===== 標記功能 =====
  /** 切換標記模式 */
  toggleAnnotation: () => void;

  /** 設定標記工具 */
  setAnnotationTool: (tool: AnnotationState['tool']) => void;

  /** 設定標記顏色 */
  setAnnotationColor: (color: string) => void;

  /** 設定標記筆畫寬度 */
  setAnnotationStrokeWidth: (width: number) => void;

  /** 更新標記元素 */
  updateAnnotationElements: (elements: ExcalidrawElement[]) => void;

  /** 清除當前投影片標記 */
  clearCurrentAnnotations: () => void;

  /** 清除所有標記 */
  clearAllAnnotations: () => void;

  /** 儲存當前投影片標記 */
  saveCurrentAnnotations: () => void;

  // ===== 主題管理 =====
  /** 設定主題 */
  setTheme: (theme: SlideTheme) => void;

  /** 更新主題顏色 */
  updateThemeColors: (colors: Partial<ThemeColors>) => void;

  /** 重設為預設主題 */
  resetTheme: () => void;

  // ===== 計時器 =====
  /** 開始計時 */
  startTimer: () => void;

  /** 停止計時 */
  stopTimer: () => void;

  /** 重設計時器 */
  resetTimer: () => void;

  // ===== 取得器 =====
  /** 取得當前投影片 */
  getCurrentSlide: () => Slide | null;

  /** 取得投影片 by ID */
  getSlideById: (id: string) => Slide | undefined;

  /** 取得投影片 by 索引 */
  getSlideByIndex: (index: number) => Slide | undefined;

  /** 取得總投影片數 */
  getTotalSlides: () => number;

  /** 取得當前動畫進度 */
  getAnimationProgress: () => { current: number; total: number };

  /** 取得格式化的經過時間 */
  getFormattedElapsedTime: () => string;

  // ===== 狀態管理 =====
  /** 設定來源檔案路徑 */
  setSourceFilePath: (path: string | null) => void;

  /** 設定未儲存變更 */
  setHasUnsavedChanges: (value: boolean) => void;

  /** 匯出簡報為 JSON */
  exportPresentation: () => string;

  // ===== 視圖控制 =====
  /** 切換總覽視圖 */
  toggleOverview: () => void;

  /** 設定總覽視圖顯示狀態 */
  setOverviewVisible: (visible: boolean) => void;

  /** 切換演講者視圖 */
  togglePresenterView: () => void;

  /** 設定演講者視圖開啟狀態 */
  setPresenterViewOpen: (open: boolean) => void;

  /** 重設 store */
  reset: () => void;
}

type SlideStore = SlideStoreState & SlideStoreActions;

// ============================================================================
// 初始狀態
// ============================================================================

const initialState: SlideStoreState = {
  presentation: null,
  currentSlideIndex: 0,
  currentClickIndex: 0,
  isPlaying: false,
  isFullscreen: false,
  mode: 'normal',
  theme: defaultTheme,
  annotation: initialAnnotationState,
  slideAnnotations: new Map(),
  presentationStartTime: null,
  elapsedSeconds: 0,
  timerIntervalId: null,
  isParsing: false,
  parseError: null,
  parseWarnings: [],
  hasUnsavedChanges: false,
  sourceFilePath: null,
  isOverviewVisible: false,
  isPresenterViewOpen: false,
};

// ============================================================================
// Store 實作
// ============================================================================

export const useSlideStore = create<SlideStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ===== 簡報管理 =====

    parseFromMarkdown: (markdown, options = {}) => {
      set({ isParsing: true, parseError: null, parseWarnings: [] });

      try {
        const warnings: string[] = [];

        // 正規化換行符
        const normalizedMarkdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // 分離 front matter 和內容
        const frontMatterMatch = normalizedMarkdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        let meta: PresentationMeta = { ...DEFAULT_PRESENTATION_META };
        let content = normalizedMarkdown;

        if (frontMatterMatch) {
          try {
            // 簡易 YAML 解析
            const yamlContent = frontMatterMatch[1];
            const yamlLines = yamlContent.split('\n');
            yamlLines.forEach((line) => {
              const colonIndex = line.indexOf(':');
              if (colonIndex > 0) {
                const key = line.slice(0, colonIndex).trim() as keyof PresentationMeta;
                const value = line.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
                if (key in meta) {
                  (meta as unknown as Record<string, unknown>)[key] = value;
                }
              }
            });
          } catch (e) {
            warnings.push('Failed to parse front matter');
          }
          content = frontMatterMatch[2];
        }

        // 用 --- 分割投影片（支援前後有空白）
        const slideContents = content.split(/\n---\s*\n/);
        const slides: Slide[] = [];

        slideContents.forEach((slideContent, index) => {
          if (!slideContent.trim()) return;

          const slideId = generateId('slide');
          const slideMeta: SlideMeta = { ...DEFAULT_SLIDE_META };

          // 提取投影片級別的配置（如 layout, background 等）
          const metaMatch = slideContent.match(/^<!--\s*([\s\S]*?)\s*-->/);
          if (metaMatch) {
            try {
              const metaLines = metaMatch[1].split('\n');
              metaLines.forEach((line) => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                  const key = line.slice(0, colonIndex).trim() as keyof SlideMeta;
                  const value = line.slice(colonIndex + 1).trim();
                  if (key in slideMeta) {
                    // Safe assignment for known keys
                    (slideMeta as unknown as Record<string, unknown>)[key] = value;
                  }
                }
              });
            } catch (e) {
              warnings.push(`Failed to parse slide ${index + 1} metadata`);
            }
          }

          // 計算動畫元素
          const animatedElements: AnimatedElement[] = [];
          const clickMatches = slideContent.matchAll(/\{v-click(?::(\d+))?\}/g);
          let clickIndex = 0;
          for (const match of clickMatches) {
            clickIndex = match[1] ? parseInt(match[1], 10) : clickIndex + 1;
            animatedElements.push({
              id: generateId('anim'),
              clickIndex,
              animation: 'fade-in',
              duration: 300,
              delay: 0,
            });
          }
          slideMeta.clicks = clickIndex;

          // 清理內容（移除配置註釋）
          const cleanContent = slideContent
            .replace(/^<!--[\s\S]*?-->\s*\n?/, '')
            .replace(/\{v-click(?::\d+)?\}/g, '')
            .trim();

          slides.push({
            id: slideId,
            index: slides.length,
            rawContent: cleanContent,
            htmlContent: '', // 讓 SlideRenderer 用 ReactMarkdown 渲染
            meta: slideMeta,
            animatedElements,
            embeddedContents: [],
          });
        });

        if (slides.length === 0) {
          throw new Error('No slides found in markdown');
        }

        const presentation: Presentation = {
          id: generateId('pres'),
          meta,
          slides,
          createdAt: now(),
          updatedAt: now(),
          sourceFile: options.basePath,
        };

        set({
          presentation,
          currentSlideIndex: 0,
          currentClickIndex: 0,
          isParsing: false,
          parseWarnings: warnings,
          hasUnsavedChanges: false,
        });

        return {
          success: true,
          presentation,
          warnings,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
        set({
          isParsing: false,
          parseError: errorMessage,
        });
        return {
          success: false,
          error: errorMessage,
          warnings: [],
        };
      }
    },

    createPresentation: (meta = {}) => {
      const id = generateId('pres');
      const timestamp = now();

      const presentation: Presentation = {
        id,
        meta: { ...DEFAULT_PRESENTATION_META, ...meta },
        slides: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      set({
        presentation,
        currentSlideIndex: 0,
        currentClickIndex: 0,
        hasUnsavedChanges: true,
      });

      return id;
    },

    loadPresentation: (presentation) => {
      set({
        presentation,
        currentSlideIndex: 0,
        currentClickIndex: 0,
        isPlaying: false,
        hasUnsavedChanges: false,
      });
    },

    updatePresentationMeta: (meta) => {
      set((state) => {
        if (!state.presentation) return state;
        return {
          presentation: {
            ...state.presentation,
            meta: { ...state.presentation.meta, ...meta },
            updatedAt: now(),
          },
          hasUnsavedChanges: true,
        };
      });
    },

    clearPresentation: () => {
      const state = get();
      if (state.timerIntervalId) {
        clearInterval(state.timerIntervalId);
      }
      set({
        presentation: null,
        currentSlideIndex: 0,
        currentClickIndex: 0,
        isPlaying: false,
        slideAnnotations: new Map(),
        hasUnsavedChanges: false,
      });
    },

    // ===== 投影片管理 =====

    addSlide: (content, meta = {}, insertAt) => {
      const state = get();
      if (!state.presentation) return '';

      const slideId = generateId('slide');
      const index = insertAt ?? state.presentation.slides.length;

      const newSlide: Slide = {
        id: slideId,
        index,
        rawContent: content,
        htmlContent: content, // 簡化處理
        meta: { ...DEFAULT_SLIDE_META, ...meta },
        animatedElements: [],
        embeddedContents: [],
      };

      set((state) => {
        if (!state.presentation) return state;

        const slides = [...state.presentation.slides];
        slides.splice(index, 0, newSlide);

        // 重新編號
        slides.forEach((slide, i) => {
          slide.index = i;
        });

        return {
          presentation: {
            ...state.presentation,
            slides,
            updatedAt: now(),
          },
          hasUnsavedChanges: true,
        };
      });

      return slideId;
    },

    updateSlide: (slideId, content) => {
      set((state) => {
        if (!state.presentation) return state;

        const slides = state.presentation.slides.map((slide) =>
          slide.id === slideId
            ? { ...slide, rawContent: content, htmlContent: content }
            : slide
        );

        return {
          presentation: {
            ...state.presentation,
            slides,
            updatedAt: now(),
          },
          hasUnsavedChanges: true,
        };
      });
    },

    updateSlideMeta: (slideId, meta) => {
      set((state) => {
        if (!state.presentation) return state;

        const slides = state.presentation.slides.map((slide) =>
          slide.id === slideId
            ? { ...slide, meta: { ...slide.meta, ...meta } }
            : slide
        );

        return {
          presentation: {
            ...state.presentation,
            slides,
            updatedAt: now(),
          },
          hasUnsavedChanges: true,
        };
      });
    },

    deleteSlide: (slideId) => {
      set((state) => {
        if (!state.presentation) return state;

        const slides = state.presentation.slides.filter((slide) => slide.id !== slideId);

        // 重新編號
        slides.forEach((slide, i) => {
          slide.index = i;
        });

        // 調整當前索引
        const newIndex = Math.min(state.currentSlideIndex, slides.length - 1);

        return {
          presentation: {
            ...state.presentation,
            slides,
            updatedAt: now(),
          },
          currentSlideIndex: Math.max(0, newIndex),
          currentClickIndex: 0,
          hasUnsavedChanges: true,
        };
      });
    },

    moveSlide: (fromIndex, toIndex) => {
      set((state) => {
        if (!state.presentation) return state;

        const slides = [...state.presentation.slides];
        const [removed] = slides.splice(fromIndex, 1);
        slides.splice(toIndex, 0, removed);

        // 重新編號
        slides.forEach((slide, i) => {
          slide.index = i;
        });

        return {
          presentation: {
            ...state.presentation,
            slides,
            updatedAt: now(),
          },
          hasUnsavedChanges: true,
        };
      });
    },

    duplicateSlide: (slideId) => {
      const state = get();
      if (!state.presentation) return '';

      const originalSlide = state.presentation.slides.find((s) => s.id === slideId);
      if (!originalSlide) return '';

      const newSlideId = generateId('slide');
      const newSlide: Slide = {
        ...originalSlide,
        id: newSlideId,
        index: originalSlide.index + 1,
      };

      set((state) => {
        if (!state.presentation) return state;

        const slides = [...state.presentation.slides];
        slides.splice(originalSlide.index + 1, 0, newSlide);

        // 重新編號
        slides.forEach((slide, i) => {
          slide.index = i;
        });

        return {
          presentation: {
            ...state.presentation,
            slides,
            updatedAt: now(),
          },
          hasUnsavedChanges: true,
        };
      });

      return newSlideId;
    },

    // ===== 導覽控制 =====

    goToSlide: (index) => {
      const state = get();
      if (!state.presentation) return;

      const maxIndex = state.presentation.slides.length - 1;
      const newIndex = Math.max(0, Math.min(index, maxIndex));

      // 儲存當前投影片的標記
      if (state.annotation.elements.length > 0) {
        get().saveCurrentAnnotations();
      }

      set({ currentSlideIndex: newIndex, currentClickIndex: 0 });

      // 載入新投影片的標記
      const slideId = state.presentation.slides[newIndex]?.id;
      if (slideId) {
        const savedAnnotations = state.slideAnnotations.get(slideId) || [];
        set((state) => ({
          annotation: { ...state.annotation, elements: savedAnnotations },
        }));
      }
    },

    next: () => {
      const state = get();
      if (!state.presentation) return;

      const currentSlide = state.presentation.slides[state.currentSlideIndex];
      if (!currentSlide) return;

      const maxClicks = currentSlide.meta.clicks || 0;

      if (state.currentClickIndex < maxClicks) {
        // 下一個動畫
        set({ currentClickIndex: state.currentClickIndex + 1 });
      } else if (state.currentSlideIndex < state.presentation.slides.length - 1) {
        // 下一張投影片
        get().goToSlide(state.currentSlideIndex + 1);
      }
    },

    previous: () => {
      const state = get();
      if (!state.presentation) return;

      if (state.currentClickIndex > 0) {
        // 上一個動畫
        set({ currentClickIndex: state.currentClickIndex - 1 });
      } else if (state.currentSlideIndex > 0) {
        // 上一張投影片
        const prevIndex = state.currentSlideIndex - 1;
        const prevSlide = state.presentation.slides[prevIndex];
        get().goToSlide(prevIndex);
        // 設定到該投影片的最後一個動畫
        if (prevSlide) {
          set({ currentClickIndex: prevSlide.meta.clicks || 0 });
        }
      }
    },

    goToFirst: () => {
      get().goToSlide(0);
    },

    goToLast: () => {
      const state = get();
      if (!state.presentation) return;
      get().goToSlide(state.presentation.slides.length - 1);
    },

    // ===== 播放控制 =====

    startPresentation: (mode = 'normal') => {
      set({
        isPlaying: true,
        mode,
        presentationStartTime: now(),
      });
      get().startTimer();
    },

    stopPresentation: () => {
      get().stopTimer();
      set({
        isPlaying: false,
        isFullscreen: false,
        mode: 'normal',
      });
    },

    togglePause: () => {
      set((state) => ({ isPlaying: !state.isPlaying }));
    },

    toggleFullscreen: () => {
      set((state) => ({ isFullscreen: !state.isFullscreen }));
    },

    setMode: (mode) => {
      set({ mode });
    },

    // ===== 標記功能 =====

    toggleAnnotation: () => {
      set((state) => ({
        annotation: { ...state.annotation, enabled: !state.annotation.enabled },
      }));
    },

    setAnnotationTool: (tool) => {
      set((state) => ({
        annotation: { ...state.annotation, tool },
      }));
    },

    setAnnotationColor: (color) => {
      set((state) => ({
        annotation: { ...state.annotation, color },
      }));
    },

    setAnnotationStrokeWidth: (strokeWidth) => {
      set((state) => ({
        annotation: { ...state.annotation, strokeWidth },
      }));
    },

    updateAnnotationElements: (elements) => {
      set((state) => ({
        annotation: { ...state.annotation, elements },
      }));
    },

    clearCurrentAnnotations: () => {
      set((state) => ({
        annotation: { ...state.annotation, elements: [] },
      }));
    },

    clearAllAnnotations: () => {
      set({
        slideAnnotations: new Map(),
        annotation: { ...initialAnnotationState },
      });
    },

    saveCurrentAnnotations: () => {
      const state = get();
      if (!state.presentation) return;

      const currentSlide = state.presentation.slides[state.currentSlideIndex];
      if (!currentSlide) return;

      const newAnnotations = new Map(state.slideAnnotations);
      newAnnotations.set(currentSlide.id, [...state.annotation.elements]);

      set({ slideAnnotations: newAnnotations });
    },

    // ===== 主題管理 =====

    setTheme: (theme) => {
      set({ theme });
    },

    updateThemeColors: (colors) => {
      set((state) => ({
        theme: {
          ...state.theme,
          colors: { ...state.theme.colors, ...colors },
        },
      }));
    },

    resetTheme: () => {
      set({ theme: defaultTheme });
    },

    // ===== 計時器 =====

    startTimer: () => {
      const intervalId = window.setInterval(() => {
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
      }, 1000);
      set({ timerIntervalId: intervalId });
    },

    stopTimer: () => {
      const state = get();
      if (state.timerIntervalId) {
        clearInterval(state.timerIntervalId);
        set({ timerIntervalId: null });
      }
    },

    resetTimer: () => {
      get().stopTimer();
      set({ elapsedSeconds: 0, presentationStartTime: null });
    },

    // ===== 取得器 =====

    getCurrentSlide: () => {
      const state = get();
      if (!state.presentation) return null;
      return state.presentation.slides[state.currentSlideIndex] || null;
    },

    getSlideById: (id) => {
      const state = get();
      return state.presentation?.slides.find((s) => s.id === id);
    },

    getSlideByIndex: (index) => {
      const state = get();
      return state.presentation?.slides[index];
    },

    getTotalSlides: () => {
      const state = get();
      return state.presentation?.slides.length || 0;
    },

    getAnimationProgress: () => {
      const state = get();
      const currentSlide = get().getCurrentSlide();
      return {
        current: state.currentClickIndex,
        total: currentSlide?.meta.clicks || 0,
      };
    },

    getFormattedElapsedTime: () => {
      const state = get();
      const hours = Math.floor(state.elapsedSeconds / 3600);
      const minutes = Math.floor((state.elapsedSeconds % 3600) / 60);
      const seconds = state.elapsedSeconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    // ===== 狀態管理 =====

    setSourceFilePath: (path) => {
      set({ sourceFilePath: path });
    },

    setHasUnsavedChanges: (value) => {
      set({ hasUnsavedChanges: value });
    },

    exportPresentation: () => {
      const state = get();
      if (!state.presentation) return '{}';

      const exportData = {
        schemaVersion: '1.0.0',
        presentation: state.presentation,
        annotations: Object.fromEntries(state.slideAnnotations),
        theme: state.theme,
      };

      return JSON.stringify(exportData, null, 2);
    },

    // ===== 視圖控制 =====

    toggleOverview: () => {
      set((state) => ({ isOverviewVisible: !state.isOverviewVisible }));
    },

    setOverviewVisible: (visible) => {
      set({ isOverviewVisible: visible });
    },

    togglePresenterView: () => {
      set((state) => ({ isPresenterViewOpen: !state.isPresenterViewOpen }));
    },

    setPresenterViewOpen: (open) => {
      set({ isPresenterViewOpen: open });
    },

    reset: () => {
      const state = get();
      if (state.timerIntervalId) {
        clearInterval(state.timerIntervalId);
      }
      set(initialState);
    },
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentSlide = (state: SlideStore) => state.getCurrentSlide();

export const selectIsPresenting = (state: SlideStore) => state.isPlaying;

export const selectSlideCount = (state: SlideStore) => state.getTotalSlides();

export const selectProgress = (state: SlideStore) => ({
  current: state.currentSlideIndex + 1,
  total: state.getTotalSlides(),
});

export const selectAnnotation = (state: SlideStore) => state.annotation;

export const selectTheme = (state: SlideStore) => state.theme;

export const selectIsOverviewVisible = (state: SlideStore) => state.isOverviewVisible;

export const selectIsPresenterViewOpen = (state: SlideStore) => state.isPresenterViewOpen;

export const selectPresentationState = (state: SlideStore) => ({
  presentation: state.presentation,
  currentSlideIndex: state.currentSlideIndex,
  currentClickIndex: state.currentClickIndex,
  isPlaying: state.isPlaying,
  isFullscreen: state.isFullscreen,
  annotation: state.annotation,
  isOverviewVisible: state.isOverviewVisible,
  isPresenterViewOpen: state.isPresenterViewOpen,
});
