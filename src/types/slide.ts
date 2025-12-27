/**
 * 簡報系統模組類型定義
 * @module types/slide
 * @description Based on 02-SLIDE-SYSTEM-SPEC.md
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

// ============================================================================
// 基礎類型
// ============================================================================

/**
 * 簡報投影片比例
 */
export type AspectRatio = '16/9' | '4/3' | '1/1' | '21/9';

/**
 * 轉場動畫類型
 */
export type TransitionType =
  | 'none'
  | 'slide'
  | 'slide-up'
  | 'fade'
  | 'zoom'
  | 'flip';

/**
 * 元素動畫類型
 */
export type AnimationType =
  | 'fade-in'
  | 'fade-out'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'bounce';

/**
 * 佈局類型
 */
export type LayoutType =
  | 'default'
  | 'center'
  | 'cover'
  | 'section'
  | 'two-cols'
  | 'image-right'
  | 'image-left'
  | 'image'
  | 'quote'
  | 'fact'
  | 'end';

/**
 * 播放模式
 */
export type PlayMode = 'normal' | 'presenter' | 'overview';

// ============================================================================
// 簡報 Metadata
// ============================================================================

/**
 * 簡報 metadata（Front Matter）
 */
export interface PresentationMeta {
  /** 簡報標題 */
  title: string;

  /** 主題名稱 */
  theme: string;

  /** 作者名稱 */
  author: string;

  /** 日期 */
  date: string;

  /** 投影片比例 */
  aspectRatio: AspectRatio;

  /** 預設轉場效果 */
  transition: TransitionType;

  /** 程式碼高亮主題 */
  highlightTheme: string;

  /** 字體配置 */
  fonts: FontConfig;

  /** 描述 */
  description?: string;

  /** 關鍵字 */
  keywords?: string[];
}

/**
 * 字體配置
 */
export interface FontConfig {
  /** 無襯線字體 */
  sans?: string;

  /** 襯線字體 */
  serif?: string;

  /** 等寬字體 */
  mono?: string;

  /** 標題字體 */
  heading?: string;

  /** 字體粗細 */
  weights?: string;
}

// ============================================================================
// 投影片類型
// ============================================================================

/**
 * 單張投影片 metadata
 */
export interface SlideMeta {
  /** 佈局模式 */
  layout: LayoutType;

  /** 背景圖片或顏色 */
  background?: string;

  /** 額外 CSS class */
  class?: string;

  /** 該投影片的轉場效果 */
  transition?: TransitionType;

  /** 講者筆記 */
  notes?: string;

  /** 該投影片的 click 動畫數量 */
  clicks?: number;

  /** 是否隱藏頁碼 */
  hidePageNumber?: boolean;
}

/**
 * 動畫元素
 */
export interface AnimatedElement {
  /** 元素 ID */
  id: string;

  /** 在第幾次點擊時顯示 */
  clickIndex: number;

  /** 動畫類型 */
  animation: AnimationType;

  /** 動畫持續時間 (ms) */
  duration: number;

  /** 延遲時間 (ms) */
  delay: number;
}

/**
 * 嵌入內容
 */
export interface EmbeddedContent {
  /** 內容類型 */
  type: 'whiteboard' | 'image' | 'video' | 'code';

  /** 內容 ID */
  id: string;

  /** 額外屬性 */
  props: Record<string, unknown>;
}

/**
 * 單張投影片
 */
export interface Slide {
  /** 投影片 ID */
  id: string;

  /** 投影片序號 (0-based) */
  index: number;

  /** 原始 Markdown 內容 */
  rawContent: string;

  /** 解析後的 HTML */
  htmlContent: string;

  /** 投影片 metadata */
  meta: SlideMeta;

  /** 動畫元素列表 */
  animatedElements: AnimatedElement[];

  /** 嵌入內容列表 */
  embeddedContents: EmbeddedContent[];
}

/**
 * 簡報文件
 */
export interface Presentation {
  /** 簡報 ID */
  id: string;

  /** 簡報 metadata */
  meta: PresentationMeta;

  /** 投影片列表 */
  slides: Slide[];

  /** 建立時間 */
  createdAt: string;

  /** 更新時間 */
  updatedAt: string;

  /** 來源 Markdown 文件路徑 */
  sourceFile?: string;
}

// ============================================================================
// 主題類型
// ============================================================================

/**
 * 主題顏色配置
 */
export interface ThemeColors {
  /** 主色調 */
  primary: string;

  /** 次要色調 */
  secondary: string;

  /** 強調色 */
  accent: string;

  /** 主背景色 */
  background: string;

  /** 次要背景色 */
  backgroundSecondary: string;

  /** 主文字色 */
  text: string;

  /** 次要文字色 */
  textSecondary: string;

  /** 淡化文字色 */
  textMuted: string;

  /** 成功色 */
  success: string;

  /** 警告色 */
  warning: string;

  /** 錯誤色 */
  error: string;

  /** 資訊色 */
  info: string;

  /** 程式碼背景色 */
  codeBackground: string;

  /** 程式碼前景色 */
  codeForeground: string;
}

/**
 * 主題字體配置
 */
export interface ThemeTypography {
  /** 字體家族 */
  fontFamily: {
    heading: string;
    body: string;
    mono: string;
  };

  /** 字體大小 */
  fontSize: {
    h1: string;
    h2: string;
    h3: string;
    body: string;
    small: string;
    code: string;
  };

  /** 字體粗細 */
  fontWeight: {
    normal: number;
    medium: number;
    bold: number;
  };

  /** 行高 */
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

/**
 * 主題間距配置
 */
export interface ThemeSpacing {
  /** 投影片內距 */
  slidePadding: string;

  /** 內容間距 */
  contentGap: string;

  /** 區塊間距 */
  sectionGap: string;
}

/**
 * 投影片主題定義
 */
export interface SlideTheme {
  /** 主題 ID */
  id: string;

  /** 主題名稱 */
  name: string;

  /** 主題描述 */
  description: string;

  /** 顏色配置 */
  colors: ThemeColors;

  /** 字體配置 */
  typography: ThemeTypography;

  /** 間距配置 */
  spacing: ThemeSpacing;

  /** 佈局樣式覆蓋 */
  layouts?: Partial<Record<LayoutType, React.CSSProperties>>;

  /** 額外 CSS */
  customCSS?: string;

  /** 是否為深色主題 */
  isDark?: boolean;
}

// ============================================================================
// 播放狀態類型
// ============================================================================

/**
 * 標記狀態
 */
export interface AnnotationState {
  /** 是否啟用標記 */
  enabled: boolean;

  /** 當前工具 */
  tool: 'pen' | 'highlighter' | 'eraser' | 'pointer';

  /** 畫筆顏色 */
  color: string;

  /** 筆畫寬度 */
  strokeWidth: number;

  /** 標記元素 */
  elements: ExcalidrawElement[];
}

/**
 * 播放器狀態
 */
export interface PlayerState {
  /** 是否正在播放 */
  isPlaying: boolean;

  /** 是否全螢幕 */
  isFullscreen: boolean;

  /** 播放模式 */
  mode: PlayMode;

  /** 當前投影片索引 */
  currentSlideIndex: number;

  /** 當前動畫進度 */
  currentClickIndex: number;

  /** 總投影片數 */
  totalSlides: number;

  /** 開始時間 */
  startTime: string | null;

  /** 經過秒數 */
  elapsedTime: number;

  /** 標記狀態 */
  annotation: AnnotationState;

  /** 是否正在錄製 */
  isRecording: boolean;

  /** 錄製開始時間 */
  recordingStartTime: string | null;
}

/**
 * 簡報視窗配置
 */
export interface WindowConfig {
  /** 演講者視窗 */
  presenterWindow: Window | null;

  /** 觀眾視窗 */
  audienceWindow: Window | null;
}

// ============================================================================
// 持久化格式
// ============================================================================

/**
 * 簡報專案存檔格式 (.sbpres)
 */
export interface PresentationFile {
  /** Schema 版本 */
  schemaVersion: string;

  /** 簡報數據 */
  presentation: Presentation;

  /** 嵌入的白板資料 */
  whiteboards: Record<string, WhiteboardData>;

  /** 各投影片的標記 */
  annotations: Record<string, AnnotationData>;

  /** 嵌入的資源 (base64) */
  assets: Record<string, string>;
}

/**
 * 白板數據
 */
export interface WhiteboardData {
  /** 白板 ID */
  id: string;

  /** Excalidraw 元素 */
  elements: ExcalidrawElement[];

  /** Excalidraw 應用狀態 */
  appState: Record<string, unknown>;
}

/**
 * 標記數據
 */
export interface AnnotationData {
  /** 所屬投影片 ID */
  slideId: string;

  /** Excalidraw 元素 */
  elements: ExcalidrawElement[];

  /** 建立時間 */
  createdAt: string;
}

// ============================================================================
// 簡報 Store 狀態類型
// ============================================================================

/**
 * 簡報模組狀態
 */
export interface SlideModuleState {
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

  /** 當前主題 */
  theme: SlideTheme;

  /** 標記狀態 */
  annotation: AnnotationState;

  /** 簡報開始時間 */
  presentationStartTime: string | null;

  /** 經過秒數 */
  elapsedSeconds: number;

  /** 是否啟用錄製 */
  isRecordingEnabled: boolean;

  /** 是否正在解析 */
  isParsing: boolean;

  /** 解析錯誤 */
  parseError: string | null;
}

// ============================================================================
// 解析相關類型
// ============================================================================

/**
 * 解析選項
 */
export interface ParseOptions {
  /** 是否處理動畫 */
  enableAnimations?: boolean;

  /** 是否處理白板嵌入 */
  enableWhiteboards?: boolean;

  /** 程式碼高亮主題 */
  codeTheme?: string;

  /** 基礎路徑 */
  basePath?: string;
}

/**
 * 解析結果
 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean;

  /** 簡報數據 */
  presentation?: Presentation;

  /** 錯誤訊息 */
  error?: string;

  /** 警告列表 */
  warnings: string[];
}

// ============================================================================
// 章節標記（錄製用）
// ============================================================================

/**
 * 章節標記
 */
export interface ChapterMarker {
  /** 時間戳（毫秒） */
  timestamp: number;

  /** 投影片索引 */
  slideIndex: number;

  /** 章節標題 */
  title: string;
}

/**
 * 錄製 metadata
 */
export interface RecordingMetadata {
  /** 簡報標題 */
  presentationTitle: string;

  /** 錄製時間 */
  recordedAt: string;

  /** 總時長（秒） */
  duration: number;

  /** 章節列表 */
  chapters: ChapterMarker[];
}

// ============================================================================
// 常量
// ============================================================================

/**
 * 預設動畫時長（毫秒）
 */
export const DEFAULT_ANIMATION_DURATION = 300;

/**
 * 預設轉場時長（毫秒）
 */
export const DEFAULT_TRANSITION_DURATION = 500;

/**
 * 預設標記顏色列表
 */
export const DEFAULT_ANNOTATION_COLORS = [
  '#ff0000', // Red
  '#0066ff', // Blue
  '#00cc00', // Green
  '#ffcc00', // Yellow
  '#ff6600', // Orange
  '#ffffff', // White
  '#000000', // Black
] as const;

/**
 * 預設投影片比例
 */
export const DEFAULT_ASPECT_RATIO: AspectRatio = '16/9';

/**
 * 預設主題 ID
 */
export const DEFAULT_THEME_ID = 'default';

/**
 * 預設簡報 Metadata
 */
export const DEFAULT_PRESENTATION_META: PresentationMeta = {
  title: 'Untitled Presentation',
  theme: 'default',
  author: '',
  date: new Date().toISOString().split('T')[0],
  aspectRatio: '16/9',
  transition: 'slide',
  highlightTheme: 'dracula',
  fonts: {},
};

/**
 * 預設投影片 Metadata
 */
export const DEFAULT_SLIDE_META: SlideMeta = {
  layout: 'default',
  clicks: 0,
};

/**
 * 預設標記狀態
 */
export const DEFAULT_ANNOTATION_STATE: AnnotationState = {
  enabled: false,
  tool: 'pen',
  color: '#ff0000',
  strokeWidth: 2,
  elements: [],
};
