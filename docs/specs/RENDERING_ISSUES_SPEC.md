# 渲染問題修復規格文件

> 文件版本：1.0
> 建立日期：2025-12-26
> 狀態：待實作

---

## 1. 問題概述

本文件描述 Shotboard 錄影功能中發現的兩個渲染問題，並提供統一的修復方案。

| 問題編號 | 問題描述 | 嚴重程度 | 影響範圍 |
|---------|---------|---------|---------|
| ISSUE-001 | 錄影輸出的文字看起來有變形 | 高 | 所有錄製影片 |
| ISSUE-002 | 畫布放大時畫筆視覺上變粗 | 中 | 縮放操作時的錄製 |

---

## 2. 問題分析

### 2.1 問題一：文字變形

#### 現象
- 錄製的影片中，文字和圖形出現水平或垂直方向的拉伸/壓縮
- 圓形變成橢圓形
- 正方形變成長方形

#### 根本原因：非等比例縮放

```
來源 Canvas (Excalidraw)          目標 Canvas (Compositor)
┌──────────────────┐              ┌────────────────────────┐
│                  │              │                        │
│   1400 x 900     │  ──────→     │     1920 x 1080        │
│   (比例 1.56:1)  │   drawImage  │     (比例 1.78:1)      │
│                  │              │                        │
└──────────────────┘              └────────────────────────┘
```

**問題程式碼位置**：`src/utils/compositor.ts` 第 185 行

```typescript
// 問題：強制將來源 canvas 縮放到目標尺寸，不考慮寬高比
ctx.drawImage(this.intermediateCanvas, 0, 0, canvas.width, canvas.height);
```

當 Excalidraw canvas 的寬高比（例如 1400x900 = 1.56:1）與 Compositor 輸出尺寸（1920x1080 = 1.78:1）不同時，`drawImage` 會強制拉伸內容以填滿目標區域。

### 2.2 問題二：畫筆縮放粗細

#### 現象
- 使用者放大畫布（zoom in）時，之前繪製的筆畫看起來變粗
- 使用者預期：放大後筆畫粗細應該看起來一樣（視覺一致性）

#### 根本原因：Zoom 值影響筆畫渲染

```
Zoom = 1.0                        Zoom = 2.0
┌─────────────┐                   ┌─────────────────────────┐
│  ─── (2px)  │                   │                         │
│             │     zoom in       │     ════ (4px 視覺)     │
│             │    ──────→        │                         │
└─────────────┘                   └─────────────────────────┘
```

**原因分析**：
1. Excalidraw 的 `strokeWidth` 是邏輯單位
2. Canvas 渲染時會乘以當前 zoom 值
3. Compositor 直接捕捉已縮放的 canvas 內容
4. 結果：高 zoom 值下錄製的筆畫看起來更粗

---

## 3. 根本原因：座標系統不一致

兩個問題都源自於 **Compositor 與 Excalidraw 之間的座標系統/縮放比例不一致**：

```
┌─────────────────────────────────────────────────────────────┐
│                     座標系統關係圖                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Excalidraw 邏輯座標                                         │
│       │                                                     │
│       │ × zoom                                              │
│       ▼                                                     │
│  Excalidraw Canvas (動態尺寸，受 zoom 影響)                  │
│       │                                                     │
│       │ × devicePixelRatio (可能)                           │
│       ▼                                                     │
│  實際 Canvas 像素                                            │
│       │                                                     │
│       │ drawImage (非等比例縮放 ← 問題根源!)                 │
│       ▼                                                     │
│  Compositor 輸出 (固定 1920x1080)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**關鍵問題**：
1. 沒有正確處理 Excalidraw 的動態寬高比
2. 沒有考慮 zoom 值對渲染的影響
3. 沒有處理可能的 devicePixelRatio 差異

---

## 4. 修復方案設計

### 4.1 整體策略

採用 **等比例縮放 + Letterbox/Pillarbox** 策略，確保：
1. 內容不變形（保持原始寬高比）
2. 輸出尺寸固定（1920x1080）
3. 空白區域填充背景色

### 4.2 問題一修復：等比例縮放

#### 方案：Letterbox/Pillarbox 填充

```
來源較寬 (Pillarbox)              來源較高 (Letterbox)
┌────────────────────────┐        ┌────────────────────────┐
│ ██ ┌──────────────┐ ██ │        │ ████████████████████████│
│ ██ │              │ ██ │        │ ┌────────────────────┐ │
│ ██ │   內容區域   │ ██ │        │ │      內容區域      │ │
│ ██ │              │ ██ │        │ └────────────────────┘ │
│ ██ └──────────────┘ ██ │        │ ████████████████████████│
└────────────────────────┘        └────────────────────────┘
     左右黑邊填充                       上下黑邊填充
```

#### 演算法

```typescript
function calculateFitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number } {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth: number;
  let drawHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (sourceAspect > targetAspect) {
    // 來源較寬，以寬度為基準，上下留黑邊
    drawWidth = targetWidth;
    drawHeight = targetWidth / sourceAspect;
    offsetX = 0;
    offsetY = (targetHeight - drawHeight) / 2;
  } else {
    // 來源較高，以高度為基準，左右留黑邊
    drawHeight = targetHeight;
    drawWidth = targetHeight * sourceAspect;
    offsetX = (targetWidth - drawWidth) / 2;
    offsetY = 0;
  }

  return { drawWidth, drawHeight, offsetX, offsetY };
}
```

### 4.3 問題二修復：Zoom 補償

#### 方案：錄製時使用 zoom=1 的等效渲染

**策略選擇**：

| 方案 | 說明 | 優點 | 缺點 |
|-----|------|-----|------|
| A. Zoom 補償縮放 | 在 drawImage 時反向補償 zoom | 簡單、效能好 | 可能有精度問題 |
| B. 強制 zoom=1 | 錄製時臨時設定 zoom=1 | 最準確 | 可能閃爍 |
| C. exportToBlob | 使用 Excalidraw 導出 API | 最準確、無閃爍 | 效能差 |

**推薦方案 A**：Zoom 補償縮放

```typescript
// 取得當前 zoom 值
const zoom = excalidrawAPI.getAppState().zoom.value;

// 計算補償後的尺寸
const compensatedWidth = sourceCanvas.width / zoom;
const compensatedHeight = sourceCanvas.height / zoom;

// 使用補償後的尺寸進行等比例縮放計算
const fit = calculateFitDimensions(
  compensatedWidth,
  compensatedHeight,
  targetWidth,
  targetHeight
);
```

### 4.4 整合方案架構

```
┌─────────────────────────────────────────────────────────────┐
│                    修復後的渲染流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 取得 Excalidraw Canvas 和 AppState                      │
│       │                                                     │
│       ▼                                                     │
│  2. 讀取 zoom 值和 canvas 尺寸                              │
│       │                                                     │
│       ▼                                                     │
│  3. 計算 zoom 補償後的邏輯尺寸                               │
│       │                                                     │
│       ▼                                                     │
│  4. 計算等比例縮放參數 (Letterbox/Pillarbox)                 │
│       │                                                     │
│       ▼                                                     │
│  5. 填充背景色                                              │
│       │                                                     │
│       ▼                                                     │
│  6. 繪製內容到正確位置和尺寸                                 │
│       │                                                     │
│       ▼                                                     │
│  7. 繪製攝影機泡泡和計時器                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 實作步驟

### 5.1 修改 Compositor 類別

**檔案**：`src/utils/compositor.ts`

#### 步驟 1：新增 zoom getter

```typescript
// 新增成員變數
private getZoom: (() => number) | null = null;

// 新增 setter 方法
setZoomGetter(getter: () => number): void {
  this.getZoom = getter;
}
```

#### 步驟 2：新增等比例縮放計算函數

```typescript
private calculateFitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number } {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth: number;
  let drawHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (sourceAspect > targetAspect) {
    // 來源較寬，以寬度為基準
    drawWidth = targetWidth;
    drawHeight = targetWidth / sourceAspect;
    offsetX = 0;
    offsetY = (targetHeight - drawHeight) / 2;
  } else {
    // 來源較高，以高度為基準
    drawHeight = targetHeight;
    drawWidth = targetHeight * sourceAspect;
    offsetX = (targetWidth - drawWidth) / 2;
    offsetY = 0;
  }

  return {
    drawWidth: Math.round(drawWidth),
    drawHeight: Math.round(drawHeight),
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY)
  };
}
```

#### 步驟 3：修改 drawFrame 方法

```typescript
private drawFrame = (timestamp: number): void => {
  if (timestamp - this.lastFrameTime < this.frameInterval) {
    this.animationId = requestAnimationFrame(this.drawFrame);
    return;
  }
  this.lastFrameTime = timestamp;

  const { ctx, canvas } = this;

  // 1. 填充背景色（整個 canvas）
  const bgColor = this.getBackgroundColor?.() || '#1a1a2e';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 取得來源 canvas
  const sourceCanvas = this.getSourceCanvas?.();
  if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
    this.animationId = requestAnimationFrame(this.drawFrame);
    return;
  }

  // 3. 取得 zoom 值並計算補償
  const zoom = this.getZoom?.() || 1;
  const logicalWidth = sourceCanvas.width / zoom;
  const logicalHeight = sourceCanvas.height / zoom;

  // 4. 計算等比例縮放參數
  const fit = this.calculateFitDimensions(
    logicalWidth,
    logicalHeight,
    canvas.width,
    canvas.height
  );

  // 5. 處理中間 canvas（CSS 濾鏡）
  if (!this.intermediateCanvas ||
      this.intermediateCanvas.width !== sourceCanvas.width ||
      this.intermediateCanvas.height !== sourceCanvas.height) {
    this.intermediateCanvas = document.createElement('canvas');
    this.intermediateCanvas.width = sourceCanvas.width;
    this.intermediateCanvas.height = sourceCanvas.height;
    this.intermediateCtx = this.intermediateCanvas.getContext('2d');
  }

  if (this.intermediateCtx) {
    // 套用暗色模式濾鏡
    this.intermediateCtx.filter = 'invert(0.93) hue-rotate(180deg)';
    this.intermediateCtx.drawImage(sourceCanvas, 0, 0);
    this.intermediateCtx.filter = 'none';

    // 6. 使用等比例縮放繪製到目標 canvas
    ctx.drawImage(
      this.intermediateCanvas,
      0, 0, sourceCanvas.width, sourceCanvas.height,  // 來源區域
      fit.offsetX, fit.offsetY, fit.drawWidth, fit.drawHeight  // 目標區域
    );
  }

  // 7. 繪製攝影機泡泡
  if (this.cameraVideo && this.bubbleConfig && this.bubbleConfig.visible) {
    this.drawCameraBubble();
  }

  // 8. 繪製計時器
  this.drawTimer();

  this.animationId = requestAnimationFrame(this.drawFrame);
};
```

### 5.2 修改 Whiteboard API

**檔案**：`src/components/Whiteboard/index.tsx`

#### 步驟 1：新增 getZoom 方法

```typescript
// 在 WhiteboardAPI interface 中新增
export interface WhiteboardAPI {
  // ... 現有方法
  getZoom: () => number;
}

// 實作
const getZoom = useCallback(() => {
  const api = excalidrawAPIRef.current;
  if (!api) return 1;
  return api.getAppState().zoom.value;
}, []);

// 在 useImperativeHandle 中加入
useImperativeHandle(ref, () => ({
  // ... 現有方法
  getZoom,
}), [/* ... */, getZoom]);
```

### 5.3 修改錄製初始化

**檔案**：需要找到錄製初始化的位置，可能在 `RecordButton.tsx` 或類似檔案

```typescript
// 設定 zoom getter
compositor.setZoomGetter(() => {
  return whiteboardRef.current?.getZoom() || 1;
});
```

---

## 6. 測試計劃

### 6.1 單元測試

#### 測試案例 1：等比例縮放計算

```typescript
describe('calculateFitDimensions', () => {
  it('should add pillarbox for wider source', () => {
    const result = calculateFitDimensions(1600, 900, 1920, 1080);
    expect(result.drawWidth).toBe(1920);
    expect(result.drawHeight).toBe(1080);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it('should add letterbox for taller source', () => {
    const result = calculateFitDimensions(1000, 1000, 1920, 1080);
    expect(result.drawWidth).toBe(1080);
    expect(result.drawHeight).toBe(1080);
    expect(result.offsetX).toBe(420);
    expect(result.offsetY).toBe(0);
  });

  it('should handle exact match', () => {
    const result = calculateFitDimensions(1920, 1080, 1920, 1080);
    expect(result.drawWidth).toBe(1920);
    expect(result.drawHeight).toBe(1080);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });
});
```

#### 測試案例 2：Zoom 補償

```typescript
describe('zoom compensation', () => {
  it('should compensate for zoom > 1', () => {
    // zoom = 2 時，邏輯尺寸應該是 canvas 尺寸的一半
    const canvasWidth = 2000;
    const zoom = 2;
    const logicalWidth = canvasWidth / zoom;
    expect(logicalWidth).toBe(1000);
  });

  it('should handle zoom < 1', () => {
    const canvasWidth = 500;
    const zoom = 0.5;
    const logicalWidth = canvasWidth / zoom;
    expect(logicalWidth).toBe(1000);
  });
});
```

### 6.2 整合測試

| 測試場景 | 預期結果 | 驗證方法 |
|---------|---------|---------|
| 不同視窗大小錄製 | 文字不變形 | 視覺檢查圓形是否為正圓 |
| zoom=1 錄製 | 筆畫粗細正常 | 比較錄製前後截圖 |
| zoom=2 錄製 | 筆畫粗細與 zoom=1 一致 | 比較不同 zoom 的錄製結果 |
| zoom=0.5 錄製 | 筆畫粗細與 zoom=1 一致 | 比較不同 zoom 的錄製結果 |
| 16:9 視窗 | 無黑邊 | 視覺檢查 |
| 4:3 視窗 | 左右有黑邊 (Pillarbox) | 視覺檢查 |
| 21:9 視窗 | 上下有黑邊 (Letterbox) | 視覺檢查 |

### 6.3 手動測試清單

- [ ] 錄製包含文字的內容，確認文字不變形
- [ ] 錄製圓形，確認輸出為正圓
- [ ] 在不同 zoom 級別（0.5, 1, 2, 3）下錄製，確認筆畫粗細一致
- [ ] 調整視窗為不同寬高比，確認錄製結果正確
- [ ] 確認攝影機泡泡位置正確
- [ ] 確認計時器顯示正確
- [ ] 長時間錄製（5分鐘以上）確認效能穩定

---

## 7. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|-----|-------|-----|---------|
| Zoom 補償精度不足 | 中 | 輕微模糊 | 使用高品質縮放算法 |
| 效能下降 | 低 | 掉幀 | 監控 FPS，必要時降低錄製解析度 |
| Letterbox 顏色不匹配 | 低 | 視覺不一致 | 使用相同背景色填充 |
| Excalidraw 更新後 API 變更 | 中 | 功能失效 | 添加版本檢查和降級方案 |

---

## 8. 未來改進

1. **動態解析度**：根據來源 canvas 尺寸動態調整輸出解析度
2. **使用者選項**：讓使用者選擇輸出比例（16:9, 4:3, 1:1）
3. **高 DPI 支援**：正確處理 devicePixelRatio > 1 的情況
4. **硬體加速**：考慮使用 WebGL 進行合成以提升效能

---

## 附錄 A：相關檔案

| 檔案路徑 | 說明 |
|---------|------|
| `src/utils/compositor.ts` | 錄影合成器，需修改 |
| `src/components/Whiteboard/index.tsx` | 白板元件，需新增 getZoom |
| `src/components/RecordButton/index.tsx` | 錄製按鈕（待確認） |

## 附錄 B：參考資料

- [Canvas drawImage API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
- [Excalidraw AppState](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api#getappstate)
- [Video Aspect Ratio Best Practices](https://www.adobe.com/creativecloud/video/discover/video-aspect-ratio.html)
