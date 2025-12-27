# Markdown 筆記管理模組技術規格

**文檔版本**: 1.0.0
**最後更新**: 2025-12-26
**狀態**: Draft
**對應規劃**: `docs/FEATURE_PLAN_MD_INTEGRATION.md` - 模組一

---

## 目錄

1. [模組概述](#1-模組概述)
2. [用戶故事](#2-用戶故事)
3. [功能需求](#3-功能需求)
4. [數據模型](#4-數據模型)
5. [API 設計](#5-api-設計)
6. [組件規格](#6-組件規格)
7. [UI/UX 規格](#7-uiux-規格)
8. [與白板整合](#8-與白板整合)
9. [文件存儲](#9-文件存儲)
10. [驗收標準](#10-驗收標準)

---

## 1. 模組概述

### 1.1 功能目標

Markdown 筆記管理模組旨在為 ShotBoard 提供 HackMD 風格的筆記編輯與管理能力，使用戶能夠：

- 使用 Markdown 語法撰寫與編輯筆記
- 透過資料夾與標籤系統組織筆記
- 在筆記中嵌入 Excalidraw 白板繪圖
- 將截圖與錄製內容直接插入筆記
- 快速搜索與檢索所有筆記內容

### 1.2 功能範圍

#### 包含 (In Scope)

| 範疇 | 說明 |
|------|------|
| Markdown 編輯器 | CodeMirror 6 為基礎的雙欄編輯器 |
| 即時預覽 | 編輯時同步渲染 Markdown |
| 檔案管理 | 資料夾樹狀結構、建立/重命名/刪除 |
| 標籤系統 | 新增/移除標籤、標籤篩選 |
| 全文搜索 | 標題與內容的模糊搜索 |
| 白板嵌入 | 在 Markdown 中嵌入 Excalidraw 繪圖區塊 |
| 媒體整合 | 插入截圖、圖片管理 |
| 本地存儲 | 以 `.md` 檔案存於本地檔案系統 |

#### 不包含 (Out of Scope)

| 範疇 | 說明 | 規劃階段 |
|------|------|----------|
| 簡報轉換 | Markdown 轉簡報功能 | Phase 3 |
| PDF/HTML 導出 | 導出為其他格式 | Phase 4 |
| 雲端同步 | 跨裝置同步 | Phase 5 |
| 協作編輯 | 多人即時編輯 | Phase 5 |

### 1.3 技術依賴

```json
{
  "@codemirror/lang-markdown": "^6.x",
  "@codemirror/state": "^6.x",
  "@codemirror/view": "^6.x",
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "remark-math": "^6.x",
  "rehype-katex": "^7.x",
  "rehype-prism-plus": "^2.x",
  "fuse.js": "^7.x",
  "gray-matter": "^4.x"
}
```

---

## 2. 用戶故事

### US-001: 建立新筆記

**作為** 一位內容創作者
**我想要** 快速建立一則新的 Markdown 筆記
**以便於** 立即開始記錄想法或內容

**驗收條件**:
- 點擊「新增筆記」按鈕或使用快捷鍵 `Ctrl+N` 可建立新筆記
- 新筆記自動命名為「未命名筆記」並帶有時間戳
- 游標自動聚焦於編輯區域
- 新筆記自動存入當前選中的資料夾

---

### US-002: 編輯 Markdown 內容

**作為** 一位筆記使用者
**我想要** 使用 Markdown 語法編輯筆記內容
**以便於** 快速格式化文字並專注於內容

**驗收條件**:
- 編輯器支援標準 Markdown 語法高亮
- 支援 GFM (GitHub Flavored Markdown) 擴展
- 支援數學公式 (KaTeX)
- 支援程式碼區塊語法高亮
- 編輯時右側即時預覽渲染結果

---

### US-003: 組織筆記資料夾

**作為** 一位有大量筆記的使用者
**我想要** 使用資料夾結構組織我的筆記
**以便於** 輕鬆找到特定主題的內容

**驗收條件**:
- 側邊欄顯示樹狀資料夾結構
- 可建立、重命名、刪除資料夾
- 可拖放筆記至不同資料夾
- 資料夾可展開/收合
- 支援巢狀資料夾（至少 3 層）

---

### US-004: 使用標籤分類

**作為** 一位需要交叉分類筆記的使用者
**我想要** 為筆記添加多個標籤
**以便於** 從不同維度檢索相關筆記

**驗收條件**:
- 可在筆記中添加多個標籤
- 標籤以彩色標籤形式顯示
- 側邊欄提供標籤篩選功能
- 點擊標籤可快速篩選相關筆記
- 支援建立新標籤與刪除未使用標籤

---

### US-005: 搜索筆記內容

**作為** 一位有大量筆記的使用者
**我想要** 快速搜索所有筆記的標題與內容
**以便於** 快速定位需要的資訊

**驗收條件**:
- 搜索框支援即時搜索（輸入即搜）
- 搜索範圍包含標題、內容、標籤
- 搜索結果高亮匹配文字
- 支援模糊搜索（容許拼寫誤差）
- 快捷鍵 `Ctrl+P` 開啟快速搜索

---

### US-006: 嵌入白板繪圖

**作為** 一位需要視覺化說明的使用者
**我想要** 在筆記中嵌入 Excalidraw 繪圖區塊
**以便於** 用圖解輔助文字說明

**驗收條件**:
- 可透過工具列或語法插入白板區塊
- 白板區塊在預覽中可互動檢視
- 點擊白板區塊可進入編輯模式
- 白板內容與筆記一同儲存
- 支援多個白板區塊於同一筆記

---

### US-007: 插入截圖

**作為** 一位製作教學內容的使用者
**我想要** 將螢幕截圖直接插入筆記
**以便於** 快速製作圖文並茂的教學文件

**驗收條件**:
- 工具列提供「插入截圖」按鈕
- 可從剪貼簿貼上圖片 (`Ctrl+V`)
- 可拖放圖片檔案至編輯器
- 圖片自動儲存至專案資產目錄
- 支援調整圖片尺寸

---

### US-008: 自動儲存

**作為** 一位專注於內容的使用者
**我想要** 筆記內容自動儲存
**以便於** 不必擔心遺失編輯內容

**驗收條件**:
- 編輯後 3 秒內自動儲存
- 狀態列顯示儲存狀態（已儲存/儲存中/未儲存）
- 支援手動儲存 (`Ctrl+S`)
- 網路斷線或應用關閉前觸發儲存
- 支援版本歷史（可選）

---

## 3. 功能需求

### 3.1 編輯器功能

| ID | 功能名稱 | 描述 | 優先級 |
|----|----------|------|--------|
| FR-001 | Markdown 語法高亮 | 編輯區域對 Markdown 語法進行顏色標記 | P0 |
| FR-002 | 即時預覽 | 右側面板即時渲染 Markdown 內容 | P0 |
| FR-003 | 同步滾動 | 編輯區與預覽區滾動位置同步 | P1 |
| FR-004 | 編輯工具列 | 提供常用格式化按鈕（標題、粗體、列表等） | P0 |
| FR-005 | GFM 支援 | 支援表格、任務列表、刪除線等擴展語法 | P0 |
| FR-006 | 數學公式 | 支援 LaTeX 數學公式渲染 (KaTeX) | P1 |
| FR-007 | 程式碼高亮 | 程式碼區塊支援語法高亮 | P0 |
| FR-008 | 自動補全 | Markdown 語法自動補全（如 `[]()`） | P2 |
| FR-009 | 折疊區塊 | 支援折疊長程式碼區塊或引用 | P2 |
| FR-010 | 字數統計 | 顯示當前筆記字數與閱讀時間 | P2 |

### 3.2 檔案管理功能

| ID | 功能名稱 | 描述 | 優先級 |
|----|----------|------|--------|
| FR-011 | 檔案樹顯示 | 側邊欄以樹狀結構顯示筆記與資料夾 | P0 |
| FR-012 | 建立筆記 | 在指定資料夾建立新筆記 | P0 |
| FR-013 | 建立資料夾 | 建立新資料夾用於組織筆記 | P0 |
| FR-014 | 重命名 | 重命名筆記或資料夾 | P0 |
| FR-015 | 刪除 | 刪除筆記或資料夾（移至回收站） | P0 |
| FR-016 | 移動 | 拖放筆記至不同資料夾 | P1 |
| FR-017 | 排序 | 依名稱/修改時間/建立時間排序 | P1 |
| FR-018 | 展開收合 | 資料夾可展開或收合 | P0 |
| FR-019 | 右鍵選單 | 右鍵點擊顯示操作選單 | P1 |
| FR-020 | 多選操作 | 支援 Ctrl/Shift 多選筆記進行批次操作 | P2 |

### 3.3 標籤系統

| ID | 功能名稱 | 描述 | 優先級 |
|----|----------|------|--------|
| FR-021 | 添加標籤 | 為筆記添加一個或多個標籤 | P0 |
| FR-022 | 移除標籤 | 從筆記移除標籤 | P0 |
| FR-023 | 標籤建議 | 輸入時自動建議已存在的標籤 | P1 |
| FR-024 | 標籤篩選 | 側邊欄依標籤篩選筆記列表 | P0 |
| FR-025 | 標籤管理 | 重命名或刪除全域標籤 | P2 |
| FR-026 | 標籤顏色 | 為標籤指定顏色以便區分 | P2 |

### 3.4 搜索功能

| ID | 功能名稱 | 描述 | 優先級 |
|----|----------|------|--------|
| FR-027 | 即時搜索 | 輸入關鍵字即時顯示匹配結果 | P0 |
| FR-028 | 全文搜索 | 搜索筆記標題與內容 | P0 |
| FR-029 | 模糊匹配 | 容許部分拼寫誤差 | P1 |
| FR-030 | 搜索高亮 | 結果中高亮顯示匹配文字 | P1 |
| FR-031 | 快速開啟 | Ctrl+P 開啟快速搜索面板 | P0 |
| FR-032 | 搜索歷史 | 記錄並顯示最近搜索 | P2 |

### 3.5 白板整合

| ID | 功能名稱 | 描述 | 優先級 |
|----|----------|------|--------|
| FR-033 | 插入白板 | 在 Markdown 中插入白板區塊 | P0 |
| FR-034 | 白板預覽 | 預覽區顯示白板縮圖 | P0 |
| FR-035 | 白板編輯 | 點擊白板區塊進入編輯模式 | P0 |
| FR-036 | 白板儲存 | 白板內容隨筆記一同儲存 | P0 |
| FR-037 | 白板導出 | 將白板導出為 PNG/SVG | P1 |

### 3.6 媒體管理

| ID | 功能名稱 | 描述 | 優先級 |
|----|----------|------|--------|
| FR-038 | 插入圖片 | 從檔案系統選擇圖片插入 | P0 |
| FR-039 | 貼上圖片 | 從剪貼簿貼上圖片 | P0 |
| FR-040 | 拖放圖片 | 拖放圖片檔案至編輯器 | P1 |
| FR-041 | 圖片管理 | 檢視與管理筆記中的圖片 | P2 |
| FR-042 | 圖片壓縮 | 自動壓縮大尺寸圖片 | P2 |

### 3.7 儲存功能

| ID | 功能名稱 | 描述 | 優先級 |
|----|----------|------|--------|
| FR-043 | 自動儲存 | 編輯後自動儲存至本地 | P0 |
| FR-044 | 手動儲存 | Ctrl+S 手動觸發儲存 | P0 |
| FR-045 | 儲存狀態 | 顯示當前儲存狀態 | P0 |
| FR-046 | 版本歷史 | 保留筆記的修改歷史 | P2 |
| FR-047 | 匯入匯出 | 匯入/匯出 `.md` 檔案 | P1 |

---

## 4. 數據模型

### 4.1 核心類型定義

```typescript
// src/types/note.ts

/**
 * 筆記文檔
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
}

/**
 * 筆記 Front Matter
 */
export interface NoteFrontMatter {
  /** 自訂元數據 */
  [key: string]: unknown;

  /** 作者 */
  author?: string;

  /** 描述 */
  description?: string;

  /** 封面圖片 */
  cover?: string;
}

/**
 * 資料夾
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
}

/**
 * 標籤
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
}

/**
 * 嵌入式白板
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
  appState: Partial<ExcalidrawAppState>;

  /** 檔案資產 */
  files: Record<string, BinaryFileData>;
}

/**
 * 圖片資產
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
}
```

### 4.2 輔助類型

```typescript
// src/types/note.ts (continued)

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
```

### 4.3 狀態類型

```typescript
// src/types/note.ts (continued)

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
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
}
```

---

## 5. API 設計

### 5.1 Zustand Store

```typescript
// src/stores/noteStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Note,
  Folder,
  Tag,
  EmbeddedWhiteboard,
  NoteAsset,
  NoteModuleState,
  NoteSortOption,
  EditorViewMode,
  SearchResult
} from '../types/note';

interface NoteStoreActions {
  // ===== 筆記操作 =====

  /**
   * 建立新筆記
   * @param folderId - 目標資料夾 ID
   * @param title - 筆記標題（可選）
   * @returns 新建立的筆記 ID
   */
  createNote: (folderId?: string, title?: string) => string;

  /**
   * 更新筆記內容
   * @param id - 筆記 ID
   * @param updates - 要更新的欄位
   */
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tagIds' | 'frontMatter'>>) => void;

  /**
   * 刪除筆記（軟刪除）
   * @param id - 筆記 ID
   */
  deleteNote: (id: string) => void;

  /**
   * 永久刪除筆記
   * @param id - 筆記 ID
   */
  permanentlyDeleteNote: (id: string) => void;

  /**
   * 復原已刪除筆記
   * @param id - 筆記 ID
   */
  restoreNote: (id: string) => void;

  /**
   * 移動筆記至其他資料夾
   * @param noteId - 筆記 ID
   * @param targetFolderId - 目標資料夾 ID
   */
  moveNote: (noteId: string, targetFolderId: string) => void;

  /**
   * 複製筆記
   * @param id - 原筆記 ID
   * @returns 新筆記 ID
   */
  duplicateNote: (id: string) => string;

  // ===== 資料夾操作 =====

  /**
   * 建立資料夾
   * @param name - 資料夾名稱
   * @param parentId - 父資料夾 ID（null 為根目錄）
   * @returns 新資料夾 ID
   */
  createFolder: (name: string, parentId?: string | null) => string;

  /**
   * 更新資料夾
   * @param id - 資料夾 ID
   * @param updates - 要更新的欄位
   */
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'name' | 'order'>>) => void;

  /**
   * 刪除資料夾（包含內部筆記）
   * @param id - 資料夾 ID
   */
  deleteFolder: (id: string) => void;

  /**
   * 移動資料夾
   * @param folderId - 資料夾 ID
   * @param targetParentId - 目標父資料夾 ID
   */
  moveFolder: (folderId: string, targetParentId: string | null) => void;

  /**
   * 切換資料夾展開狀態
   * @param id - 資料夾 ID
   */
  toggleFolderExpanded: (id: string) => void;

  // ===== 標籤操作 =====

  /**
   * 建立標籤
   * @param name - 標籤名稱
   * @param color - 標籤顏色
   * @returns 新標籤 ID
   */
  createTag: (name: string, color?: string) => string;

  /**
   * 更新標籤
   * @param id - 標籤 ID
   * @param updates - 要更新的欄位
   */
  updateTag: (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => void;

  /**
   * 刪除標籤
   * @param id - 標籤 ID
   */
  deleteTag: (id: string) => void;

  /**
   * 為筆記添加標籤
   * @param noteId - 筆記 ID
   * @param tagId - 標籤 ID
   */
  addTagToNote: (noteId: string, tagId: string) => void;

  /**
   * 從筆記移除標籤
   * @param noteId - 筆記 ID
   * @param tagId - 標籤 ID
   */
  removeTagFromNote: (noteId: string, tagId: string) => void;

  // ===== 白板操作 =====

  /**
   * 建立嵌入白板
   * @param noteId - 筆記 ID
   * @returns 新白板 ID
   */
  createWhiteboard: (noteId: string) => string;

  /**
   * 更新白板內容
   * @param id - 白板 ID
   * @param sceneData - Excalidraw 場景數據
   */
  updateWhiteboard: (id: string, sceneData: ExcalidrawSceneData) => void;

  /**
   * 刪除白板
   * @param id - 白板 ID
   */
  deleteWhiteboard: (id: string) => void;

  // ===== 資產操作 =====

  /**
   * 添加圖片資產
   * @param noteId - 筆記 ID
   * @param file - 圖片檔案
   * @returns 資產 ID
   */
  addAsset: (noteId: string, file: File) => Promise<string>;

  /**
   * 刪除資產
   * @param id - 資產 ID
   */
  deleteAsset: (id: string) => void;

  // ===== UI 狀態操作 =====

  /**
   * 設定當前筆記
   * @param id - 筆記 ID
   */
  setActiveNote: (id: string | null) => void;

  /**
   * 設定選中資料夾
   * @param id - 資料夾 ID
   */
  setSelectedFolder: (id: string | null) => void;

  /**
   * 設定篩選標籤
   * @param tagIds - 標籤 ID 列表
   */
  setFilterTags: (tagIds: string[]) => void;

  /**
   * 設定搜索關鍵字
   * @param query - 搜索字串
   */
  setSearchQuery: (query: string) => void;

  /**
   * 設定排序方式
   * @param option - 排序選項
   */
  setSortOption: (option: NoteSortOption) => void;

  /**
   * 設定編輯器視圖模式
   * @param mode - 視圖模式
   */
  setEditorViewMode: (mode: EditorViewMode) => void;

  // ===== 搜索 =====

  /**
   * 執行搜索
   * @param query - 搜索關鍵字
   * @returns 搜索結果
   */
  searchNotes: (query: string) => SearchResult[];

  // ===== 持久化 =====

  /**
   * 儲存當前筆記
   */
  saveCurrentNote: () => Promise<void>;

  /**
   * 儲存所有變更
   */
  saveAll: () => Promise<void>;

  /**
   * 載入工作區
   * @param workspacePath - 工作區路徑
   */
  loadWorkspace: (workspacePath: string) => Promise<void>;
}

type NoteStore = NoteModuleState & NoteStoreActions;

export const useNoteStore = create<NoteStore>()(
  subscribeWithSelector((set, get) => ({
    // ... 實作
  }))
);
```

### 5.2 React Hooks

```typescript
// src/hooks/useNote.ts

import { useMemo, useCallback } from 'react';
import { useNoteStore } from '../stores/noteStore';
import type { Note, SearchResult } from '../types/note';

/**
 * 取得當前活動筆記
 */
export function useActiveNote(): Note | null {
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
  const notes = useNoteStore((state) => state.notes);

  return useMemo(() => {
    if (!activeNoteId) return null;
    return notes.get(activeNoteId) ?? null;
  }, [activeNoteId, notes]);
}

/**
 * 取得資料夾內的筆記列表
 * @param folderId - 資料夾 ID
 */
export function useNotesInFolder(folderId: string): Note[] {
  const notes = useNoteStore((state) => state.notes);
  const sortOption = useNoteStore((state) => state.sortOption);

  return useMemo(() => {
    const folderNotes = Array.from(notes.values())
      .filter((note) => note.folderId === folderId && !note.isDeleted);

    return sortNotes(folderNotes, sortOption);
  }, [notes, folderId, sortOption]);
}

/**
 * 取得帶有指定標籤的筆記
 * @param tagId - 標籤 ID
 */
export function useNotesByTag(tagId: string): Note[] {
  const notes = useNoteStore((state) => state.notes);

  return useMemo(() => {
    return Array.from(notes.values())
      .filter((note) => note.tagIds.includes(tagId) && !note.isDeleted);
  }, [notes, tagId]);
}

/**
 * 搜索筆記
 */
export function useNoteSearch(): {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
} {
  const query = useNoteStore((state) => state.searchQuery);
  const setQuery = useNoteStore((state) => state.setSearchQuery);
  const searchNotes = useNoteStore((state) => state.searchNotes);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchNotes(query);
  }, [query, searchNotes]);

  return {
    query,
    setQuery,
    results,
    isSearching: query.length > 0,
  };
}

/**
 * 檔案樹 Hook
 */
export function useFileTree(): {
  tree: FileTreeNode[];
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
} {
  const folders = useNoteStore((state) => state.folders);
  const notes = useNoteStore((state) => state.notes);

  const tree = useMemo(() => {
    return buildFileTree(folders, notes);
  }, [folders, notes]);

  // ... 實作
}

/**
 * 編輯器狀態 Hook
 */
export function useEditor(): {
  viewMode: EditorViewMode;
  setViewMode: (mode: EditorViewMode) => void;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  save: () => Promise<void>;
} {
  const viewMode = useNoteStore((state) => state.editorViewMode);
  const setViewMode = useNoteStore((state) => state.setEditorViewMode);
  const saveStatus = useNoteStore((state) => state.saveStatus);
  const saveCurrentNote = useNoteStore((state) => state.saveCurrentNote);

  return {
    viewMode,
    setViewMode,
    saveStatus,
    save: saveCurrentNote,
  };
}
```

### 5.3 IPC API (Electron)

```typescript
// src/preload/noteApi.ts

export interface NoteFileAPI {
  /**
   * 讀取筆記檔案
   */
  readNote: (filePath: string) => Promise<{
    content: string;
    frontMatter: Record<string, unknown>;
  }>;

  /**
   * 寫入筆記檔案
   */
  writeNote: (filePath: string, content: string) => Promise<void>;

  /**
   * 讀取資料夾結構
   */
  readWorkspace: (workspacePath: string) => Promise<{
    folders: Folder[];
    notes: Note[];
  }>;

  /**
   * 建立資料夾
   */
  createFolder: (folderPath: string) => Promise<void>;

  /**
   * 刪除檔案或資料夾
   */
  deleteItem: (itemPath: string) => Promise<void>;

  /**
   * 移動檔案或資料夾
   */
  moveItem: (sourcePath: string, targetPath: string) => Promise<void>;

  /**
   * 複製圖片至資產目錄
   */
  copyAsset: (sourcePath: string, noteId: string) => Promise<string>;

  /**
   * 監聽檔案變更
   */
  watchWorkspace: (
    workspacePath: string,
    callback: (event: FileWatchEvent) => void
  ) => () => void;
}

// electron/main/noteHandlers.ts
// 主程序處理器實作
```

---

## 6. 組件規格

### 6.1 組件總覽

```
src/components/NoteManager/
├── NoteManagerLayout.tsx      # 主佈局容器
├── NoteSidebar/
│   ├── index.tsx              # 側邊欄主組件
│   ├── FileTree.tsx           # 檔案樹
│   ├── FileTreeItem.tsx       # 檔案樹節點
│   ├── TagFilter.tsx          # 標籤篩選
│   └── SearchPanel.tsx        # 搜索面板
├── Editor/
│   ├── index.tsx              # 編輯器主組件
│   ├── MarkdownEditor.tsx     # CodeMirror 編輯器
│   ├── MarkdownPreview.tsx    # Markdown 預覽
│   ├── EditorToolbar.tsx      # 編輯工具列
│   ├── EditorStatusBar.tsx    # 狀態列
│   └── WhiteboardBlock.tsx    # 白板區塊
└── Dialogs/
    ├── CreateNoteDialog.tsx   # 建立筆記對話框
    ├── CreateFolderDialog.tsx # 建立資料夾對話框
    ├── TagManagerDialog.tsx   # 標籤管理對話框
    └── DeleteConfirmDialog.tsx# 刪除確認對話框
```

### 6.2 NoteManagerLayout

**用途**: 筆記管理模組的根佈局組件

```typescript
// src/components/NoteManager/NoteManagerLayout.tsx

interface NoteManagerLayoutProps {
  /** 側邊欄預設寬度 */
  defaultSidebarWidth?: number;

  /** 側邊欄最小寬度 */
  minSidebarWidth?: number;

  /** 側邊欄最大寬度 */
  maxSidebarWidth?: number;
}

/**
 * 狀態:
 * - sidebarWidth: number - 側邊欄當前寬度
 * - isSidebarCollapsed: boolean - 側邊欄是否收合
 * - isResizing: boolean - 是否正在調整大小
 */

/**
 * 行為:
 * - 支援拖曳調整側邊欄寬度
 * - 雙擊分隔線重設為預設寬度
 * - 快捷鍵 Ctrl+B 切換側邊欄顯示
 */
```

**渲染結構**:
```
┌─────────────────────────────────────────────┐
│                  Header                      │
├──────────────┬──────────────────────────────┤
│              │                              │
│   Sidebar    │         Editor               │
│   (可調整)    │    (MarkdownEditor +         │
│              │     MarkdownPreview)          │
│              │                              │
├──────────────┴──────────────────────────────┤
│                StatusBar                     │
└─────────────────────────────────────────────┘
```

### 6.3 NoteSidebar

**用途**: 側邊欄，包含檔案樹、標籤篩選、搜索

```typescript
// src/components/NoteManager/NoteSidebar/index.tsx

interface NoteSidebarProps {
  /** 寬度 */
  width: number;

  /** 是否收合 */
  isCollapsed: boolean;

  /** 收合切換回調 */
  onCollapsedChange: (collapsed: boolean) => void;
}

/**
 * 狀態:
 * - activeTab: 'files' | 'tags' | 'search' - 當前標籤頁
 */

/**
 * 行為:
 * - 標籤頁切換（檔案/標籤/搜索）
 * - 提供新增筆記、新增資料夾按鈕
 */
```

### 6.4 FileTree

**用途**: 樹狀檔案瀏覽器

```typescript
// src/components/NoteManager/NoteSidebar/FileTree.tsx

interface FileTreeProps {
  /** 選中的節點 ID */
  selectedId: string | null;

  /** 選擇回調 */
  onSelect: (id: string, type: 'folder' | 'note') => void;

  /** 右鍵選單回調 */
  onContextMenu: (event: React.MouseEvent, node: FileTreeNode) => void;
}

/**
 * 狀態:
 * - dragOverId: string | null - 拖放懸停的節點
 * - renamingId: string | null - 正在重命名的節點
 */

/**
 * 行為:
 * - 單擊選中節點
 * - 雙擊開啟筆記或展開資料夾
 * - 拖放移動筆記/資料夾
 * - 右鍵開啟上下文選單
 * - F2 開始重命名
 */
```

### 6.5 MarkdownEditor

**用途**: CodeMirror 6 Markdown 編輯器

```typescript
// src/components/NoteManager/Editor/MarkdownEditor.tsx

interface MarkdownEditorProps {
  /** Markdown 內容 */
  value: string;

  /** 內容變更回調 */
  onChange: (value: string) => void;

  /** 是否唯讀 */
  readOnly?: boolean;

  /** 自動聚焦 */
  autoFocus?: boolean;

  /** 游標位置變更回調 */
  onCursorChange?: (position: { line: number; column: number }) => void;

  /** 滾動位置變更回調（用於同步滾動） */
  onScroll?: (scrollInfo: { top: number; height: number }) => void;
}

/**
 * 狀態:
 * - editorView: EditorView | null - CodeMirror 實例
 */

/**
 * 行為:
 * - Markdown 語法高亮
 * - 行號顯示
 * - 搜索/替換 (Ctrl+F / Ctrl+H)
 * - 撤銷/重做 (Ctrl+Z / Ctrl+Y)
 * - 自動括號配對
 * - 縮進指南
 */
```

### 6.6 MarkdownPreview

**用途**: Markdown 即時預覽

```typescript
// src/components/NoteManager/Editor/MarkdownPreview.tsx

interface MarkdownPreviewProps {
  /** Markdown 內容 */
  content: string;

  /** 滾動位置（用於同步滾動） */
  scrollPosition?: number;

  /** 白板區塊點擊回調 */
  onWhiteboardClick?: (whiteboardId: string) => void;
}

/**
 * 行為:
 * - 渲染 Markdown 為 HTML
 * - 支援 GFM 表格、任務列表
 * - 數學公式渲染 (KaTeX)
 * - 程式碼語法高亮 (Prism)
 * - 白板區塊渲染為可互動預覽
 * - 圖片懶加載
 */
```

### 6.7 EditorToolbar

**用途**: 編輯器工具列

```typescript
// src/components/NoteManager/Editor/EditorToolbar.tsx

interface EditorToolbarProps {
  /** 編輯器參考（用於插入文字） */
  editorRef: React.RefObject<EditorView>;

  /** 當前視圖模式 */
  viewMode: EditorViewMode;

  /** 視圖模式變更回調 */
  onViewModeChange: (mode: EditorViewMode) => void;
}

/**
 * 工具按鈕:
 * - 標題 (H1-H6)
 * - 粗體 (Ctrl+B)
 * - 斜體 (Ctrl+I)
 * - 刪除線
 * - 程式碼
 * - 引用
 * - 無序列表
 * - 有序列表
 * - 任務列表
 * - 連結 (Ctrl+K)
 * - 圖片
 * - 表格
 * - 分隔線
 * - 白板區塊
 * - 視圖切換（分割/僅編輯/僅預覽）
 */
```

### 6.8 WhiteboardBlock

**用途**: Markdown 中嵌入的白板區塊

```typescript
// src/components/NoteManager/Editor/WhiteboardBlock.tsx

interface WhiteboardBlockProps {
  /** 白板 ID */
  whiteboardId: string;

  /** 顯示寬度 */
  width: number;

  /** 顯示高度 */
  height: number;

  /** 是否處於編輯模式 */
  isEditing: boolean;

  /** 編輯模式切換回調 */
  onEditingChange: (isEditing: boolean) => void;

  /** 場景數據變更回調 */
  onSceneChange: (sceneData: ExcalidrawSceneData) => void;
}

/**
 * 狀態:
 * - isHovered: boolean - 滑鼠懸停狀態
 */

/**
 * 行為:
 * - 預覽模式：顯示靜態縮圖
 * - 編輯模式：顯示完整 Excalidraw 編輯器
 * - 點擊進入編輯模式
 * - 點擊外部退出編輯模式
 * - 拖曳調整區塊大小
 */
```

### 6.9 SearchPanel

**用途**: 快速搜索面板

```typescript
// src/components/NoteManager/NoteSidebar/SearchPanel.tsx

interface SearchPanelProps {
  /** 是否作為全屏模態顯示 */
  isModal?: boolean;

  /** 關閉回調（模態模式） */
  onClose?: () => void;
}

/**
 * 狀態:
 * - query: string - 搜索關鍵字
 * - results: SearchResult[] - 搜索結果
 * - selectedIndex: number - 選中的結果索引
 */

/**
 * 行為:
 * - 即時搜索（debounce 300ms）
 * - 鍵盤導航（上/下箭頭）
 * - Enter 開啟選中筆記
 * - Escape 關閉面板
 * - 高亮匹配文字
 */
```

---

## 7. UI/UX 規格

### 7.1 佈局規格

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo] ShotBoard    │ 搜索 (Ctrl+P)  │  [設定] [最大化] [X] │
├────────────┬─────────┴────────────────┴──────────────────────┤
│            │ [工具列: B I S | H1 H2 | - 1. ☐ | 🔗 📷 📊 ✏️ ] │
│  側邊欄     ├─────────────────────────────────────────────────┤
│  (250px)   │                                                 │
│            │   ┌──────────────┬──────────────────┐          │
│ ┌────────┐ │   │              │                  │          │
│ │ 檔案   │ │   │   Markdown   │     Preview      │          │
│ │ 標籤   │ │   │    Editor    │                  │          │
│ │ 搜索   │ │   │   (50%)      │     (50%)        │          │
│ └────────┘ │   │              │                  │          │
│            │   └──────────────┴──────────────────┘          │
│ 📁 筆記    │                                                 │
│  ├─📁 工作 ├─────────────────────────────────────────────────┤
│  │  └─📄  ││ 字數: 1,234 | 行 15, 列 8 | Saved ✓ | Markdown │
│  └─📁 個人 └─────────────────────────────────────────────────┘
└────────────┘
```

### 7.2 顏色規格

```css
:root {
  /* 主題色 */
  --primary: #6366f1;         /* Indigo 500 */
  --primary-hover: #4f46e5;   /* Indigo 600 */

  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;    /* Gray 50 */
  --bg-tertiary: #f3f4f6;     /* Gray 100 */

  /* 文字色 */
  --text-primary: #111827;    /* Gray 900 */
  --text-secondary: #6b7280;  /* Gray 500 */
  --text-muted: #9ca3af;      /* Gray 400 */

  /* 邊框 */
  --border: #e5e7eb;          /* Gray 200 */
  --border-focus: #6366f1;

  /* 狀態色 */
  --success: #10b981;         /* Emerald 500 */
  --warning: #f59e0b;         /* Amber 500 */
  --error: #ef4444;           /* Red 500 */

  /* 標籤預設色 */
  --tag-colors: [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16',
    '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'
  ];
}

/* 深色模式 */
[data-theme="dark"] {
  --bg-primary: #1f2937;      /* Gray 800 */
  --bg-secondary: #111827;    /* Gray 900 */
  --bg-tertiary: #374151;     /* Gray 700 */
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border: #374151;
}
```

### 7.3 字體規格

```css
:root {
  /* 編輯器字體 */
  --font-editor: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  --font-editor-size: 14px;
  --font-editor-line-height: 1.6;

  /* 預覽字體 */
  --font-preview: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-preview-size: 16px;
  --font-preview-line-height: 1.75;

  /* 程式碼字體 */
  --font-code: 'JetBrains Mono', monospace;
  --font-code-size: 13px;
}
```

### 7.4 快捷鍵規格

| 快捷鍵 | 功能 | 範圍 |
|--------|------|------|
| `Ctrl+N` | 新增筆記 | 全域 |
| `Ctrl+S` | 儲存筆記 | 編輯器 |
| `Ctrl+P` | 快速搜索 | 全域 |
| `Ctrl+B` | 切換側邊欄 / 粗體 | 全域 / 編輯器 |
| `Ctrl+I` | 斜體 | 編輯器 |
| `Ctrl+K` | 插入連結 | 編輯器 |
| `Ctrl+Shift+K` | 插入程式碼區塊 | 編輯器 |
| `Ctrl+Z` | 撤銷 | 編輯器 |
| `Ctrl+Y` | 重做 | 編輯器 |
| `Ctrl+F` | 搜索 | 編輯器 |
| `Ctrl+H` | 替換 | 編輯器 |
| `F2` | 重命名 | 檔案樹 |
| `Delete` | 刪除 | 檔案樹 |
| `Escape` | 關閉對話框/面板 | 全域 |
| `Ctrl+1` | 僅編輯模式 | 編輯器 |
| `Ctrl+2` | 分割模式 | 編輯器 |
| `Ctrl+3` | 僅預覽模式 | 編輯器 |

### 7.5 動畫規格

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}

/* 側邊欄展開/收合 */
.sidebar-collapse {
  transition: width var(--transition-normal);
}

/* 檔案樹節點展開 */
.tree-expand {
  transition: height var(--transition-fast);
}

/* 搜索結果淡入 */
.search-result-enter {
  animation: fadeIn var(--transition-fast);
}

/* 儲存狀態指示器 */
.save-indicator {
  transition: opacity var(--transition-fast), color var(--transition-fast);
}
```

### 7.6 響應式規格

| 斷點 | 寬度 | 佈局變化 |
|------|------|----------|
| Desktop | >= 1024px | 完整三欄佈局 |
| Tablet | 768px - 1023px | 側邊欄可收合，預設收合 |
| Mobile | < 768px | 單欄佈局，底部導航 |

---

## 8. 與白板整合

### 8.1 嵌入語法

Markdown 中使用自訂指令嵌入白板：

```markdown
# 我的筆記

這裡有一張流程圖：

::whiteboard{id="wb_123456" width="800" height="400"}

繼續其他內容...
```

### 8.2 解析流程

```typescript
// src/utils/markdown/plugins/remarkWhiteboard.ts

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

interface WhiteboardDirective {
  type: 'leafDirective';
  name: 'whiteboard';
  attributes: {
    id: string;
    width?: string;
    height?: string;
  };
}

export const remarkWhiteboard: Plugin = () => {
  return (tree) => {
    visit(tree, 'leafDirective', (node: WhiteboardDirective) => {
      if (node.name !== 'whiteboard') return;

      // 轉換為自訂 hast 節點
      const data = node.data || (node.data = {});
      data.hName = 'whiteboard-block';
      data.hProperties = {
        whiteboardId: node.attributes.id,
        width: node.attributes.width || '100%',
        height: node.attributes.height || '400',
      };
    });
  };
};
```

### 8.3 React 組件映射

```typescript
// src/components/NoteManager/Editor/MarkdownPreview.tsx

import ReactMarkdown from 'react-markdown';
import { WhiteboardBlock } from './WhiteboardBlock';

const components = {
  'whiteboard-block': ({ whiteboardId, width, height }) => (
    <WhiteboardBlock
      whiteboardId={whiteboardId}
      width={parseInt(width)}
      height={parseInt(height)}
      isEditing={false}
      onEditingChange={() => {}}
      onSceneChange={() => {}}
    />
  ),
};

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkDirective, remarkWhiteboard]}
      rehypePlugins={[rehypeKatex, rehypePrism]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### 8.4 白板數據存儲

白板數據以獨立 JSON 檔案存儲：

```
.shotboard/
├── notes/
│   └── note_abc123.md
└── whiteboards/
    └── wb_123456.json    # Excalidraw 場景數據
```

### 8.5 與現有白板模組整合

```typescript
// 利用現有的 useWhiteboard hook
import { useWhiteboard } from '../Whiteboard/useWhiteboard';

function WhiteboardBlockEditor({ whiteboardId, onSave }) {
  const {
    excalidrawAPI,
    handleChange,
    // ... 現有邏輯
  } = useWhiteboard();

  // 載入指定白板數據
  useEffect(() => {
    loadWhiteboardData(whiteboardId).then((data) => {
      excalidrawAPI?.updateScene(data);
    });
  }, [whiteboardId]);

  // 儲存變更
  const handleSaveAndClose = async () => {
    const sceneData = excalidrawAPI?.getSceneElements();
    await onSave(sceneData);
  };

  return (
    <Excalidraw
      ref={excalidrawAPI}
      onChange={handleChange}
      // ...
    />
  );
}
```

---

## 9. 文件存儲

### 9.1 目錄結構

```
[工作區目錄]/
├── .shotboard/                    # 應用程式數據目錄（隱藏）
│   ├── config.json                # 工作區配置
│   ├── index.json                 # 筆記索引（快速載入用）
│   ├── whiteboards/               # 白板數據
│   │   ├── wb_001.json
│   │   └── wb_002.json
│   ├── assets/                    # 圖片等資產
│   │   ├── img_001.png
│   │   └── img_002.jpg
│   └── trash/                     # 回收站
│       └── note_deleted.md
│
├── notes/                         # 筆記目錄（使用者可見）
│   ├── folder-a/
│   │   ├── note-1.md
│   │   └── note-2.md
│   └── folder-b/
│       └── note-3.md
└── README.md                      # 工作區說明（可選）
```

### 9.2 檔案格式

**筆記檔案 (.md)**:

```markdown
---
id: note_abc123
title: 我的筆記標題
tags:
  - tag_001
  - tag_002
embeddedWhiteboards:
  - wb_123456
createdAt: 2025-01-15T10:30:00Z
updatedAt: 2025-01-15T14:20:00Z
---

# 我的筆記標題

這是筆記內容...

::whiteboard{id="wb_123456" width="800" height="400"}

更多內容...
```

**索引檔案 (index.json)**:

```json
{
  "version": "1.0.0",
  "folders": [
    {
      "id": "folder_001",
      "name": "工作筆記",
      "parentId": null,
      "order": 0,
      "isExpanded": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "notes": [
    {
      "id": "note_abc123",
      "title": "我的筆記",
      "folderId": "folder_001",
      "tagIds": ["tag_001"],
      "relativePath": "folder-a/note-1.md",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T14:20:00Z"
    }
  ],
  "tags": [
    {
      "id": "tag_001",
      "name": "重要",
      "color": "#ef4444",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**白板檔案 (.json)**:

```json
{
  "id": "wb_123456",
  "noteId": "note_abc123",
  "displayWidth": 800,
  "displayHeight": 400,
  "sceneData": {
    "elements": [...],
    "appState": {...},
    "files": {...}
  },
  "createdAt": "2025-01-15T11:00:00Z",
  "updatedAt": "2025-01-15T12:30:00Z"
}
```

### 9.3 檔案系統 API

```typescript
// src/services/fileSystem.ts

export interface FileSystemService {
  /**
   * 初始化工作區
   */
  initWorkspace(path: string): Promise<void>;

  /**
   * 載入工作區索引
   */
  loadIndex(path: string): Promise<WorkspaceIndex>;

  /**
   * 儲存工作區索引
   */
  saveIndex(path: string, index: WorkspaceIndex): Promise<void>;

  /**
   * 讀取筆記檔案
   */
  readNote(path: string): Promise<NoteFile>;

  /**
   * 寫入筆記檔案
   */
  writeNote(path: string, note: NoteFile): Promise<void>;

  /**
   * 讀取白板數據
   */
  readWhiteboard(id: string): Promise<WhiteboardFile>;

  /**
   * 寫入白板數據
   */
  writeWhiteboard(id: string, data: WhiteboardFile): Promise<void>;

  /**
   * 複製資產檔案
   */
  copyAsset(sourcePath: string): Promise<string>;

  /**
   * 刪除至回收站
   */
  moveToTrash(path: string): Promise<void>;

  /**
   * 永久刪除
   */
  permanentDelete(path: string): Promise<void>;

  /**
   * 監聽檔案變更
   */
  watch(path: string, callback: FileWatchCallback): () => void;
}
```

### 9.4 自動儲存策略

```typescript
// src/hooks/useAutoSave.ts

interface AutoSaveConfig {
  /** 延遲時間（毫秒） */
  debounceMs: number;

  /** 最大延遲（毫秒） */
  maxWaitMs: number;

  /** 是否在失焦時儲存 */
  saveOnBlur: boolean;

  /** 是否在視窗關閉前儲存 */
  saveBeforeUnload: boolean;
}

export function useAutoSave(
  content: string,
  onSave: (content: string) => Promise<void>,
  config: AutoSaveConfig = {
    debounceMs: 3000,
    maxWaitMs: 10000,
    saveOnBlur: true,
    saveBeforeUnload: true,
  }
) {
  // debounced save with max wait
  // blur handler
  // beforeunload handler
}
```

---

## 10. 驗收標準

### 10.1 功能驗收標準

#### AC-001: 筆記建立與編輯

| ID | 測試條件 | 預期結果 |
|----|----------|----------|
| AC-001-01 | 點擊「新增筆記」按鈕 | 建立新筆記，自動命名，游標聚焦於編輯器 |
| AC-001-02 | 輸入 Markdown 文字 | 語法高亮正確顯示 |
| AC-001-03 | 等待 3 秒 | 自動儲存觸發，狀態顯示「已儲存」 |
| AC-001-04 | 按下 Ctrl+S | 立即儲存 |
| AC-001-05 | 在編輯器輸入時觀察預覽 | 預覽即時更新（< 100ms 延遲） |

#### AC-002: 資料夾管理

| ID | 測試條件 | 預期結果 |
|----|----------|----------|
| AC-002-01 | 右鍵點擊側邊欄空白處，選擇「新增資料夾」 | 顯示輸入框，可輸入名稱 |
| AC-002-02 | 拖曳筆記至其他資料夾 | 筆記移動，檔案樹更新 |
| AC-002-03 | 雙擊資料夾名稱 | 進入重命名模式 |
| AC-002-04 | 刪除含有筆記的資料夾 | 顯示確認對話框，列出受影響筆記數量 |
| AC-002-05 | 點擊資料夾展開圖示 | 資料夾展開/收合，動畫流暢 |

#### AC-003: 標籤系統

| ID | 測試條件 | 預期結果 |
|----|----------|----------|
| AC-003-01 | 在筆記編輯器點擊「添加標籤」 | 顯示標籤輸入框與建議列表 |
| AC-003-02 | 輸入新標籤名稱並按 Enter | 建立新標籤並添加至筆記 |
| AC-003-03 | 點擊標籤上的 X | 從筆記移除該標籤 |
| AC-003-04 | 在側邊欄點擊標籤 | 筆記列表篩選為含有該標籤的筆記 |
| AC-003-05 | 選擇多個標籤 | 顯示同時含有所有選中標籤的筆記 |

#### AC-004: 搜索功能

| ID | 測試條件 | 預期結果 |
|----|----------|----------|
| AC-004-01 | 按下 Ctrl+P | 開啟快速搜索面板 |
| AC-004-02 | 輸入關鍵字 | 即時顯示匹配結果（< 100ms） |
| AC-004-03 | 搜索結果中顯示匹配文字 | 匹配部分高亮顯示 |
| AC-004-04 | 使用上/下箭頭 | 可在結果中導航 |
| AC-004-05 | 按下 Enter | 開啟選中的筆記 |
| AC-004-06 | 輸入含有錯字的關鍵字 | 模糊匹配仍能找到正確結果 |

#### AC-005: 白板整合

| ID | 測試條件 | 預期結果 |
|----|----------|----------|
| AC-005-01 | 在編輯器工具列點擊「插入白板」 | 插入白板語法指令 |
| AC-005-02 | 預覽區顯示白板區塊 | 顯示白板縮圖 |
| AC-005-03 | 點擊預覽中的白板 | 進入白板編輯模式 |
| AC-005-04 | 在白板中繪製圖形 | 圖形正確顯示 |
| AC-005-05 | 點擊白板外部 | 退出編輯模式，更新縮圖 |
| AC-005-06 | 儲存筆記 | 白板數據一同儲存 |

#### AC-006: 圖片管理

| ID | 測試條件 | 預期結果 |
|----|----------|----------|
| AC-006-01 | 從檔案系統拖曳圖片至編輯器 | 圖片插入，語法正確 |
| AC-006-02 | 按 Ctrl+V 貼上剪貼簿圖片 | 圖片插入，自動儲存至資產目錄 |
| AC-006-03 | 點擊工具列「插入圖片」 | 開啟檔案選擇對話框 |
| AC-006-04 | 預覽中顯示圖片 | 圖片正確渲染，可調整大小 |
| AC-006-05 | 插入大尺寸圖片（> 2MB） | 圖片自動壓縮 |

### 10.2 性能驗收標準

| 指標 | 目標值 | 測試方法 |
|------|--------|----------|
| 筆記載入時間 | < 200ms | 載入 10KB 筆記 |
| 預覽更新延遲 | < 100ms | 輸入後預覽更新時間 |
| 搜索回應時間 | < 100ms | 1000 筆筆記中搜索 |
| 自動儲存 | 3 秒內 | 編輯後觸發儲存 |
| 記憶體使用 | < 200MB | 開啟 50 筆筆記 |
| 初始載入 | < 2 秒 | 冷啟動工作區 |

### 10.3 兼容性驗收標準

| 環境 | 最低要求 |
|------|----------|
| Windows | Windows 10 (64-bit) |
| macOS | macOS 11.0+ |
| Linux | Ubuntu 20.04+ |
| Electron | 28.0.0+ |
| Node.js | 18.0.0+ |
| 瀏覽器 (Web) | Chrome 100+, Firefox 100+, Safari 15+ |

### 10.4 無障礙驗收標準

| 項目 | 要求 |
|------|------|
| 鍵盤導航 | 所有功能可純鍵盤操作 |
| 螢幕閱讀器 | 支援 NVDA, VoiceOver |
| 對比度 | WCAG 2.1 AA 標準 |
| 焦點指示 | 明確的焦點外框 |
| 標籤 | 所有互動元素有適當 aria-label |

---

## 附錄

### A. 相關文檔

- [功能規劃總覽](../FEATURE_PLAN_MD_INTEGRATION.md)
- [Slidev 簡報模組規格](./02-SLIDE-SYSTEM-SPEC.md) (待撰寫)
- [導出模組規格](./03-EXPORT-SYSTEM-SPEC.md) (待撰寫)

### B. 參考資源

- [CodeMirror 6 文檔](https://codemirror.net/6/)
- [react-markdown](https://github.com/remarkjs/react-markdown)
- [Excalidraw API](https://docs.excalidraw.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Fuse.js](https://fusejs.io/)

### C. 修訂歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 1.0.0 | 2025-12-26 | 初始版本 | AI Assistant |

---

*本文檔為技術規格草案，實作過程中可能根據需求調整。*
