# 完整色彩渲染分析報告

## 問題陳述

錄製的影片顏色與螢幕上看到的不一致，包括：
- 背景色偏差
- 畫筆/筆劃顏色偏差

---

## 當前渲染管線分析

### 螢幕顯示流程（你眼睛看到的）

```
Excalidraw 組件
    ↓
CSS 背景色 (#1a1a2e) 套用在容器 <div>
    ↓
Excalidraw 內部 Canvas（透明背景 + 筆劃）
    ↓
瀏覽器合成這兩層
    ↓
顯示器根據 ICC 色彩設定檔渲染
    ↓
你的眼睛看到的顏色
```

### 錄製流程（影片輸出的）

```
Compositor 建立離屏 Canvas (1920×1080)
    ↓
填充背景色 ctx.fillStyle = '#1a1a2e'
    ↓
從 Excalidraw 的 DOM Canvas 用 drawImage() 複製
    ↓
canvas.captureStream(30) 產生 MediaStream
    ↓
MediaRecorder + VP9 編碼
    ↓
RGB → YUV420 色彩空間轉換
    ↓
WebM 檔案
    ↓
播放時 YUV420 → RGB 轉換
    ↓
影片顯示的顏色
```

---

## 問題根源分析

### 問題 1：Excalidraw Canvas 的色彩空間未知

**現狀：**
```typescript
// Whiteboard/index.tsx - 取得 Excalidraw 的 canvas
const canvas = containerRef.current.querySelector('.excalidraw__canvas');
```

**問題：**
- Excalidraw 內部建立 Canvas 時可能沒有指定 `colorSpace`
- 瀏覽器預設會使用顯示器的色彩空間（可能是 Display-P3 或其他）
- 當我們用 `drawImage()` 複製到 sRGB Canvas 時，會發生隱式色彩轉換

### 問題 2：drawImage() 的色彩空間轉換

**現狀：**
```typescript
// compositor.ts
const ctx = this.canvas.getContext('2d', {
  colorSpace: 'srgb',  // 目標是 sRGB
  alpha: false,
});

// 來源 Canvas 可能是不同的色彩空間
ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
```

**問題：**
- 如果 `sourceCanvas`（Excalidraw）使用 Display-P3
- 而 `this.canvas`（Compositor）使用 sRGB
- `drawImage()` 會進行色彩空間轉換，導致顏色偏差

### 問題 3：VP9 的 YUV420 色彩損失

**現狀：**
```typescript
const mediaRecorder = new MediaRecorder(compositeStream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000,
});
```

**問題：**
- VP9 使用 YUV420 色彩空間
- YUV420 對色度進行 4:1 降採樣
- 深色和飽和色受影響最大
- RGB → YUV → RGB 雙重轉換造成精度損失

### 問題 4：位元率不足

**現狀：** 2.5 Mbps @ 1920×1080 @ 30fps

**問題：**
- 每幀約 10KB 的預算
- 壓縮會造成色彩邊界模糊
- 深色區域特別容易出現色塊

---

## 解決方案

### 方案 A：使用 Excalidraw 的 exportToCanvas()（推薦）

**原理：** 讓 Excalidraw 自己渲染完整的畫面（包含背景色），而不是我們手動填充背景再複製透明 Canvas。

**實作：**

```typescript
// Whiteboard/index.tsx - 新增方法
const exportCanvas = useCallback(async () => {
  const api = excalidrawAPIRef.current;
  if (!api) return null;

  const { exportToCanvas } = await import('@excalidraw/excalidraw');

  return await exportToCanvas({
    elements: api.getSceneElements(),
    appState: {
      ...api.getAppState(),
      exportWithDarkMode: true,
    },
    files: api.getFiles(),
    getDimensions: () => ({ width: 1920, height: 1080, scale: 1 }),
  });
}, []);
```

**優點：**
- Excalidraw 內部處理所有渲染
- 背景色和筆劃色在同一個渲染上下文
- 不會有色彩空間轉換問題

**缺點：**
- `exportToCanvas` 是異步的，可能有性能影響
- 需要每幀呼叫（30fps = 每秒 30 次）

---

### 方案 B：強制統一色彩空間

**原理：** 確保來源和目標 Canvas 使用相同的色彩空間。

**實作：**

```typescript
// compositor.ts - drawFrame 方法中
private drawFrame = (timestamp: number): void => {
  // ... 省略 ...

  const sourceCanvas = this.getSourceCanvas?.();

  if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
    // 建立中間 Canvas 強制轉換為 sRGB
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;
    const tempCtx = tempCanvas.getContext('2d', {
      colorSpace: 'srgb',
      alpha: true,  // 保留透明度
    });

    if (tempCtx) {
      // 先複製到 sRGB Canvas
      tempCtx.drawImage(sourceCanvas, 0, 0);
      // 再從 sRGB Canvas 繪製到目標
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }
  }
};
```

**優點：**
- 確保色彩空間一致
- 不需要修改 Excalidraw 整合

**缺點：**
- 額外的 Canvas 複製操作
- 可能有輕微性能影響

---

### 方案 C：使用 ImageData 進行像素級複製

**原理：** 直接讀取像素數據，避免 `drawImage()` 的隱式轉換。

**實作：**

```typescript
// compositor.ts
private drawFrame = (timestamp: number): void => {
  const { ctx, canvas } = this;

  // 填充背景
  const bgColor = this.getBackgroundColor?.() || '#1a1a2e';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sourceCanvas = this.getSourceCanvas?.();

  if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
    const sourceCtx = sourceCanvas.getContext('2d');
    if (sourceCtx) {
      // 取得來源像素數據
      const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

      // 建立縮放後的 ImageData
      // 注意：這需要手動縮放演算法，較複雜
      // 或使用 OffscreenCanvas + createImageBitmap
    }
  }
};
```

**優點：**
- 完全控制像素處理

**缺點：**
- 實作複雜
- 性能開銷大
- 需要手動處理縮放

---

### 方案 D：提高位元率 + 使用不同編碼器

**原理：** 減少壓縮造成的色彩損失。

**實作：**

```typescript
// useRecorder.ts
const mediaRecorder = new MediaRecorder(compositeStream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 8000000,  // 8 Mbps（原本 2.5 Mbps）
});
```

**或嘗試 VP8（較舊但可能色彩處理不同）：**

```typescript
const mediaRecorder = new MediaRecorder(compositeStream, {
  mimeType: 'video/webm;codecs=vp8',
  videoBitsPerSecond: 8000000,
});
```

**優點：**
- 實作簡單
- 減少壓縮失真

**缺點：**
- 檔案變大
- 不能完全解決色彩空間問題

---

### 方案 E：使用 OffscreenCanvas + ImageBitmapRenderingContext

**原理：** 使用更現代的 API 進行精確的像素複製。

**實作：**

```typescript
// compositor.ts
private async drawFrameWithBitmap(): Promise<void> {
  const sourceCanvas = this.getSourceCanvas?.();
  if (!sourceCanvas) return;

  // 建立 ImageBitmap（精確複製）
  const bitmap = await createImageBitmap(sourceCanvas);

  // 使用 bitmaprenderer context
  const bitmapCanvas = document.createElement('canvas');
  bitmapCanvas.width = this.canvas.width;
  bitmapCanvas.height = this.canvas.height;
  const bitmapCtx = bitmapCanvas.getContext('bitmaprenderer');

  if (bitmapCtx) {
    bitmapCtx.transferFromImageBitmap(bitmap);
    // 然後從 bitmapCanvas 複製到目標
    this.ctx.drawImage(bitmapCanvas, 0, 0);
  }

  bitmap.close();  // 釋放資源
}
```

**優點：**
- ImageBitmap 保留原始色彩資訊
- 現代瀏覽器優化

**缺點：**
- 異步操作
- 需要 Promise 處理

---

## 建議實施順序

### 第一步：立即修復（方案 D）

提高位元率，減少壓縮損失：

```typescript
// useRecorder.ts 第 130-132 行
const mediaRecorder = new MediaRecorder(compositeStream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 8000000,  // 提高到 8 Mbps
});
```

### 第二步：中間 Canvas 強制 sRGB（方案 B）

確保色彩空間統一：

```typescript
// compositor.ts - 修改 drawFrame 方法
if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
  // 建立 sRGB 中間層
  if (!this.intermediateCanvas) {
    this.intermediateCanvas = document.createElement('canvas');
    this.intermediateCanvas.width = sourceCanvas.width;
    this.intermediateCanvas.height = sourceCanvas.height;
    this.intermediateCtx = this.intermediateCanvas.getContext('2d', {
      colorSpace: 'srgb',
      alpha: true,
    });
  }

  if (this.intermediateCtx) {
    // 清除中間層
    this.intermediateCtx.clearRect(0, 0, this.intermediateCanvas.width, this.intermediateCanvas.height);
    // 複製到 sRGB
    this.intermediateCtx.drawImage(sourceCanvas, 0, 0);
    // 繪製到目標
    ctx.drawImage(this.intermediateCanvas, 0, 0, canvas.width, canvas.height);
  }
}
```

### 第三步：使用 Excalidraw exportToCanvas（方案 A）

如果以上方案仍不夠，使用 Excalidraw 的官方導出功能：

```typescript
// 需要重構為異步渲染
// 使用 requestAnimationFrame + Promise
```

---

## 驗證方法

### 測試 1：色彩取樣比對

1. 在 Excalidraw 畫一個填充的矩形，顏色設為 `#FF0000`
2. 錄製一段影片
3. 用影片編輯軟體（如 DaVinci Resolve）截取一幀
4. 用吸管工具取樣顏色
5. 比較 RGB 值

**預期結果：**
- 理想：完全相同 `#FF0000`
- 可接受：偏差 < 5（如 `#FB0000` 或 `#FF0502`）
- 有問題：偏差 > 10

### 測試 2：背景色比對

1. 設定背景色為 `#1a1a2e`
2. 錄製空白畫面
3. 截取一幀
4. 取樣背景色

**預期結果：**
- `#1a1a2e` = RGB(26, 26, 46)
- 實際可能會是 RGB(25, 25, 45) 或類似

### 測試 3：Console 偵錯

在錄製時打開開發者工具，查看：
```
[Compositor] Background color: #1a1a2e getter exists: true
```

確認背景色正確傳遞。

---

## 技術限制說明

### VP9 編碼器的固有限制

| 特性 | 說明 |
|------|------|
| 色彩空間 | YUV420（4:2:0 色度降採樣） |
| 色彩精度 | 8-bit（每通道 256 階） |
| 色彩範圍 | Limited Range（16-235） |

**這意味著：**
- 深黑色（如 #1a1a2e）會被裁剪或量化
- 高飽和色會失去細節
- 無法達到 100% 色彩準確

### 可能的終極解決方案

1. **使用 H.264 + MP4**（如果瀏覽器支援）
2. **使用 WebCodecs API**（更精細的編碼控制）
3. **伺服器端編碼**（使用 FFmpeg）

---

## 結論

| 問題 | 狀態 | 解決方案 |
|------|------|---------|
| Canvas 透明背景 | ✅ 已修復 | 先填充背景色 |
| 色彩空間未指定 | ⚠️ 部分修復 | 需要中間 Canvas 轉換 |
| VP9 色彩損失 | ⚠️ 無法完全解決 | 提高位元率可改善 |
| 位元率不足 | 🔧 可調整 | 提高到 8 Mbps |

**最重要的下一步：**
1. 提高位元率到 8 Mbps
2. 加入中間 sRGB Canvas 層
3. 測試色彩準確度
