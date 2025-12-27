# 多分頁畫布 + 多媒體嵌入規格書

## 概述

擴展 ShotBoard 支援多分頁畫布系統，讓使用者可以預先準備多頁內容，錄影時快速切換。同時擴展媒體支援，除了圖片外還能嵌入影片和 YouTube。

---

## 功能一：多分頁畫布系統

### 使用情境
- 教學影片：預先準備好每個章節的畫面，錄影時一頁一頁講解
- 簡報錄製：像 PPT 一樣切換頁面
- 教程製作：每個步驟一頁，方便重錄單頁

### 資料結構

```typescript
// src/types/slide.ts
interface Slide {
  id: string;
  name: string;                    // 頁面名稱（可編輯）
  elements: ExcalidrawElement[];   // Excalidraw 元素
  files: BinaryFiles;              // 圖片等檔案
  appState: Partial<AppState>;     // 視角、縮放等狀態
  thumbnail?: string;              // 縮圖 (base64)
  createdAt: number;
  updatedAt: number;
}

interface SlideStore {
  slides: Slide[];
  currentSlideId: string;

  // Actions
  addSlide: () => void;
  deleteSlide: (id: string) => void;
  duplicateSlide: (id: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  switchSlide: (id: string) => void;
  updateCurrentSlide: () => void;
  renameSlide: (id: string, name: string) => void;
}
```

### UI 設計

```
┌─────────────────────────────────────────────────────────┐
│  [錄影控制列]                                            │
├────────┬────────────────────────────────────────────────┤
│        │                                                │
│ 頁面 1 │                                                │
│ [縮圖] │                                                │
│        │              主畫布區域                         │
├────────┤                                                │
│        │                                                │
│ 頁面 2 │                                                │
│ [縮圖] │                                                │
│        │                                                │
├────────┤                                                │
│   +    │                                                │
│ 新增頁 │                                                │
└────────┴────────────────────────────────────────────────┘
```

### 側邊欄功能
- **縮圖預覽**：每頁顯示小縮圖
- **拖拽排序**：拖動調整頁面順序
- **右鍵選單**：重新命名、複製、刪除
- **快捷鍵**：
  - `PageUp` / `PageDown`：上下頁
  - `Ctrl+N`：新增頁面
  - `1-9`：快速跳到第 N 頁

### 縮圖生成策略
```typescript
// 切換頁面或內容變更時更新縮圖
const generateThumbnail = async (slide: Slide): Promise<string> => {
  const { exportToBlob } = await import('@excalidraw/excalidraw');
  const blob = await exportToBlob({
    elements: slide.elements,
    files: slide.files,
    maxWidthOrHeight: 200,  // 縮圖最大尺寸
  });
  return blobToBase64(blob);
};
```

### 頁面切換動畫（錄影時）
- **無動畫**：直接切換（預設）
- **淡入淡出**：0.3s 過渡
- **滑動**：左右滑動效果

---

## 功能二：多媒體嵌入

### 支援類型

| 類型 | 格式 | 嵌入方式 |
|------|------|----------|
| 圖片 | PNG, JPG, GIF, WebP | 現有功能 |
| 影片 | MP4, WebM | `<video>` 元素 |
| YouTube | URL | iframe 嵌入 |
| GIF 動圖 | GIF | 保持動畫播放 |

### 資料結構

```typescript
// src/types/media.ts
type MediaType = 'image' | 'video' | 'youtube' | 'gif';

interface MediaElement {
  id: string;
  type: MediaType;
  x: number;
  y: number;
  width: number;
  height: number;

  // 依類型不同
  src?: string;           // 圖片/影片的 data URL 或路徑
  youtubeId?: string;     // YouTube 影片 ID

  // 播放控制
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  startTime?: number;     // 影片起始時間（秒）
}
```

### YouTube 嵌入

```typescript
// 解析 YouTube URL
const parseYouTubeUrl = (url: string): string | null => {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// 嵌入元件
const YouTubeEmbed: React.FC<{ videoId: string; width: number; height: number }> = ({
  videoId, width, height
}) => (
  <iframe
    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
    width={width}
    height={height}
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
    allowFullScreen
  />
);
```

### 影片嵌入

```typescript
const VideoEmbed: React.FC<VideoEmbedProps> = ({
  src, width, height, autoplay, loop, muted
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      src={src}
      width={width}
      height={height}
      autoPlay={autoplay}
      loop={loop}
      muted={muted}
      playsInline
      controls
    />
  );
};
```

### 媒體在錄影中的處理

#### 問題
Excalidraw 只支援靜態圖片，影片和 iframe 無法直接放進 canvas。

#### 解決方案：Overlay Layer

```typescript
// 媒體元素渲染在畫布上方，compositor 合成時一起錄進去
<div className="whiteboard-container">
  <Excalidraw />  {/* 底層：Excalidraw 畫布 */}

  <div className="media-overlay">  {/* 上層：媒體元素 */}
    {mediaElements.map(media => (
      <MediaRenderer key={media.id} media={media} />
    ))}
  </div>
</div>
```

#### Compositor 修改

```typescript
// compositor.ts - 新增媒體層合成
class Compositor {
  private mediaElements: MediaElementWithVideo[] = [];

  setMediaElements(elements: MediaElementWithVideo[]): void {
    this.mediaElements = elements;
  }

  private drawFrame = () => {
    // 1. 畫背景
    // 2. 畫 Excalidraw canvas
    // 3. 畫媒體元素（影片、YouTube 截圖）
    this.drawMediaElements();
    // 4. 畫攝影機
    // 5. 畫計時器
  };

  private drawMediaElements(): void {
    for (const media of this.mediaElements) {
      if (media.type === 'video' && media.videoElement) {
        this.ctx.drawImage(
          media.videoElement,
          media.x, media.y, media.width, media.height
        );
      }
      // YouTube 需要用 html2canvas 或定期截圖
    }
  }
}
```

### 拖放上傳

```typescript
// 支援拖放檔案或 URL
const handleDrop = async (e: DragEvent) => {
  const files = e.dataTransfer?.files;
  const url = e.dataTransfer?.getData('text/uri-list');

  if (files?.length) {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await insertImage(file);
      } else if (file.type.startsWith('video/')) {
        await insertVideo(file);
      }
    }
  } else if (url) {
    const youtubeId = parseYouTubeUrl(url);
    if (youtubeId) {
      await insertYouTube(youtubeId);
    }
  }
};
```

---

## 實作優先順序

### Phase 1：多分頁基礎（建議先做）
1. Slide store 資料結構
2. 側邊欄 UI（縮圖列表）
3. 頁面切換邏輯
4. 縮圖生成
5. 快捷鍵支援

### Phase 2：分頁進階
1. 拖拽排序
2. 右鍵選單（重命名、複製、刪除）
3. 頁面切換動畫
4. 專案存檔包含所有分頁

### Phase 3：影片嵌入
1. 本地影片拖放上傳
2. 影片播放控制 UI
3. Compositor 影片合成
4. 錄影時同步影片音訊

### Phase 4：YouTube 嵌入
1. YouTube URL 解析
2. iframe 嵌入顯示
3. 錄影時 YouTube 截圖合成（技術挑戰較大）

---

## 技術挑戰

### 1. YouTube 錄製限制
- iframe 內容無法直接 `drawImage`（跨域限制）
- 可能方案：
  - 使用者手動播放，我們錄螢幕區域
  - 提示使用者下載影片後用本地影片功能

### 2. 影片音訊同步
- 錄影時要把嵌入影片的音訊也錄進去
- 需要用 Web Audio API 混音

### 3. 大檔案處理
- 影片檔案可能很大
- 考慮：
  - 不存 data URL，存檔案路徑
  - 專案檔分離媒體資源

### 4. 效能考量
- 多個影片同時播放可能卡頓
- 縮圖生成要非同步，避免阻塞 UI

---

## 檔案結構規劃

```
src/
├── stores/
│   └── slideStore.ts          # 分頁狀態管理
├── types/
│   ├── slide.ts               # 分頁類型定義
│   └── media.ts               # 媒體類型定義
├── components/
│   ├── SlidePanel/            # 側邊欄分頁列表
│   │   ├── index.tsx
│   │   ├── SlideItem.tsx      # 單個分頁項目
│   │   └── SlideThumbnail.tsx # 縮圖元件
│   └── MediaEmbed/            # 媒體嵌入元件
│       ├── index.tsx
│       ├── VideoEmbed.tsx
│       └── YouTubeEmbed.tsx
└── utils/
    ├── thumbnail.ts           # 縮圖生成
    └── mediaParser.ts         # URL 解析
```

---

## 決策結果

| 問題 | 決策 |
|------|------|
| 側邊欄位置 | **左側** |
| 頁面切換動畫 | **不需要**，直接切換 |
| YouTube 支援 | **不做**，跨域限制無法錄影 |
| 影片大小限制 | **延後處理** |

## 最終實作範圍

### 現在做
- Phase 1：多分頁基礎
- Phase 2：分頁進階（拖拽、右鍵選單）

### 延後做
- Phase 3：本地影片嵌入

### 不做
- ~~Phase 4：YouTube 嵌入~~
