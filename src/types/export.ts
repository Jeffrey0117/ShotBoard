/**
 * 導出模組類型定義
 * @module types/export
 * @description Based on 03-EXPORT-SYSTEM-SPEC.md
 */

// ============================================================================
// 基礎類型
// ============================================================================

/**
 * 導出格式
 */
export type ExportFormat = 'html-single' | 'html-site' | 'pdf' | 'slides';

/**
 * 圖片品質等級
 */
export type ImageQuality = 'high' | 'medium' | 'low';

/**
 * 紙張尺寸
 */
export type PaperSize = 'a4' | 'letter' | 'a3' | 'legal' | 'custom';

/**
 * 頁面方向
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * 導出狀態
 */
export type ExportStatus = 'idle' | 'preparing' | 'processing' | 'completed' | 'error' | 'cancelled';

/**
 * 簡報引擎類型
 */
export type SlideEngine = 'reveal' | 'impress';

/**
 * 簡報轉場效果
 */
export type SlideTransition = 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom';

/**
 * 簡報比例
 */
export type SlideAspectRatio = '16:9' | '4:3' | '16:10';

// ============================================================================
// 主題配置
// ============================================================================

/**
 * 主題變數
 */
export interface ThemeVariables {
  /** 主色調 */
  primaryColor: string;

  /** 背景色 */
  backgroundColor: string;

  /** 文字色 */
  textColor: string;

  /** 字體家族 */
  fontFamily: string;

  /** 字體大小 */
  fontSize: string;

  /** 行高 */
  lineHeight: string;

  /** 程式碼字體 */
  codeFont: string;

  /** 圓角大小 */
  borderRadius: string;
}

/**
 * 導出主題
 */
export interface ExportTheme {
  /** 主題 ID */
  id: string;

  /** 主題名稱 */
  name: string;

  /** 主題描述 */
  description: string;

  /** 預覽圖片路徑 */
  previewImage: string;

  /** CSS 路徑 */
  cssPath: string;

  /** 主題變數 */
  variables: ThemeVariables;

  /** 是否為深色主題 */
  isDark?: boolean;
}

// ============================================================================
// 導覽配置
// ============================================================================

/**
 * 導覽項目
 */
export interface NavigationItem {
  /** 標題 */
  title: string;

  /** 路徑 */
  path: string;

  /** 子項目 */
  children?: NavigationItem[];

  /** 圖示 */
  icon?: string;
}

/**
 * 導覽配置
 */
export interface NavigationConfig {
  /** 導覽類型 */
  type: 'auto' | 'manual';

  /** 手動配置的導覽項目 */
  items?: NavigationItem[];

  /** 是否顯示麵包屑 */
  showBreadcrumb: boolean;

  /** 是否顯示上下頁連結 */
  showPrevNext: boolean;

  /** 側邊欄位置 */
  sidebarPosition: 'left' | 'right';

  /** 是否可收合側邊欄 */
  collapsibleSidebar: boolean;
}

/**
 * 頁尾配置（網站）
 */
export interface FooterConfig {
  /** 版權文字 */
  copyright?: string;

  /** 連結 */
  links?: Array<{ text: string; url: string }>;

  /** 是否顯示 "Powered by ShotBoard" */
  showPoweredBy: boolean;
}

// ============================================================================
// PDF 特有配置
// ============================================================================

/**
 * 頁首/頁尾配置
 * 可用變數: {title}, {date}, {pageNumber}, {totalPages}
 */
export interface PageHeaderFooter {
  /** 左側內容 */
  left?: string;

  /** 中間內容 */
  center?: string;

  /** 右側內容 */
  right?: string;
}

/**
 * 浮水印配置
 */
export interface WatermarkConfig {
  /** 浮水印文字 */
  text: string;

  /** 字型大小 */
  fontSize: number;

  /** 顏色（含透明度） */
  color: string;

  /** 旋轉角度 */
  rotation: number;

  /** 位置 */
  position: 'center' | 'diagonal' | 'corner';
}

/**
 * 頁面邊距配置（mm）
 */
export interface PageMargins {
  /** 上邊距 */
  top: number;

  /** 右邊距 */
  right: number;

  /** 下邊距 */
  bottom: number;

  /** 左邊距 */
  left: number;
}

// ============================================================================
// 導出配置
// ============================================================================

/**
 * 基礎導出配置
 */
export interface BaseExportConfig {
  /** 導出格式 */
  format: ExportFormat;

  /** 輸出目錄路徑 */
  outputPath: string;

  /** 選擇的主題 */
  theme: ExportTheme;

  /** 自訂 CSS */
  customCSS?: string;

  /** 是否生成目錄 */
  generateTOC: boolean;

  /** 目錄最大深度 (1-6) */
  tocDepth: number;

  /** 圖片品質 */
  imageQuality: ImageQuality;

  /** 是否壓縮輸出 */
  minify: boolean;

  /** 是否包含 ShotBoard 版權資訊 */
  includeBranding: boolean;

  /** 語言 */
  lang?: string;
}

/**
 * HTML 單頁導出配置
 */
export interface HTMLSingleExportConfig extends BaseExportConfig {
  format: 'html-single';

  /** 是否內嵌所有資源 (Base64) */
  embedResources: boolean;

  /** 內嵌資源的大小閾值 (bytes) */
  embedThreshold: number;

  /** 是否內嵌 CSS */
  inlineCSS: boolean;

  /** 是否內嵌 JavaScript */
  inlineJS: boolean;
}

/**
 * 靜態網站導出配置
 */
export interface HTMLSiteExportConfig extends BaseExportConfig {
  format: 'html-site';

  /** 網站標題 */
  siteTitle: string;

  /** 網站描述 */
  siteDescription?: string;

  /** 網站 Logo */
  siteLogo?: string;

  /** Base URL (用於部署至子目錄) */
  baseUrl: string;

  /** 是否生成搜索功能 */
  enableSearch: boolean;

  /** 是否生成 Sitemap */
  generateSitemap: boolean;

  /** 是否生成 404 頁面 */
  generate404: boolean;

  /** 導覽配置 */
  navigation: NavigationConfig;

  /** 頁尾配置 */
  footer?: FooterConfig;

  /** Favicon 路徑 */
  favicon?: string;
}

/**
 * PDF 導出配置
 */
export interface PDFExportConfig extends BaseExportConfig {
  format: 'pdf';

  /** 紙張尺寸 */
  paperSize: PaperSize;

  /** 自訂紙張尺寸 (mm) */
  customSize?: { width: number; height: number };

  /** 頁面方向 */
  orientation: PageOrientation;

  /** 邊距 (mm) */
  margins: PageMargins;

  /** 頁首配置 */
  header?: PageHeaderFooter;

  /** 頁尾配置 */
  footer?: PageHeaderFooter;

  /** 是否生成目錄頁 */
  generateTOCPage: boolean;

  /** 是否顯示頁碼 */
  showPageNumbers: boolean;

  /** 圖片 DPI */
  imageDPI: number;

  /** 浮水印配置 */
  watermark?: WatermarkConfig;

  /** 是否列印背景 */
  printBackground: boolean;

  /** 縮放比例 */
  scale?: number;
}

/**
 * 簡報導出配置
 */
export interface SlidesExportConfig extends BaseExportConfig {
  format: 'slides';

  /** 是否打包為單一文件 */
  singleFile: boolean;

  /** 簡報引擎 */
  engine: SlideEngine;

  /** 轉場效果 */
  transition: SlideTransition;

  /** 是否包含演講者備註 */
  includeNotes: boolean;

  /** 是否包含控制元件 */
  showControls: boolean;

  /** 是否顯示進度條 */
  showProgress: boolean;

  /** 是否支援觸控滑動 */
  touchNavigation: boolean;

  /** 簡報比例 */
  aspectRatio: SlideAspectRatio;

  /** 是否支援 Hash 導覽 */
  hashNavigation: boolean;
}

/**
 * 統一導出配置類型
 */
export type ExportConfig =
  | HTMLSingleExportConfig
  | HTMLSiteExportConfig
  | PDFExportConfig
  | SlidesExportConfig;

// ============================================================================
// 導出結果與進度
// ============================================================================

/**
 * 導出進度
 */
export interface ExportProgress {
  /** 當前狀態 */
  status: ExportStatus;

  /** 當前步驟描述 */
  currentStep: string;

  /** 進度百分比 (0-100) */
  percentage: number;

  /** 已處理項目數 */
  processedItems: number;

  /** 總項目數 */
  totalItems: number;

  /** 警告訊息 */
  warnings: string[];

  /** 錯誤訊息 */
  errors: string[];

  /** 開始時間 */
  startTime?: string;

  /** 預估剩餘時間（秒） */
  estimatedTimeRemaining?: number;
}

/**
 * 導出的文件
 */
export interface ExportedFile {
  /** 相對路徑 */
  path: string;

  /** 文件類型 */
  type: 'html' | 'css' | 'js' | 'image' | 'font' | 'pdf' | 'json' | 'other';

  /** 文件大小 (bytes) */
  size: number;
}

/**
 * 導出統計
 */
export interface ExportStatistics {
  /** 頁面數量 */
  pageCount: number;

  /** 圖片數量 */
  imageCount: number;

  /** 白板數量 */
  whiteboardCount: number;

  /** 程式碼區塊數量 */
  codeBlockCount: number;

  /** 原始大小 */
  originalSize: number;

  /** 壓縮後大小 */
  compressedSize: number;

  /** 壓縮比率 */
  compressionRatio?: number;
}

/**
 * 導出結果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;

  /** 輸出路徑 */
  outputPath: string;

  /** 生成的文件列表 */
  files: ExportedFile[];

  /** 總檔案大小 (bytes) */
  totalSize: number;

  /** 導出耗時 (ms) */
  duration: number;

  /** 警告訊息 */
  warnings: string[];

  /** 錯誤訊息 (如果失敗) */
  error?: string;

  /** 統計資訊 */
  statistics: ExportStatistics;

  /** 導出時間 */
  exportedAt: string;
}

// ============================================================================
// 導出歷史
// ============================================================================

/**
 * 導出歷史記錄
 */
export interface ExportHistoryEntry {
  /** 記錄 ID */
  id: string;

  /** 導出格式 */
  format: ExportFormat;

  /** 輸出路徑 */
  outputPath: string;

  /** 導出配置 */
  config: ExportConfig;

  /** 導出結果 */
  result: ExportResult;

  /** 導出時間 */
  exportedAt: string;
}

/**
 * 導出預設配置
 */
export interface ExportPreset {
  /** 預設 ID */
  id: string;

  /** 預設名稱 */
  name: string;

  /** 預設描述 */
  description?: string;

  /** 導出配置 */
  config: Partial<ExportConfig>;

  /** 建立時間 */
  createdAt: string;

  /** 是否為內建預設 */
  isBuiltIn?: boolean;
}

// ============================================================================
// Store 狀態類型
// ============================================================================

/**
 * 導出模組狀態
 */
export interface ExportModuleState {
  /** 當前導出配置 */
  config: ExportConfig | null;

  /** 是否正在導出 */
  isExporting: boolean;

  /** 導出進度 */
  progress: ExportProgress;

  /** 最後導出結果 */
  lastResult: ExportResult | null;

  /** 可用主題列表 */
  availableThemes: ExportTheme[];

  /** 導出歷史 */
  history: ExportHistoryEntry[];

  /** 預設配置列表 */
  presets: ExportPreset[];

  /** 預覽 HTML（如果有） */
  previewHtml: string | null;

  /** 是否顯示預覽 */
  showPreview: boolean;
}

// ============================================================================
// 資源處理類型
// ============================================================================

/**
 * 處理後的資源
 */
export interface ProcessedResource {
  /** 原始路徑 */
  originalPath: string;

  /** 輸出路徑（相對於 outputDir） */
  outputPath: string;

  /** 是否內嵌 (Base64) */
  embedded: boolean;

  /** 內嵌數據 (如果 embedded = true) */
  dataUri?: string;

  /** 文件大小 */
  size: number;

  /** MIME 類型 */
  mimeType: string;
}

/**
 * 資源處理選項
 */
export interface ResourceProcessorOptions {
  /** 輸出目錄 */
  outputDir: string;

  /** 圖片品質 */
  imageQuality: ImageQuality;

  /** 是否壓縮 */
  compress: boolean;

  /** 內嵌大小閾值 (bytes) */
  embedThreshold: number;

  /** 是否優化圖片 */
  optimizeImages?: boolean;

  /** 最大圖片寬度 */
  maxImageWidth?: number;

  /** 最大圖片高度 */
  maxImageHeight?: number;
}

// ============================================================================
// 模板類型
// ============================================================================

/**
 * 模板類型
 */
export type TemplateType = 'single-page' | 'site-page' | 'site-layout' | 'pdf-page';

/**
 * HTML 模板
 */
export interface HTMLTemplate {
  /** 模板 ID */
  id: string;

  /** 模板名稱 */
  name: string;

  /** 模板類型 */
  type: TemplateType;

  /** Handlebars 模板內容 */
  content: string;

  /** 所需的 partial 模板 */
  partials?: Record<string, string>;

  /** 預設樣式 */
  defaultStyles: string;
}

/**
 * PDF 模板
 */
export interface PDFTemplate extends Omit<HTMLTemplate, 'type'> {
  type: 'pdf-page';

  /** 頁首模板 */
  headerTemplate?: string;

  /** 頁尾模板 */
  footerTemplate?: string;

  /** 目錄頁模板 */
  tocTemplate?: string;
}

// ============================================================================
// 錯誤代碼
// ============================================================================

/**
 * 導出錯誤代碼
 */
export enum ExportErrorCode {
  /** 輸出目錄不存在或無寫入權限 */
  OUTPUT_DIR_INVALID = 'EXPORT_001',

  /** 資源文件遺失 */
  RESOURCE_MISSING = 'EXPORT_002',

  /** PDF 生成失敗 */
  PDF_GENERATION_FAILED = 'EXPORT_003',

  /** 圖片處理失敗 */
  IMAGE_PROCESSING_FAILED = 'EXPORT_004',

  /** 白板導出失敗 */
  WHITEBOARD_EXPORT_FAILED = 'EXPORT_005',

  /** 模板渲染錯誤 */
  TEMPLATE_RENDER_ERROR = 'EXPORT_006',

  /** 磁碟空間不足 */
  DISK_SPACE_INSUFFICIENT = 'EXPORT_007',

  /** 導出已取消 */
  EXPORT_CANCELLED = 'EXPORT_008',

  /** 未知錯誤 */
  UNKNOWN_ERROR = 'EXPORT_999',
}

/**
 * 導出錯誤
 */
export interface ExportError {
  /** 錯誤代碼 */
  code: ExportErrorCode;

  /** 錯誤訊息 */
  message: string;

  /** 詳細資訊 */
  details?: string;

  /** 相關檔案路徑 */
  filePath?: string;
}

// ============================================================================
// 常量
// ============================================================================

/**
 * 預設圖片品質設定
 */
export const IMAGE_QUALITY_PRESETS: Record<ImageQuality, {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}> = {
  high: {
    maxWidth: 2400,
    maxHeight: 2400,
    quality: 90,
    format: 'png',
  },
  medium: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 80,
    format: 'jpeg',
  },
  low: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 60,
    format: 'jpeg',
  },
};

/**
 * 預設 PDF 邊距（mm）
 */
export const DEFAULT_PDF_MARGINS: PageMargins = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
};

/**
 * 預設內嵌資源閾值（bytes）
 */
export const DEFAULT_EMBED_THRESHOLD = 100 * 1024; // 100KB

/**
 * 內建主題 ID 列表
 */
export const BUILTIN_THEME_IDS = [
  'default',
  'dark',
  'academic',
  'minimal',
  'corporate',
] as const;

/**
 * 預設 HTML 單頁配置
 */
export const DEFAULT_HTML_SINGLE_CONFIG: Omit<HTMLSingleExportConfig, 'outputPath' | 'theme'> = {
  format: 'html-single',
  generateTOC: true,
  tocDepth: 3,
  imageQuality: 'medium',
  minify: true,
  includeBranding: true,
  embedResources: true,
  embedThreshold: DEFAULT_EMBED_THRESHOLD,
  inlineCSS: true,
  inlineJS: true,
};

/**
 * 預設 PDF 配置
 */
export const DEFAULT_PDF_CONFIG: Omit<PDFExportConfig, 'outputPath' | 'theme'> = {
  format: 'pdf',
  generateTOC: true,
  tocDepth: 3,
  imageQuality: 'high',
  minify: false,
  includeBranding: true,
  paperSize: 'a4',
  orientation: 'portrait',
  margins: DEFAULT_PDF_MARGINS,
  generateTOCPage: true,
  showPageNumbers: true,
  imageDPI: 150,
  printBackground: true,
};
