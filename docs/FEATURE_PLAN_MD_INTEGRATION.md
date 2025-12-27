# ShotBoard Markdown 整合功能規劃

## 願景

將 ShotBoard 從單純的「屏幕錄製 + 白板標記」工具，進化為一個整合的 **視覺化筆記與內容創作平台**，結合：

1. **HackMD 風格** - 協作式 Markdown 筆記管理
2. **Slidev 風格** - Markdown 轉簡報
3. **GitSite 風格** - Markdown 轉靜態網頁/PDF

---

## 功能模組規劃

### 模組一：Markdown 筆記管理 (HackMD-like)

#### 核心功能

| 功能 | 描述 |
|------|------|
| 雙欄編輯器 | 左側 Markdown 編輯，右側即時預覽 |
| 文件樹管理 | 側邊欄顯示筆記資料夾結構 |
| 標籤系統 | 為筆記添加標籤，快速分類檢索 |
| 全文搜索 | 快速搜索所有筆記內容 |
| 白板嵌入 | 可在 Markdown 中嵌入 Excalidraw 繪圖 |
| 截圖/錄製整合 | 一鍵將截圖或錄製幀插入筆記 |

#### 數據結構

```typescript
interface MarkdownNote {
  id: string;
  title: string;
  content: string;           // Markdown 內容
  tags: string[];
  folder: string;            // 資料夾路徑
  embeddedWhiteboards: string[];  // 嵌入的白板 ID
  createdAt: Date;
  updatedAt: Date;
}

interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];        // 子資料夾/筆記 ID
}
```

#### 技術選型

| 技術 | 用途 |
|------|------|
| **CodeMirror 6** | Markdown 編輯器核心 |
| **remark / unified** | Markdown 解析與轉換 |
| **react-markdown** | Markdown 渲染 |
| **Fuse.js** | 全文模糊搜索 |

---

### 模組二：Slidev 簡報系統

#### 核心功能

| 功能 | 描述 |
|------|------|
| Markdown 轉簡報 | 使用 `---` 分隔頁面，直接轉換為簡報 |
| 主題系統 | 內建多種簡報主題 |
| 動畫效果 | 支援入場動畫與轉場效果 |
| 白板標記模式 | 簡報時可直接在投影片上標記 |
| 演講者視圖 | 雙螢幕模式：觀眾/演講者分開 |
| 錄製整合 | 邊播簡報邊錄製講解影片 |

#### Markdown 簡報語法

```markdown
---
theme: dark
title: 我的簡報
---

# 第一頁標題

這是第一張投影片

---

# 第二頁

- 重點一
- 重點二

<!-- 可嵌入白板 -->
::whiteboard{id="abc123"}

---
layout: image-right
image: ./screenshot.png
---

# 圖文並排

左側文字，右側圖片
```

#### 技術選型

| 技術 | 用途 |
|------|------|
| **reveal.js** 或 **impress.js** | 簡報引擎基礎 |
| **Front Matter** 解析 | 簡報 metadata 處理 |
| **Framer Motion** | 動畫效果 |
| **Custom Excalidraw 整合** | 白板標記模式 |

---

### 模組三：靜態網頁/PDF 生成 (GitSite-like)

#### 核心功能

| 功能 | 描述 |
|------|------|
| 單頁導出 | 單一 Markdown 導出為 HTML/PDF |
| 多頁網站 | 資料夾結構導出為靜態網站 |
| 主題模板 | 多種網站/PDF 模板 |
| 自動目錄 | 根據標題層級生成 TOC |
| 程式碼高亮 | 支援多語言語法高亮 |
| 資產打包 | 自動處理圖片/白板等嵌入資源 |

#### 導出流程

```
Markdown Notes
     ↓
  解析 + 處理嵌入資源
     ↓
  ┌─────────────┬─────────────┐
  ↓             ↓             ↓
 HTML        PDF          簡報HTML
(靜態網站)  (列印/分享)   (可獨立播放)
```

#### 技術選型

| 技術 | 用途 |
|------|------|
| **unified / rehype** | Markdown → HTML 轉換 |
| **Puppeteer** (Electron 內建) | HTML → PDF 渲染 |
| **Prism.js** | 程式碼語法高亮 |
| **Handlebars / EJS** | HTML 模板引擎 |

---

## 架構設計

### 新增目錄結構

```
src/
├── components/
│   ├── Editor/                    # Markdown 編輯器
│   │   ├── MarkdownEditor.tsx     # CodeMirror 編輯器
│   │   ├── MarkdownPreview.tsx    # 即時預覽
│   │   └── EditorToolbar.tsx      # 編輯工具列
│   │
│   ├── NoteManager/               # 筆記管理
│   │   ├── NoteSidebar.tsx        # 側邊欄檔案樹
│   │   ├── NoteCard.tsx           # 筆記卡片
│   │   ├── TagFilter.tsx          # 標籤篩選
│   │   └── SearchBar.tsx          # 全文搜索
│   │
│   ├── Slides/                    # 簡報系統
│   │   ├── SlidePlayer.tsx        # 簡報播放器
│   │   ├── SlideEditor.tsx        # 簡報編輯
│   │   ├── PresenterView.tsx      # 演講者視圖
│   │   └── SlideThemes/           # 主題樣式
│   │
│   └── Export/                    # 導出功能
│       ├── ExportDialog.tsx       # 導出設定對話框
│       ├── HTMLExporter.tsx       # HTML 導出
│       ├── PDFExporter.tsx        # PDF 導出
│       └── templates/             # 導出模板
│
├── stores/
│   ├── noteStore.ts               # 筆記狀態管理
│   ├── slideStore.ts              # 簡報狀態管理
│   └── exportStore.ts             # 導出設定
│
├── utils/
│   ├── markdown/
│   │   ├── parser.ts              # Markdown 解析
│   │   ├── slideParser.ts         # 簡報語法解析
│   │   └── plugins/               # remark/rehype 插件
│   │
│   └── export/
│       ├── htmlGenerator.ts       # HTML 生成
│       └── pdfGenerator.ts        # PDF 生成
│
└── types/
    ├── note.ts                    # 筆記類型定義
    ├── slide.ts                   # 簡報類型定義
    └── export.ts                  # 導出配置類型
```

### 狀態管理擴展

```typescript
// stores/noteStore.ts
interface NoteStore {
  notes: Map<string, MarkdownNote>;
  folders: Map<string, NoteFolder>;
  activeNoteId: string | null;

  // Actions
  createNote: (folder?: string) => string;
  updateNote: (id: string, content: Partial<MarkdownNote>) => void;
  deleteNote: (id: string) => void;
  moveNote: (id: string, targetFolder: string) => void;
  searchNotes: (query: string) => MarkdownNote[];
}

// stores/slideStore.ts
interface SlideStore {
  slides: Slide[];
  currentSlideIndex: number;
  isPresenting: boolean;
  theme: SlideTheme;

  // Actions
  parseFromMarkdown: (content: string) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  startPresentation: () => void;
  stopPresentation: () => void;
}
```

---

## 用戶工作流程

### 流程一：錄製教學 → 筆記 → 簡報

```
1. 使用 ShotBoard 錄製操作過程
           ↓
2. 錄製時自動截取關鍵幀
           ↓
3. 在白板上標記重點
           ↓
4. 轉存為 Markdown 筆記 (自動嵌入截圖+白板)
           ↓
5. 編輯筆記，添加文字說明
           ↓
6. 一鍵轉換為簡報 (按 --- 分頁)
           ↓
7. 播放簡報 + 同步錄製講解
           ↓
8. 導出為網頁/PDF 分享
```

### 流程二：筆記優先

```
1. 在 Markdown 編輯器撰寫筆記
           ↓
2. 需要圖解時，插入白板區塊
           ↓
3. 使用截圖功能擷取螢幕內容
           ↓
4. 完成後導出為靜態網站或 PDF
```

---

## 實作優先順序

### Phase 1: Markdown 編輯器基礎

- [ ] 整合 CodeMirror 6 編輯器
- [ ] Markdown 即時預覽
- [ ] 基本工具列 (標題、粗體、列表等)
- [ ] 圖片插入與管理
- [ ] 與現有白板的橋接

### Phase 2: 筆記管理系統

- [ ] 檔案樹側邊欄
- [ ] 資料夾 CRUD
- [ ] 標籤系統
- [ ] 全文搜索
- [ ] 筆記儲存與載入 (本地檔案系統)

### Phase 3: 簡報功能

- [ ] Markdown → 簡報解析
- [ ] 簡報播放器
- [ ] 基本主題系統
- [ ] 白板標記整合
- [ ] 演講者視圖

### Phase 4: 導出功能

- [ ] HTML 單頁導出
- [ ] 多頁靜態網站生成
- [ ] PDF 導出
- [ ] 簡報獨立 HTML 導出

### Phase 5: 進階功能

- [ ] 雲端同步 (可選)
- [ ] 協作編輯 (可選)
- [ ] 插件系統
- [ ] 更多主題模板

---

## 新增依賴

```json
{
  "dependencies": {
    "@codemirror/lang-markdown": "^6.x",
    "@codemirror/state": "^6.x",
    "@codemirror/view": "^6.x",
    "react-markdown": "^9.x",
    "remark-gfm": "^4.x",
    "remark-math": "^6.x",
    "rehype-katex": "^7.x",
    "rehype-prism-plus": "^2.x",
    "fuse.js": "^7.x",
    "gray-matter": "^4.x",
    "framer-motion": "^11.x"
  }
}
```

---

## 設計考量

### 性能

- 使用虛擬化列表處理大量筆記
- Markdown 解析採用 Web Worker 避免阻塞
- 圖片懶加載與壓縮

### 跨平台

- 所有功能需同時支援 Web 版與 Electron 桌面版
- 檔案系統操作抽象化，提供統一 API

### 擴展性

- 預留插件 API
- 主題系統採用 CSS Variables
- Markdown 擴展採用 remark/rehype 插件機制

---

## 競品對比

| 功能 | ShotBoard | HackMD | Slidev | Obsidian |
|------|-----------|--------|--------|----------|
| 屏幕錄製 | ✅ | ❌ | ❌ | ❌ |
| 白板標記 | ✅ | ❌ | ❌ | 插件 |
| Markdown 編輯 | 🔜 | ✅ | ✅ | ✅ |
| 簡報模式 | 🔜 | ❌ | ✅ | 插件 |
| 靜態網站導出 | 🔜 | ❌ | ✅ | ✅ |
| PDF 導出 | 🔜 | ✅ | ✅ | ✅ |
| 桌面應用 | ✅ | ❌ | ❌ | ✅ |
| 即時協作 | 🔜 | ✅ | ❌ | ❌ |

**ShotBoard 獨特優勢**：整合錄製、白板、筆記、簡報為一體的內容創作工具

---

## 結語

此規劃將 ShotBoard 定位為「視覺化內容創作平台」，結合錄製、標記、筆記、簡報、導出的完整工作流，為教學者、內容創作者、知識工作者提供一站式解決方案。
