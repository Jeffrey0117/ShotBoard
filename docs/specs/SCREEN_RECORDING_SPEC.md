# 螢幕錄影功能規格書

## 1. 功能概述

為 ShotBoard 新增完整的螢幕錄影功能，支援：
- 整個螢幕錄製
- 特定視窗錄製
- 自訂區域錄製
- 白板疊加層即時繪圖標註
- 麥克風 + 系統音訊混合錄製

---

## 2. 技術架構

### 2.1 核心技術棧

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ SourcePicker │  │ RecordPanel │  │ OverlayCanvas   │ │
│  │ (來源選擇器) │  │ (錄製控制)   │  │ (白板疊加層)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │            ScreenRecorder (核心錄製邏輯)           │   │
│  │  • desktopCapturer 視訊源                         │   │
│  │  • Compositor 合成器（螢幕+白板+攝像頭）           │   │
│  │  • AudioMixer 音訊混合器                          │   │
│  │  • MediaRecorder 輸出                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓ IPC
┌─────────────────────────────────────────────────────────┐
│                     Main Process                         │
├─────────────────────────────────────────────────────────┤
│  • desktopCapturer.getSources() - 列出可用螢幕/視窗     │
│  • 系統音訊捕獲 (loopback audio)                        │
│  • 區域選擇視窗管理                                     │
│  • 檔案儲存 (saveRecording IPC)                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 資料流

```
                    ┌──────────────┐
                    │ 螢幕/視窗/區域 │
                    └──────┬───────┘
                           ↓ desktopCapturer
                    ┌──────────────┐
                    │  VideoStream │
                    └──────┬───────┘
                           ↓
┌──────────┐        ┌──────────────┐        ┌──────────┐
│ 攝像頭   │───────→│  Compositor  │←───────│ 白板疊加  │
│ (可選)   │        │  (合成器)     │        │ (可選)   │
└──────────┘        └──────┬───────┘        └──────────┘
                           ↓
                    ┌──────────────┐
                    │ 合成後Canvas │
                    └──────┬───────┘
                           ↓ captureStream()
┌──────────┐        ┌──────────────┐
│ 麥克風   │───────→│  AudioMixer  │
│ 系統音訊 │───────→│  (Web Audio) │
└──────────┘        └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │MediaRecorder │
                    │ (WebM/MP4)   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  輸出檔案    │
                    └──────────────┘
```

---

## 3. 功能模組詳細設計

### 3.1 來源選擇器 (SourcePicker)

**檔案位置**: `src/components/ScreenRecorder/SourcePicker.tsx`

#### UI 設計
```
┌─────────────────────────────────────────────┐
│  選擇錄製來源                          [×]   │
├─────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 🖥️ 螢幕 │ │ 🪟 視窗 │ │ ⬚ 區域 │       │
│  └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────┤
│  [螢幕列表 / 視窗列表 / 區域選擇預覽]        │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 螢幕 1  │ │ 螢幕 2  │ │         │       │
│  │ [縮圖]  │ │ [縮圖]  │ │         │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
├─────────────────────────────────────────────┤
│  ☑️ 顯示游標    ☑️ 白板疊加層                │
├─────────────────────────────────────────────┤
│              [ 確定選擇 ]                    │
└─────────────────────────────────────────────┘
```

#### 核心功能
```typescript
interface RecordingSource {
  type: 'screen' | 'window' | 'region';
  sourceId: string;          // desktopCapturer source id
  name: string;
  thumbnail?: string;        // base64 thumbnail
  region?: {                 // 僅 region 類型
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// 獲取可用來源
async function getSources(): Promise<RecordingSource[]> {
  // 透過 IPC 呼叫 main process
  const sources = await window.electronAPI.getDesktopSources();
  return sources;
}
```

### 3.2 螢幕錄製核心 (ScreenRecorder)

**檔案位置**: `src/hooks/useScreenRecorder.ts`

#### 主要介面
```typescript
interface ScreenRecorderConfig {
  source: RecordingSource;
  resolution: {
    width: number;   // 預設 1920
    height: number;  // 預設 1080
  };
  frameRate: number;  // 預設 30

  // 音訊設定
  audio: {
    microphone: boolean;
    systemAudio: boolean;
    microphoneDeviceId?: string;
  };

  // 疊加層設定
  overlay: {
    enabled: boolean;
    whiteboard: boolean;    // 白板繪圖
    camera: boolean;        // 攝像頭泡泡
    timer: boolean;         // 計時器
  };

  // 輸出設定
  output: {
    format: 'webm' | 'mp4';
    videoBitrate: number;   // 預設 8_000_000
    audioBitrate: number;   // 預設 128_000
  };
}

interface UseScreenRecorderReturn {
  // 狀態
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  previewStream: MediaStream | null;

  // 方法
  selectSource: () => Promise<RecordingSource>;
  startPreview: (source: RecordingSource) => Promise<void>;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob>;

  // 疊加層控制
  setOverlayEnabled: (enabled: boolean) => void;
  getOverlayCanvas: () => HTMLCanvasElement | null;
}
```

### 3.3 白板疊加層 (OverlayCanvas)

**檔案位置**: `src/components/ScreenRecorder/OverlayCanvas.tsx`

這是在螢幕錄影上疊加的透明繪圖層：

```typescript
interface OverlayCanvasProps {
  width: number;
  height: number;
  sourceRegion?: { x: number; y: number; width: number; height: number };
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

// 功能：
// 1. 透明背景的 Excalidraw 實例
// 2. 繪圖工具列（筆、螢光筆、箭頭、形狀、文字）
// 3. 顏色選擇器
// 4. 清除/復原功能
// 5. 繪圖內容即時合成到錄製輸出
```

#### 工具列設計
```
┌────────────────────────────────────────────┐
│ ✏️  🖍️  ➡️  ⬜  📝  🎨  ↩️  🗑️  │
│ 筆  螢光筆 箭頭 形狀 文字 顏色 復原 清除 │
└────────────────────────────────────────────┘
```

### 3.4 音訊混合器 (AudioMixer)

**檔案位置**: `src/utils/audioMixer.ts`

```typescript
class AudioMixer {
  private audioContext: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private microphoneGain: GainNode;
  private systemAudioGain: GainNode;

  constructor() {
    this.audioContext = new AudioContext();
    this.destination = this.audioContext.createMediaStreamDestination();
  }

  // 添加麥克風音訊
  addMicrophone(stream: MediaStream): void {
    const source = this.audioContext.createMediaStreamSource(stream);
    this.microphoneGain = this.audioContext.createGain();
    source.connect(this.microphoneGain);
    this.microphoneGain.connect(this.destination);
  }

  // 添加系統音訊（透過 desktopCapturer 的 audio: true）
  addSystemAudio(stream: MediaStream): void {
    const source = this.audioContext.createMediaStreamSource(stream);
    this.systemAudioGain = this.audioContext.createGain();
    source.connect(this.systemAudioGain);
    this.systemAudioGain.connect(this.destination);
  }

  // 調整音量
  setMicrophoneVolume(volume: number): void {
    this.microphoneGain.gain.value = volume;
  }

  setSystemAudioVolume(volume: number): void {
    this.systemAudioGain.gain.value = volume;
  }

  // 獲取混合後的音訊流
  getOutputStream(): MediaStream {
    return this.destination.stream;
  }
}
```

### 3.5 區域選擇器 (RegionSelector)

重用並擴展現有的 `ScreenshotOverlay.tsx`：

**檔案位置**: `src/components/ScreenRecorder/RegionSelector.tsx`

```typescript
interface RegionSelectorProps {
  onSelect: (region: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

// 新增功能：
// 1. 即時顯示選取區域的解析度
// 2. 預設解析度快捷選項（1920x1080, 1280x720, 自訂）
// 3. 選取後保持高亮顯示錄製區域邊框
```

---

## 4. Electron 主進程 API

### 4.1 新增 IPC Handlers

**檔案位置**: `electron/screenRecording.ts`

```typescript
import { desktopCapturer, ipcMain, BrowserWindow, screen } from 'electron';

// 獲取所有可用的螢幕和視窗
ipcMain.handle('screen-recording:get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true
  });

  return sources.map(source => ({
    id: source.id,
    name: source.name,
    type: source.id.startsWith('screen:') ? 'screen' : 'window',
    thumbnail: source.thumbnail.toDataURL(),
    appIcon: source.appIcon?.toDataURL()
  }));
});

// 獲取系統音訊（需要特殊處理）
ipcMain.handle('screen-recording:get-system-audio', async () => {
  // Windows: 使用 loopback audio
  // macOS: 需要額外擴展（如 BlackHole/Soundflower）
  // 此處返回提示或可用選項
});

// 開啟區域選擇視窗
ipcMain.handle('screen-recording:select-region', async () => {
  // 創建全屏透明視窗
  // 等待用戶選擇區域
  // 返回選擇的區域座標
});
```

### 4.2 Preload 擴展

**檔案位置**: `electron/preload.ts` (新增)

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 現有的 API

  // 螢幕錄影相關
  getDesktopSources: () => ipcRenderer.invoke('screen-recording:get-sources'),
  selectRegion: () => ipcRenderer.invoke('screen-recording:select-region'),
  getSystemAudioStatus: () => ipcRenderer.invoke('screen-recording:get-system-audio'),
});
```

---

## 5. UI/UX 設計

### 5.1 錄製控制面板

整合到現有的 `Recorder` 組件，新增「螢幕錄影」模式：

```
┌───────────────────────────────────────────────────┐
│  錄製模式:  [白板] [螢幕錄影]                       │
├───────────────────────────────────────────────────┤
│                                                   │
│  錄製來源: [選擇螢幕/視窗]  ▼                       │
│  ┌─────────────────────────────────┐             │
│  │      [來源預覽縮圖]              │             │
│  └─────────────────────────────────┘             │
│                                                   │
│  音訊設定:                                        │
│  ☑️ 麥克風  [選擇裝置] ▼  🎚️ ████████░░          │
│  ☑️ 系統音訊           🎚️ ██████████            │
│                                                   │
│  疊加層:                                          │
│  ☑️ 白板繪圖  ☑️ 攝像頭  ☑️ 計時器                 │
│                                                   │
├───────────────────────────────────────────────────┤
│       [⏺️ 開始錄製]    錄製時間: 00:00:00         │
└───────────────────────────────────────────────────┘
```

### 5.2 錄製中浮動控制列

```
┌──────────────────────────────────────────┐
│  🔴 00:05:23  │  ⏸️  ⏹️  │  🎨 🎤 📷    │
│              │ 暫停 停止│ 白板 靜音 相機 │
└──────────────────────────────────────────┘
```

### 5.3 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+Shift+R` | 開始/停止螢幕錄影 |
| `Ctrl+Shift+P` | 暫停/繼續錄影 |
| `Ctrl+Shift+D` | 切換白板疊加層 |
| `Ctrl+Shift+M` | 麥克風靜音切換 |
| `Ctrl+Shift+C` | 攝像頭顯示切換 |

---

## 6. 實作步驟

### Phase 1: 基礎螢幕捕獲
1. ✅ 設計規格文件（本文件）
2. 實作 `electron/screenRecording.ts` - desktopCapturer API
3. 擴展 `electron/preload.ts` - 暴露 API
4. 實作 `SourcePicker.tsx` - 來源選擇 UI
5. 實作 `useScreenRecorder.ts` - 基本螢幕錄製

### Phase 2: 音訊處理
6. 實作 `AudioMixer.ts` - Web Audio API 混音
7. 整合系統音訊（Windows loopback）
8. 音訊設備選擇 UI

### Phase 3: 疊加層系統
9. 實作 `OverlayCanvas.tsx` - 透明繪圖層
10. 擴展 `Compositor` 支援螢幕源 + 疊加層合成
11. 工具列和繪圖功能

### Phase 4: 區域錄製
12. 擴展 `RegionSelector.tsx` - 區域選擇
13. 區域錄製的合成處理

### Phase 5: 整合與優化
14. 整合到主 UI
15. 快捷鍵實作
16. 效能優化
17. 測試和 Bug 修復

---

## 7. 注意事項

### 7.1 平台差異

| 功能 | Windows | macOS |
|------|---------|-------|
| 螢幕捕獲 | ✅ 完整支援 | ✅ 需要螢幕錄影權限 |
| 視窗捕獲 | ✅ 完整支援 | ✅ 完整支援 |
| 系統音訊 | ✅ Loopback 支援 | ⚠️ 需要虛擬音訊設備 |
| 區域捕獲 | ✅ 透過裁剪實現 | ✅ 透過裁剪實現 |

### 7.2 效能考量

- 合成 Canvas 使用 `OffscreenCanvas` 提升效能
- 考慮使用 WebCodecs API 替代 MediaRecorder（更低延遲）
- 錄製解析度和幀率需要根據硬體動態調整

### 7.3 安全性

- 需要明確的使用者權限確認
- 顯示清楚的「正在錄製」指示
- 不自動錄製敏感視窗（如密碼管理器）

---

## 8. 相依檔案清單

```
src/
├── components/
│   └── ScreenRecorder/
│       ├── index.tsx              # 主組件
│       ├── SourcePicker.tsx       # 來源選擇器
│       ├── OverlayCanvas.tsx      # 白板疊加層
│       ├── RegionSelector.tsx     # 區域選擇器
│       ├── RecordingControls.tsx  # 錄製控制
│       └── FloatingToolbar.tsx    # 浮動控制列
├── hooks/
│   └── useScreenRecorder.ts       # 螢幕錄製 Hook
├── utils/
│   ├── audioMixer.ts              # 音訊混合器
│   └── compositor.ts              # 擴展現有合成器
└── stores/
    └── screenRecorderStore.ts     # 狀態管理

electron/
├── screenRecording.ts             # 主進程 API
├── preload.ts                     # 擴展 preload
└── main.ts                        # 註冊 handlers
```
