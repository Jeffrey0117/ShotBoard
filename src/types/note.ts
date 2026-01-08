/**
 * Markdown 筆記管理模組類型定義
 * @module types/note
 * @description Based on 01-NOTE-MANAGER-SPEC.md
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

// ============================================================================
// 核心類型定義
// ============================================================================

/**
 * 筆記文檔
 * 表示一個完整的 Markdown 筆記
 */
export interface Note {
  /** 唯一識別碼 */
  id: string;

  /** 筆記標題 */
  title: string;

  /** Markdown 內容 */
  content: string;

  /** 所屬資料夾 ID */
  folderId: string;

  /** 標籤 ID 列表 */
  tagIds: string[];

  /** 嵌入的白板 ID 列表 */
  embeddedWhiteboardIds: string[];

  /** 嵌入的圖片資產 ID 列表 */
  embeddedAssetIds: string[];

  /** Front Matter 元數據 */
  frontMatter: NoteFrontMatter;

  /** 建立時間 (ISO 8601) */
  createdAt: string;

  /** 最後更新時間 (ISO 8601) */
  updatedAt: string;

  /** 是否已刪除（軟刪除） */
  isDeleted: boolean;

  /** 刪除時間 */
  deletedAt?: string;

  /** 相對檔案路徑 */
  relativePath?: string;

  /** 字數統計 */
  wordCount?: number;
}

/**
 * 筆記 Front Matter
 * Markdown 檔案頂部的 YAML 元數據
 */
export interface NoteFrontMatter {
  /** 作者 */
  author?: string;

  /** 描述 */
  description?: string;

  /** 封面圖片 */
  cover?: string;

  /** 語言 */
  lang?: string;

  /** 自訂元數據 */
  [key: string]: unknown;
}

/**
 * 資料夾
 * 用於組織筆記的層級結構
 */
export interface Folder {
  /** 唯一識別碼 */
  id: string;

  /** 資料夾名稱 */
  name: string;

  /** 父資料夾 ID（null 表示根目錄） */
  parentId: string | null;

  /** 排序順序 */
  order: number;

  /** 是否展開 */
  isExpanded: boolean;

  /** 建立時間 */
  createdAt: string;

  /** 最後更新時間 */
  updatedAt: string;

  /** 圖示（可選） */
  icon?: string;
}

/**
 * 標籤
 * 用於交叉分類筆記
 */
export interface Tag {
  /** 唯一識別碼 */
  id: string;

  /** 標籤名稱 */
  name: string;

  /** 標籤顏色（HEX 格式） */
  color: string;

  /** 建立時間 */
  createdAt: string;

  /** 使用計數 */
  usageCount?: number;
}

// ============================================================================
// 白板相關類型
// ============================================================================

/**
 * 嵌入式白板
 * 儲存在筆記中的 Excalidraw 繪圖
 */
export interface EmbeddedWhiteboard {
  /** 唯一識別碼 */
  id: string;

  /** 所屬筆記 ID */
  noteId: string;

  /** Excalidraw 場景數據 */
  sceneData: ExcalidrawSceneData;

  /** 顯示寬度（像素） */
  displayWidth: number;

  /** 顯示高度（像素） */
  displayHeight: number;

  /** 建立時間 */
  createdAt: string;

  /** 最後更新時間 */
  updatedAt: string;
}

/**
 * Excalidraw 場景數據
 */
export interface ExcalidrawSceneData {
  /** Excalidraw 元素陣列 */
  elements: readonly ExcalidrawElement[];

  /** 應用程式狀態 */
  appState: Record<string, unknown>;

  /** 檔案資產 */
  files: Record<string, BinaryFileData>;
}

/**
 * 二進制檔案數據
 */
export interface BinaryFileData {
  /** 檔案 ID */
  id: string;

  /** Data URL 格式的檔案內容 */
  dataURL: string;

  /** MIME 類型 */
  mimeType: string;

  /** 建立時間戳 */
  created: number;
}

// ============================================================================
// 資產類型
// ============================================================================

/**
 * 圖片資產
 * 筆記中嵌入的圖片或其他媒體檔案
 */
export interface NoteAsset {
  /** 唯一識別碼 */
  id: string;

  /** 檔案名稱 */
  fileName: string;

  /** MIME 類型 */
  mimeType: string;

  /** 檔案大小（bytes） */
  size: number;

  /** 相對檔案路徑 */
  relativePath: string;

  /** 建立時間 */
  createdAt: string;

  /** 圖片寬度（如適用） */
  width?: number;

  /** 圖片高度（如適用） */
  height?: number;
}

// ============================================================================
// UI 輔助類型
// ============================================================================

/**
 * 檔案樹節點（用於 UI 渲染）
 */
export interface FileTreeNode {
  /** 節點 ID */
  id: string;

  /** 節點類型 */
  type: 'folder' | 'note';

  /** 顯示名稱 */
  name: string;

  /** 子節點 */
  children?: FileTreeNode[];

  /** 是否展開（僅資料夾） */
  isExpanded?: boolean;

  /** 是否被選中 */
  isSelected?: boolean;

  /** 深度層級 */
  depth: number;

  /** 最後更新時間（筆記用） */
  updatedAt?: string;

  /** 標籤 ID 列表（筆記用） */
  tagIds?: string[];

  /** 是否正在拖曳 */
  isDragging?: boolean;

  /** 是否為拖曳目標 */
  isDropTarget?: boolean;
}

/**
 * 搜索結果
 */
export interface SearchResult {
  /** 筆記 */
  note: Note;

  /** 匹配分數（0-1） */
  score: number;

  /** 匹配的內容片段 */
  matches: SearchMatch[];
}

/**
 * 搜索匹配
 */
export interface SearchMatch {
  /** 匹配欄位 */
  field: 'title' | 'content' | 'tags';

  /** 匹配文字 */
  value: string;

  /** 匹配位置索引 */
  indices: [number, number][];
}

/**
 * 筆記排序選項
 */
export type NoteSortOption =
  | 'name-asc'
  | 'name-desc'
  | 'updated-asc'
  | 'updated-desc'
  | 'created-asc'
  | 'created-desc';

/**
 * 編輯器視圖模式
 */
export type EditorViewMode = 'split' | 'edit-only' | 'preview-only';

// ============================================================================
// 狀態類型
// ============================================================================

/**
 * 儲存狀態
 */
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

/**
 * 筆記模組狀態
 */
export interface NoteModuleState {
  /** 所有筆記 */
  notes: Map<string, Note>;

  /** 所有資料夾 */
  folders: Map<string, Folder>;

  /** 所有標籤 */
  tags: Map<string, Tag>;

  /** 所有嵌入白板 */
  whiteboards: Map<string, EmbeddedWhiteboard>;

  /** 所有資產 */
  assets: Map<string, NoteAsset>;

  /** 當前開啟的筆記 ID */
  activeNoteId: string | null;

  /** 當前選中的資料夾 ID */
  selectedFolderId: string | null;

  /** 當前篩選的標籤 ID 列表 */
  filterTagIds: string[];

  /** 搜索關鍵字 */
  searchQuery: string;

  /** 排序方式 */
  sortOption: NoteSortOption;

  /** 編輯器視圖模式 */
  editorViewMode: EditorViewMode;

  /** 是否有未儲存的變更 */
  hasUnsavedChanges: boolean;

  /** 儲存狀態 */
  saveStatus: SaveStatus;

  /** 工作區路徑 */
  workspacePath: string | null;

  /** 是否正在載入 */
  isLoading: boolean;
}

// ============================================================================
// 右鍵選單與拖曳類型
// ============================================================================

/**
 * 右鍵選單項目
 */
export interface ContextMenuItem {
  /** 項目 ID */
  id: string;

  /** 顯示標籤 */
  label: string;

  /** 圖示名稱 */
  icon?: string;

  /** 快捷鍵提示 */
  shortcut?: string;

  /** 是否禁用 */
  disabled?: boolean;

  /** 是否為危險操作 */
  danger?: boolean;

  /** 點擊回調 */
  onClick: () => void;

  /** 分隔線（放在此項目之後） */
  separator?: boolean;
}

/**
 * 拖曳項目
 */
export interface DragItem {
  /** 項目 ID */
  id: string;

  /** 項目類型 */
  type: 'note' | 'folder';

  /** 顯示名稱 */
  name: string;
}

// ============================================================================
// 工作區類型
// ============================================================================

/**
 * 工作區索引
 * 用於快速載入工作區結構
 */
export interface WorkspaceIndex {
  /** 索引版本 */
  version: string;

  /** 所有資料夾 */
  folders: Folder[];

  /** 所有筆記摘要 */
  notes: NoteSummary[];

  /** 所有標籤 */
  tags: Tag[];

  /** 最後更新時間 */
  updatedAt: string;
}

/**
 * 筆記摘要（用於索引）
 */
export interface NoteSummary {
  /** 筆記 ID */
  id: string;

  /** 標題 */
  title: string;

  /** 所屬資料夾 ID */
  folderId: string;

  /** 標籤 ID 列表 */
  tagIds: string[];

  /** 相對路徑 */
  relativePath: string;

  /** 建立時間 */
  createdAt: string;

  /** 更新時間 */
  updatedAt: string;
}

// ============================================================================
// 檔案系統類型
// ============================================================================

/**
 * 檔案監聽事件
 */
export interface FileWatchEvent {
  /** 事件類型 */
  type: 'create' | 'update' | 'delete' | 'rename';

  /** 檔案路徑 */
  path: string;

  /** 舊路徑（僅 rename 事件） */
  oldPath?: string;
}

/**
 * 筆記檔案（解析後的 .md 檔案）
 */
export interface NoteFile {
  /** Markdown 內容 */
  content: string;

  /** Front Matter 數據 */
  frontMatter: NoteFrontMatter;
}

/**
 * 白板檔案（.json 格式）
 */
export interface WhiteboardFile {
  /** 白板 ID */
  id: string;

  /** 所屬筆記 ID */
  noteId: string;

  /** 顯示寬度 */
  displayWidth: number;

  /** 顯示高度 */
  displayHeight: number;

  /** 場景數據 */
  sceneData: ExcalidrawSceneData;

  /** 建立時間 */
  createdAt: string;

  /** 更新時間 */
  updatedAt: string;
}

// ============================================================================
// 常量
// ============================================================================

/**
 * 預設標籤顏色列表
 */
export const DEFAULT_TAG_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#ec4899', // Pink
] as const;

/**
 * 根資料夾 ID 常量
 */
export const ROOT_FOLDER_ID = 'root';

/**
 * 預設編輯器設定
 */
export const DEFAULT_EDITOR_SETTINGS = {
  viewMode: 'split' as EditorViewMode,
  autoSaveDelay: 3000,
  fontSize: 14,
  lineHeight: 1.6,
  tabSize: 2,
} as const;
