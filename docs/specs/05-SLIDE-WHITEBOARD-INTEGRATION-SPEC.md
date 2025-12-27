# 簡報與白板整合規格

## 概述

將簡報系統整合進白板頁面架構，讓用戶可以：
1. 在左側頁面面板中管理簡報投影片
2. 在投影片上直接繪圖標記
3. 同時進行錄影

## 目標

- 簡報不再是全屏覆蓋，而是融入現有的多頁白板架構
- 每張投影片 = 一個白板頁面（背景為投影片內容）
- 保留完整的 Excalidraw 繪圖功能
- 支援邊放簡報邊錄影

---

## 架構設計

### 方案：投影片作為頁面背景

```
┌─────────────────────────────────────────────────────┐
│  Header: [ShotBoard]  [📊 簡報]  [狀態]              │
├─────────┬───────────────────────────────────────────┤
│         │                                           │
│  頁面   │      白板區域                              │
│  面板   │      ┌─────────────────────────────┐      │
│         │      │                             │      │
│ ┌─────┐ │      │   投影片內容（背景）          │      │
│ │ P1  │ │      │   + Excalidraw 標記（前景）   │      │
│ └─────┘ │      │                             │      │
│ ┌─────┐ │      └─────────────────────────────┘      │
│ │ P2  │ │                                           │
│ └─────┘ │                                           │
│ ┌─────┐ │      ┌─────────────────────────────┐      │
│ │ P3  │ │      │   錄影工具列（最上層）        │      │
│ └─────┘ │      └─────────────────────────────┘      │
│         │                                           │
└─────────┴───────────────────────────────────────────┘
```

### 資料結構擴展

```typescript
// 擴展 WhiteboardPage
interface WhiteboardPage {
  id: string;
  elements: ExcalidrawElement[];
  files: BinaryFiles;

  // 新增：簡報背景
  slideBackground?: {
    type: 'slide';
    content: string;      // Markdown 內容
    htmlContent?: string; // 渲染後的 HTML
    theme: string;        // 主題 ID
  };

  // 現有欄位
  viewBackgroundColor: string;
  scrollX: number;
  scrollY: number;
  zoom: number;
  thumbnail?: string;
}
```

### 簡報匯入流程

```
用戶點擊「📊 簡報」
        ↓
開啟 Markdown 編輯器
        ↓
輸入/貼上 Markdown
        ↓
點擊「匯入為頁面」
        ↓
系統解析 Markdown，每個 --- 分隔的區塊
        ↓
為每張投影片建立一個 WhiteboardPage
  - slideBackground 設為投影片內容
  - elements 初始為空（可以畫畫）
        ↓
頁面面板顯示所有投影片
        ↓
用戶可以：
  - 在任意投影片上繪圖
  - 用 PageUp/PageDown 切換
  - 同時錄影
```

---

## UI 變更

### 1. Header 簡報按鈕行為變更

**現狀**：打開全屏簡報播放器
**新行為**：打開 Markdown 編輯器，可選擇：
- 「▶ 全屏播放」- 原本的簡報模式
- 「📄 匯入為頁面」- 新功能，將投影片匯入頁面面板

### 2. 頁面面板擴展

投影片頁面的縮圖顯示：
- 渲染投影片內容作為背景
- 疊加 Excalidraw 元素
- 標記圖示表示這是投影片頁面

### 3. 白板區域

當頁面有 `slideBackground` 時：
- 背景渲染為投影片內容（Markdown → HTML）
- Excalidraw 畫布透明
- 用戶可以正常使用所有繪圖工具

---

## 技術實作

### 1. SlideBackgroundRenderer 組件

```typescript
interface SlideBackgroundRendererProps {
  content: string;      // Markdown 內容
  theme: SlideTheme;    // 主題
}

// 渲染投影片內容為背景 div
// 使用 ReactMarkdown + 主題樣式
```

### 2. Whiteboard 組件修改

```typescript
// Whiteboard/index.tsx

// 接收背景內容
interface WhiteboardProps {
  className?: string;
  slideBackground?: {
    content: string;
    theme: string;
  };
}

// 當有 slideBackground 時：
// 1. 設定 Excalidraw 背景為透明
// 2. 在 Excalidraw 下方渲染 SlideBackgroundRenderer
```

### 3. PageStore 擴展

```typescript
// stores/pageStore.ts

// 新增 action
importSlidesAsPages: (markdown: string, theme: string) => void;

// 實作：
// 1. 解析 Markdown
// 2. 為每張投影片呼叫 addPage()
// 3. 設定每頁的 slideBackground
```

### 4. 簡報控制整合

簡報模式的快捷鍵在頁面模式下也可用：
- `Space` / `→` / `PageDown` → 下一頁
- `←` / `PageUp` → 上一頁
- `F` → 全屏播放當前頁面
- `1-9` → 跳到第 N 頁

---

## 錄影整合

錄影時捕捉的內容：
1. 投影片背景（HTML 渲染）
2. Excalidraw 標記
3. 攝影機泡泡（如果啟用）

確保 z-index 順序：
```
錄影工具列  z-index: 10000
攝影機泡泡  z-index: 9000
Excalidraw  z-index: 1
投影片背景  z-index: 0
```

---

## 檔案儲存

`.sbpres` 專案檔案格式擴展：

```typescript
interface ProjectFile {
  version: string;
  pages: WhiteboardPage[];  // 包含 slideBackground

  // 可選：原始 Markdown 來源
  slideSource?: {
    markdown: string;
    theme: string;
    importedAt: string;
  };
}
```

---

## 實作步驟

### Phase 1: 背景渲染
- [ ] 建立 SlideBackgroundRenderer 組件
- [ ] 修改 Whiteboard 支援背景層
- [ ] 測試透明畫布 + 背景渲染

### Phase 2: 頁面整合
- [ ] 擴展 WhiteboardPage 類型
- [ ] 實作 importSlidesAsPages action
- [ ] 修改 Markdown 編輯器 UI（加入「匯入為頁面」按鈕）

### Phase 3: 縮圖與預覽
- [ ] 修改縮圖生成邏輯（包含背景）
- [ ] 頁面面板顯示投影片標記

### Phase 4: 錄影整合
- [ ] 確保錄影捕捉包含背景
- [ ] 測試邊放簡報邊錄影

### Phase 5: 快捷鍵整合
- [ ] 整合簡報快捷鍵到頁面導航
- [ ] 加入全屏播放當前頁功能

---

## 注意事項

1. **效能**：投影片背景使用 CSS 渲染，避免每幀重繪
2. **記憶體**：大量投影片時考慮懶加載
3. **相容性**：保留原本的全屏簡報模式作為備選
4. **撤銷/重做**：標記內容應支援撤銷

---

## 預期成果

用戶可以：
1. 匯入 Markdown 簡報 → 自動建立多個頁面
2. 在任意投影片上用 Excalidraw 畫標記
3. 用快捷鍵快速切換投影片
4. 同時錄製講解影片
5. 儲存包含標記的簡報專案
