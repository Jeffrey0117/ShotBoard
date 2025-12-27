# 攝影機形狀與可見性功能設計

## 功能概述

讓使用者可以：
1. **變換形狀**：圓形 ↔ 方形 ↔ 圓角方形
2. **隱藏/顯示**：錄製時隱藏人像但保留音訊

---

## 現有架構

### 相關檔案

| 檔案 | 職責 |
|-----|------|
| `src/components/Recorder/CameraBubble.tsx` | UI 預覽氣泡 |
| `src/utils/compositor.ts` | 錄製時的 Canvas 合成 |
| `src/components/Recorder/useRecorder.ts` | 錄製狀態管理 |
| `src/App.tsx` | 元件整合與狀態傳遞 |

### 目前 CameraBubble 樣式

```typescript
style={{
  borderRadius: '50%',  // 固定圓形
  // ...其他樣式
}}
```

### 目前 Compositor 繪製

```typescript
// 圓形裁切
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
ctx.clip();
```

---

## 設計規格

### 1. 新增資料類型

**檔案：`src/types/camera.ts`（新增）**

```typescript
export type CameraShape = 'circle' | 'square' | 'rounded';

export interface CameraBubbleConfig {
  x: number;
  y: number;
  diameter: number;
  shape: CameraShape;
  visible: boolean;
  borderRadius?: number;  // 用於 'rounded' 形狀
}

export interface CameraSettings {
  shape: CameraShape;
  visible: boolean;
  borderRadius: number;  // 0-50，預設 16
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  shape: 'circle',
  visible: true,
  borderRadius: 16,
};
```

### 2. UI 控制介面

**位置**：在 CameraBubble 上方或右鍵選單

#### 方案 A：浮動工具列（推薦）

```
┌─────────────────────────────┐
│  ○  □  ▢  │  👁  │         │
│ 圓 方 圓角 │ 顯示 │         │
└─────────────────────────────┘
         ↓
    ┌─────────┐
    │ 攝影機  │
    │ 預覽    │
    └─────────┘
```

#### 方案 B：右鍵選單

```
右鍵點擊 CameraBubble
    ├── 形狀
    │   ├── ○ 圓形
    │   ├── □ 方形
    │   └── ▢ 圓角方形
    └── 隱藏攝影機
```

#### 方案 C：側邊設定面板

在主介面加入設定區塊，統一管理攝影機設定。

**建議**：採用方案 A（浮動工具列），最直覺且不占空間。

### 3. 形狀繪製邏輯

**修改 `src/utils/compositor.ts`：**

```typescript
private drawCameraBubble(ctx: CanvasRenderingContext2D): void {
  if (!this.cameraVideo || !this.bubbleConfig) return;
  if (!this.bubbleConfig.visible) return;  // 隱藏時直接返回

  const { x, y, diameter, shape, borderRadius } = this.bubbleConfig;
  const radius = diameter / 2;
  const centerX = x + radius;
  const centerY = y + radius;

  ctx.save();

  // 根據形狀建立裁切路徑
  this.createClipPath(ctx, x, y, diameter, shape, borderRadius);
  ctx.clip();

  // 繪製攝影機畫面（鏡像）
  this.drawMirroredCamera(ctx, x, y, diameter, centerX, centerY);

  ctx.restore();

  // 繪製邊框
  this.drawBorder(ctx, x, y, diameter, shape, borderRadius);
}

private createClipPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: CameraShape,
  borderRadius: number = 16
): void {
  ctx.beginPath();

  switch (shape) {
    case 'circle':
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      break;

    case 'square':
      ctx.rect(x, y, size, size);
      break;

    case 'rounded':
      // 圓角矩形
      const r = Math.min(borderRadius, size / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + size - r, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + r);
      ctx.lineTo(x + size, y + size - r);
      ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
      ctx.lineTo(x + r, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      break;
  }

  ctx.closePath();
}

private drawBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: CameraShape,
  borderRadius: number = 16
): void {
  this.createClipPath(ctx, x, y, size, shape, borderRadius);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
}
```

### 4. CameraBubble 元件更新

**修改 `src/components/Recorder/CameraBubble.tsx`：**

```typescript
interface CameraBubbleProps {
  stream: MediaStream;
  onBubbleConfigChange: (config: CameraBubbleConfig) => void;
  settings: CameraSettings;
  onSettingsChange: (settings: CameraSettings) => void;
}

export const CameraBubble: React.FC<CameraBubbleProps> = ({
  stream,
  onBubbleConfigChange,
  settings,
  onSettingsChange,
}) => {
  // ...existing state...

  // 根據形狀計算 CSS borderRadius
  const getBorderRadius = (): string => {
    switch (settings.shape) {
      case 'circle':
        return '50%';
      case 'square':
        return '0';
      case 'rounded':
        return `${settings.borderRadius}px`;
      default:
        return '50%';
    }
  };

  // 形狀切換處理
  const handleShapeChange = (shape: CameraShape) => {
    onSettingsChange({ ...settings, shape });
  };

  // 可見性切換
  const handleVisibilityToggle = () => {
    onSettingsChange({ ...settings, visible: !settings.visible });
  };

  // 如果隱藏，不渲染預覽（但仍保持音訊串流）
  if (!settings.visible) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 99999,
        }}
      >
        <button onClick={handleVisibilityToggle} title="顯示攝影機">
          👁‍🗨 顯示攝影機
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 控制工具列 */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y - 40,
          display: 'flex',
          gap: 4,
          zIndex: 100000,
        }}
      >
        <ShapeButton
          active={settings.shape === 'circle'}
          onClick={() => handleShapeChange('circle')}
          title="圓形"
        >
          ○
        </ShapeButton>
        <ShapeButton
          active={settings.shape === 'square'}
          onClick={() => handleShapeChange('square')}
          title="方形"
        >
          □
        </ShapeButton>
        <ShapeButton
          active={settings.shape === 'rounded'}
          onClick={() => handleShapeChange('rounded')}
          title="圓角方形"
        >
          ▢
        </ShapeButton>
        <Divider />
        <button onClick={handleVisibilityToggle} title="隱藏攝影機">
          👁
        </button>
      </div>

      {/* 攝影機預覽 */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size,
          height: size,
          borderRadius: getBorderRadius(),
          overflow: 'hidden',
          border: '3px solid #fff',
          // ...其他樣式
        }}
      >
        <video ref={videoRef} /* ... */ />
      </div>
    </>
  );
};
```

### 5. 狀態管理

**修改 `src/components/Recorder/useRecorder.ts`：**

```typescript
interface UseRecorderOptions {
  // ...existing options...
}

interface UseRecorderReturn {
  // ...existing return values...
  cameraSettings: CameraSettings;
  setCameraSettings: (settings: CameraSettings) => void;
}

export function useRecorder(options: UseRecorderOptions): UseRecorderReturn {
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(
    DEFAULT_CAMERA_SETTINGS
  );

  // 更新 compositor 時傳入形狀和可見性
  const updateBubbleConfig = useCallback((config: Partial<CameraBubbleConfig>) => {
    if (compositorRef.current) {
      compositorRef.current.setCameraSource(cameraVideoRef.current!, {
        ...config,
        shape: cameraSettings.shape,
        visible: cameraSettings.visible,
        borderRadius: cameraSettings.borderRadius,
      } as CameraBubbleConfig);
    }
  }, [cameraSettings]);

  return {
    // ...existing...
    cameraSettings,
    setCameraSettings,
  };
}
```

### 6. 隱藏時的音訊處理

**重要**：隱藏攝影機時，音訊仍需錄製。

```typescript
// useRecorder.ts - startRecording 方法中
const compositeStream = compositor.getStream();

// 音訊始終加入，不受 visible 影響
const audioTrack = cameraStream.getAudioTracks()[0];
if (audioTrack) {
  compositeStream.addTrack(audioTrack);
}

// Compositor 根據 visible 決定是否繪製攝影機畫面
// 但不影響音訊
```

---

## UI 設計細節

### 工具列樣式

```css
.camera-toolbar {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.shape-button {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
  opacity: 0.6;
  transition: opacity 0.2s, background 0.2s;
}

.shape-button:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.shape-button.active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

.divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.3);
  margin: 4px 4px;
}
```

### 隱藏時的提示按鈕

```css
.show-camera-button {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.2s;
}

.show-camera-button:hover {
  background: rgba(0, 0, 0, 0.9);
}
```

---

## 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|-------|------|
| `H` | 隱藏/顯示攝影機 |
| `1` | 切換為圓形 |
| `2` | 切換為方形 |
| `3` | 切換為圓角方形 |

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key.toLowerCase()) {
      case 'h':
        setCameraSettings(prev => ({ ...prev, visible: !prev.visible }));
        break;
      case '1':
        setCameraSettings(prev => ({ ...prev, shape: 'circle' }));
        break;
      case '2':
        setCameraSettings(prev => ({ ...prev, shape: 'square' }));
        break;
      case '3':
        setCameraSettings(prev => ({ ...prev, shape: 'rounded' }));
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 實作步驟

### Phase 1：資料結構與類型

1. 建立 `src/types/camera.ts`
2. 更新 `CameraBubbleConfig` 介面
3. 加入預設值

### Phase 2：Compositor 更新

1. 更新 `setCameraSource` 方法接受新設定
2. 實作 `createClipPath` 支援不同形狀
3. 實作 `drawBorder` 支援不同形狀
4. 加入 `visible` 檢查

### Phase 3：CameraBubble 元件

1. 新增形狀切換 UI
2. 新增隱藏/顯示按鈕
3. 更新 CSS borderRadius 邏輯
4. 隱藏時顯示「顯示攝影機」按鈕

### Phase 4：狀態整合

1. 更新 `useRecorder` hook
2. 在 `App.tsx` 連接設定狀態
3. 確保設定變更同步到 Compositor

### Phase 5：優化

1. 加入鍵盤快捷鍵
2. 加入過渡動畫
3. 儲存使用者偏好設定（localStorage）

---

## 測試檢查清單

- [ ] 圓形形狀正確顯示和錄製
- [ ] 方形形狀正確顯示和錄製
- [ ] 圓角方形正確顯示和錄製
- [ ] 隱藏時預覽消失
- [ ] 隱藏時錄製不包含攝影機
- [ ] 隱藏時音訊仍正常錄製
- [ ] 形狀切換時預覽即時更新
- [ ] 形狀切換時錄製也同步
- [ ] 拖曳功能在各形狀下正常運作
- [ ] 縮放功能在各形狀下正常運作
- [ ] 鍵盤快捷鍵正常運作
- [ ] 設定在頁面重新載入後保持

---

## 未來擴展

1. **自訂邊框顏色**：讓使用者選擇邊框顏色
2. **邊框粗細調整**：1px - 5px
3. **陰影效果**：可開關的陰影
4. **透明度調整**：攝影機預覽透明度
5. **位置預設**：四個角落的快速定位
6. **動畫效果**：形狀切換時的過渡動畫
