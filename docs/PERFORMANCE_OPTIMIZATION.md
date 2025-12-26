# ShotBoard 效能優化與視覺修正計劃

## 一、問題清單

### 1. 視覺問題
| 問題 | 描述 | 優先級 |
|------|------|--------|
| 背景色不對 | 錄影輸出的背景色與實際顯示不一致 | 高 |
| 預設顏色太淺 | Excalidraw 預設筆觸顏色太淺，難以辨識 | 高 |

### 2. 效能問題
| 問題 | 描述 | 優先級 |
|------|------|--------|
| 錄影渲染速度 | Canvas 合成可能造成卡頓 | 中 |
| Electron 啟動速度 | 冷啟動較慢 | 中 |
| 記憶體使用 | 長時間錄影可能佔用過多記憶體 | 低 |

---

## 二、解決方案

### 2.1 背景色修正

**問題原因：** Compositor 使用固定背景色 `#1a1a2e`，但 Excalidraw canvas 可能有透明區域或不同背景。

**解決方案：**
```typescript
// compositor.ts
// 移除固定背景色，改為從 Excalidraw canvas 完整複製
// 確保 Excalidraw 的 viewBackgroundColor 正確設定
```

**修改檔案：**
- `src/utils/compositor.ts` - 移除強制背景色
- `src/components/Whiteboard/index.tsx` - 確保背景色設定正確

---

### 2.2 預設顏色修正

**問題原因：** Excalidraw 預設使用淺色筆觸，在深色背景上難以辨識。

**解決方案：**
```typescript
// Whiteboard/index.tsx
initialData={{
  appState: {
    viewBackgroundColor: '#1a1a2e',
    currentItemStrokeColor: '#ffffff',      // 預設白色筆觸
    currentItemBackgroundColor: '#3d5a80',  // 預設填充色
    currentItemFillStyle: 'solid',
  },
}}
```

**建議的深色主題配色：**
| 元素 | 顏色 | 說明 |
|------|------|------|
| 背景 | `#1a1a2e` | 深藍黑 |
| 筆觸 | `#ffffff` | 白色 |
| 填充 | `#3d5a80` | 深藍 |
| 文字 | `#e0e0e0` | 淺灰 |

---

### 2.3 渲染速度優化

**目標：** 30fps 錄影不卡頓

**優化策略：**

1. **使用 OffscreenCanvas（如支援）**
```typescript
// 在 Web Worker 中處理 canvas 合成
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

2. **降低非必要渲染**
```typescript
// 只在畫面有變化時重繪
private lastSourceHash: string = '';
private shouldRedraw(sourceCanvas: HTMLCanvasElement): boolean {
  // 簡單的髒檢測
  const hash = sourceCanvas.toDataURL('image/jpeg', 0.1);
  if (hash === this.lastSourceHash) return false;
  this.lastSourceHash = hash;
  return true;
}
```

3. **使用 requestVideoFrameCallback（Chrome/Electron 支援）**
```typescript
// 更精確的影格同步
video.requestVideoFrameCallback(this.onVideoFrame);
```

---

### 2.4 Electron 效能優化

**目標：** 減少啟動時間、降低記憶體使用

**優化策略：**

1. **啟用 V8 快取**
```typescript
// main.ts
app.commandLine.appendSwitch('js-flags', '--expose-gc');
```

2. **延遲載入非必要模組**
```typescript
// 動態 import 大型模組
const { desktopCapturer } = await import('electron');
```

3. **設定 BrowserWindow 優化選項**
```typescript
new BrowserWindow({
  webPreferences: {
    backgroundThrottling: false,  // 錄影時不降速
    enableBlinkFeatures: 'CanvasCapture',
  },
  show: false,  // 準備好再顯示
});
mainWindow.once('ready-to-show', () => mainWindow.show());
```

4. **關閉不必要的 Chromium 功能**
```typescript
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
```

---

## 三、實作步驟

### Phase 1：視覺修正（立即）
- [x] 建立規劃文件
- [ ] 修正 Excalidraw 預設顏色
- [ ] 修正錄影背景色
- [ ] 測試並 commit

### Phase 2：渲染優化（短期）
- [ ] 實作髒檢測減少不必要渲染
- [ ] 測試 30fps 錄影流暢度
- [ ] 監控 CPU 使用率

### Phase 3：Electron 優化（中期）
- [ ] 加入 ready-to-show 延遲顯示
- [ ] 設定背景不降速
- [ ] 測試冷啟動時間

---

## 四、預期效果

| 指標 | 優化前 | 優化後目標 |
|------|--------|-----------|
| 背景色 | 不一致 | 完全匹配 |
| 預設筆觸 | 淺色難辨 | 白色清晰 |
| 錄影 FPS | 可能掉幀 | 穩定 30fps |
| 冷啟動 | ~3-5s | ~1-2s |
| 記憶體使用 | 未優化 | 減少 20% |

---

## 五. 風險與備案

| 風險 | 影響 | 備案 |
|------|------|------|
| OffscreenCanvas 不支援 | 無法使用 Worker | 維持主執行緒渲染 |
| 髒檢測開銷太大 | 反而降低效能 | 移除髒檢測 |
| GPU 加速問題 | 某些顯卡不相容 | 提供軟體渲染選項 |
