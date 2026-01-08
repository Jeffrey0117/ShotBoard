# 顏色不一致問題分析報告

## 問題描述

使用者在螢幕上看到的顏色與錄製輸出的影片顏色不一致。

---

## 現有架構分析

### 錄製流程

```
螢幕顯示 (CSS + Canvas)
        ↓
Compositor 合成 (離屏 Canvas)
        ↓
captureStream() → MediaStream
        ↓
MediaRecorder (VP9 編碼)
        ↓
WebM 影片檔案
```

### 目前的顏色處理方式

**檔案：`src/utils/compositor.ts`**

```typescript
// 每幀繪製時取得背景色
const bgColor = this.getBackgroundColor?.() || '#1a1a2e';
ctx.fillStyle = bgColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

**檔案：`src/components/Whiteboard/index.tsx`**

```typescript
const getBackgroundColor = useCallback(() => {
  const api = excalidrawAPIRef.current;
  if (!api) return '#1a1a2e';
  const appState = api.getAppState();
  return appState.viewBackgroundColor || '#1a1a2e';
}, []);
```

---

## 根本原因分析

### 1. Excalidraw Canvas 透明度問題 ⚠️

**問題**：Excalidraw 的 Canvas 元素本身是**透明**的，背景色是透過 CSS 套用在容器上。

**影響**：
- 螢幕顯示：CSS 背景色 + 透明 Canvas = 看起來正確
- 錄製時：直接擷取 Canvas = 背景變透明或預設色

**目前解法**：已在 `compositor.ts` 中先填充背景色再繪製 Canvas。

### 2. 色彩空間未指定 ⚠️⚠️

**問題**：Canvas 2D Context 建立時沒有指定 `colorSpace`。

**檔案：`src/utils/compositor.ts` (第 32 行)**
```typescript
const ctx = this.canvas.getContext('2d');
// 沒有指定 { colorSpace: 'srgb' }
```

**影響**：
- 瀏覽器可能使用顯示器的色彩空間
- 不同設備可能有不同的色彩呈現
- VP9 編碼器可能套用額外的色彩轉換

### 3. VP9 編碼器色彩處理 ⚠️⚠️⚠️

**問題**：MediaRecorder 使用 VP9 編碼時，會進行 RGB → YUV 轉換。

```typescript
const mediaRecorder = new MediaRecorder(compositeStream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000,
});
```

**影響**：
- YUV 色彩空間轉換會造成精度損失
- 尤其在深色和飽和色上最明顯
- 解碼播放時再轉回 RGB 會有偏差

### 4. 螢幕 vs 錄製解析度差異

**問題**：
- 螢幕解析度：動態（視窗大小）
- 錄製解析度：固定 1920×1080

**影響**：縮放時的色彩插值可能造成細微差異。

### 5. 顯示器色彩設定檔

**問題**：
- 螢幕顯示會套用顯示器的 ICC 色彩設定檔
- 錄製的影片在不同裝置播放會有不同色彩

---

## 解決方案

### 方案 A：明確指定色彩空間（推薦）

**修改 `src/utils/compositor.ts`：**

```typescript
constructor(width: number, height: number) {
  this.canvas = document.createElement('canvas');
  this.canvas.width = width;
  this.canvas.height = height;

  // 明確指定 sRGB 色彩空間
  const ctx = this.canvas.getContext('2d', {
    colorSpace: 'srgb',
    alpha: false,  // 不需要透明度，可提升效能
  });

  if (!ctx) throw new Error('Failed to get 2d context');
  this.ctx = ctx;
}
```

**優點**：
- 確保一致的色彩空間
- 減少跨裝置差異
- `alpha: false` 可提升效能

### 方案 B：使用 Display-P3 色域（進階）

若目標是更準確的色彩：

```typescript
const ctx = this.canvas.getContext('2d', {
  colorSpace: 'display-p3',
});
```

**注意**：需要確認 VP9 編碼器支援。

### 方案 C：直接擷取 DOM 元素而非 Canvas

**修改 `getSourceCanvas` 方法：**

```typescript
// 使用 html2canvas 或類似工具擷取完整 DOM
import html2canvas from 'html2canvas';

const getSourceCanvas = async () => {
  const element = document.querySelector('.excalidraw-container');
  return await html2canvas(element, {
    backgroundColor: null,
    scale: 1,
  });
};
```

**優點**：
- 擷取的是使用者實際看到的畫面
- 包含所有 CSS 樣式和背景

**缺點**：
- 效能較差（每幀都要轉換）
- 需要額外套件

### 方案 D：調整 VP9 編碼參數

目前沒有標準 API 可精細控制 VP9 的色彩處理，但可以：

```typescript
const mediaRecorder = new MediaRecorder(compositeStream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 5000000,  // 提高位元率減少壓縮失真
});
```

### 方案 E：前景色彩補償（Workaround）

如果知道色彩偏移的規律，可以在繪製時預先補償：

```typescript
// 例如：如果錄製出來偏暗，可以先調亮
const adjustColor = (hex: string): string => {
  // 色彩調整邏輯
  return adjustedHex;
};

const bgColor = adjustColor(this.getBackgroundColor?.() || '#1a1a2e');
```

---

## 建議實施順序

### 第一階段：立即修復

1. **明確指定 Canvas 色彩空間為 sRGB**
2. **設定 `alpha: false`** 提升效能

```typescript
// src/utils/compositor.ts
const ctx = this.canvas.getContext('2d', {
  colorSpace: 'srgb',
  alpha: false,
});
```

### 第二階段：驗證與調整

1. 在不同裝置測試色彩一致性
2. 比較螢幕截圖與錄製幀的色彩值
3. 若仍有差異，考慮提高位元率

### 第三階段：進階優化（如需）

1. 考慮使用 `html2canvas` 擷取完整畫面
2. 探索 WebCodecs API（更精細的編碼控制）

---

## 驗證方法

### 色彩比對測試

1. 在畫布上繪製已知顏色的色塊（如 #FF0000, #00FF00, #1a1a2e）
2. 錄製一段影片
3. 使用影片編輯軟體（如 DaVinci Resolve）提取幀
4. 用吸管工具比對色彩值
5. 記錄差異並調整

### 自動化測試

```typescript
// 可以加入測試：比較 Canvas 像素與期望值
const testColorAccuracy = () => {
  const ctx = compositor.getContext();
  const imageData = ctx.getImageData(0, 0, 1, 1);
  const [r, g, b] = imageData.data;

  const expected = hexToRgb('#1a1a2e'); // { r: 26, g: 26, b: 46 }

  console.assert(r === expected.r, `Red mismatch: ${r} vs ${expected.r}`);
  console.assert(g === expected.g, `Green mismatch: ${g} vs ${expected.g}`);
  console.assert(b === expected.b, `Blue mismatch: ${b} vs ${expected.b}`);
};
```

---

## 總結

| 問題來源 | 嚴重度 | 解決方案 |
|---------|-------|---------|
| Canvas 透明度 | ✅ 已修復 | 先填充背景色 |
| 色彩空間未指定 | ⚠️ 中 | 指定 `colorSpace: 'srgb'` |
| VP9 色彩轉換 | ⚠️ 高 | 提高位元率 / 使用 WebCodecs |
| 解析度縮放 | ⚠️ 低 | 可接受 |
| 顯示器 ICC | ⚠️ 低 | 無法完全控制 |

**最重要的修復**：在 `compositor.ts` 中明確指定 `colorSpace: 'srgb'` 和 `alpha: false`。
