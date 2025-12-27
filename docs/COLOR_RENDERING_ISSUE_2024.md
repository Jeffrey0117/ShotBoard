# 顏色渲染不一致問題分析報告

## 問題描述

根據截圖觀察到的問題：
- **左側縮圖面板**：顯示深色背景 + 白色筆畫
- **右側主畫布**：顯示淺藍色背景 + 黑色筆畫
- **錄影結果**：顏色與畫面顯示不一致

---

## 根本原因分析

### 1. Excalidraw 暗色主題的運作機制

Excalidraw 的 `theme="dark"` 不是簡單的顏色替換，而是使用 **CSS 濾鏡** 來實現：

```css
filter: invert(0.93) hue-rotate(180deg)
```

這代表：
- **Canvas 實際像素**：淺色背景 + 深色筆畫（原始數據）
- **螢幕顯示**：深色背景 + 淺色筆畫（經過 CSS 濾鏡轉換）

### 2. 三種渲染路徑的差異

| 組件 | 渲染方式 | 是否套用濾鏡 | 結果 |
|-----|---------|-------------|------|
| 主畫布 | Excalidraw DOM + CSS | 有 (CSS filter) | 看起來正確 |
| 縮圖 | `exportToBlob()` | **無** | 顏色反轉 |
| 錄影 | Compositor canvas | 有 (手動套用) | 可能正確或反轉 |

### 3. 具體問題點

#### 問題 A：縮圖顏色與畫面不符

**檔案位置**：`src/components/Whiteboard/index.tsx:170-199`

```typescript
const generateThumbnail = useCallback(async (): Promise<string | null> => {
  const blob = await exportToBlob({
    elements: elements as any,
    files,
    appState: {
      ...appState,
      exportBackground: true,
      viewBackgroundColor: appState.viewBackgroundColor,
    } as any,
    maxWidthOrHeight: 300,
  });
  // ...
}, []);
```

**問題**：
- `exportToBlob()` 匯出的是 Canvas 的**原始像素**
- 原始像素是淺色背景、深色筆畫（因為 CSS 濾鏡尚未套用）
- 但使用者在畫面上看到的是深色背景、淺色筆畫

#### 問題 B：錄影顏色不一致

**檔案位置**：`src/utils/compositor.ts:234-238`

```typescript
if (this.intermediateCtx) {
  // Apply the same CSS filter that Excalidraw uses for dark mode
  this.intermediateCtx.filter = 'invert(0.93) hue-rotate(180deg)';
  this.intermediateCtx.drawImage(sourceCanvas, 0, 0);
  this.intermediateCtx.filter = 'none';
}
```

**問題**：
- Compositor **總是**套用濾鏡，假設使用者使用暗色主題
- 如果使用者選擇了淺色背景（如截圖所示的淺藍色），濾鏡會**錯誤地反轉**這些顏色
- 結果：錄影中淺色背景變深色，深色筆畫變淺色

#### 問題 C：主題與實際顏色的脫節

**截圖觀察**：
- 使用者選擇了淺藍色背景（Background 色盤中選中淺色）
- 使用者選擇了黑色筆畫（Stroke 色盤中選中黑色）
- 但系統仍使用 `theme="dark"`，導致濾鏡邏輯混亂

---

## 技術深入分析

### Excalidraw 暗色模式原理

```
使用者看到的畫面
     ↑
CSS filter: invert(0.93) hue-rotate(180deg)
     ↑
Canvas 原始像素（淺色背景、深色筆畫）
     ↑
使用者的繪畫輸入
```

### 為什麼 exportToBlob 顏色反轉？

```
exportToBlob() → 直接讀取 Canvas 像素 → 無 CSS 濾鏡 → 顏色反轉
```

### 為什麼錄影顏色可能錯誤？

```
情況 1：使用者用暗色主題
  Canvas 像素（淺色）→ Compositor 套用濾鏡 → 變深色 ✓ 正確

情況 2：使用者選擇淺色背景（如截圖）
  Canvas 像素（淺色）→ Compositor 套用濾鏡 → 變深色 ✗ 錯誤！
```

---

## 解決方案

### 方案 1：縮圖同步套用濾鏡（推薦）

**修改 `src/components/Whiteboard/index.tsx`**：

```typescript
const generateThumbnail = useCallback(async (): Promise<string | null> => {
  const api = excalidrawAPIRef.current;
  if (!api) return null;

  try {
    const elements = api.getSceneElements();
    const files = api.getFiles();
    const appState = api.getAppState();

    const blob = await exportToBlob({
      elements: elements as any,
      files,
      appState: {
        ...appState,
        exportBackground: true,
        viewBackgroundColor: appState.viewBackgroundColor,
      } as any,
      maxWidthOrHeight: 300,
    });

    // 建立臨時 Canvas 套用濾鏡
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 只有暗色主題才需要套用濾鏡
      if (appState.theme === 'dark') {
        ctx.filter = 'invert(0.93) hue-rotate(180deg)';
      }
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';

      return canvas.toDataURL('image/png');
    }

    // Fallback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
}, []);
```

### 方案 2：錄影時偵測主題並條件套用濾鏡

**修改 `src/utils/compositor.ts`**：

```typescript
// 新增：主題 getter
private getTheme: (() => 'light' | 'dark') | null = null;

setThemeGetter(getter: () => 'light' | 'dark'): void {
  this.getTheme = getter;
}

private drawFrame = (timestamp: number): void => {
  // ... existing code ...

  if (this.intermediateCtx) {
    // 只有暗色主題才套用濾鏡
    const theme = this.getTheme?.() || 'dark';
    if (theme === 'dark') {
      this.intermediateCtx.filter = 'invert(0.93) hue-rotate(180deg)';
    }
    this.intermediateCtx.drawImage(sourceCanvas, 0, 0);
    this.intermediateCtx.filter = 'none';

    // ...
  }
};
```

### 方案 3：統一使用淺色主題（最簡單但破壞性大）

如果產品定位是「所見即所得」，可以考慮：
- 移除 `theme="dark"`
- 使用 `theme="light"`
- 移除 compositor 中的濾鏡邏輯

**優點**：最簡單、無濾鏡轉換問題
**缺點**：改變現有 UI 風格

---

## 建議實施順序

### 階段 1：修復縮圖（優先）

1. 在 `generateThumbnail` 中加入濾鏡處理
2. 確保縮圖顯示與主畫布一致

### 階段 2：修復錄影

1. 在 Compositor 中加入主題偵測
2. 條件性套用濾鏡
3. 在 Recorder 中傳入主題 getter

### 階段 3：長期優化

1. 考慮完全移除 CSS 濾鏡機制
2. 使用 Excalidraw 的 light theme
3. 讓使用者自訂背景色和筆畫色

---

## 驗證清單

- [ ] 縮圖顏色與主畫布一致
- [ ] 錄影顏色與主畫布一致
- [ ] 切換頁面後縮圖正確更新
- [ ] 不同背景色設定下錄影正確
- [ ] 匯出圖片顏色正確

---

## 相關檔案

| 檔案 | 角色 | 行數 |
|-----|-----|-----|
| `src/components/Whiteboard/index.tsx` | 縮圖生成 | 170-199 |
| `src/utils/compositor.ts` | 錄影合成 | 234-238 |
| `src/components/PagePanel/PageItem.tsx` | 縮圖顯示 | 79-86 |
| `src/App.tsx` | 縮圖觸發 | 136-139 |

---

## 附錄：CSS 濾鏡原理

```
invert(0.93)：將顏色反轉 93%
  - 白色 (#ffffff) → 接近黑色
  - 黑色 (#000000) → 接近白色
  - 中間色有細微變化

hue-rotate(180deg)：色相旋轉 180 度
  - 紅色 → 青色
  - 藍色 → 橙色
  - 綠色 → 洋紅

兩者組合後，可以讓大多數顏色看起來接近「暗色版本」
但不是精確的顏色反轉，會有細微色偏
```
