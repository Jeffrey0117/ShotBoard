import { create } from 'zustand';

export interface CapturedFrame {
  id: string;
  dataUrl: string;
  timestamp: number;
  changePercent?: number;
}

export interface MonitorSettings {
  interval: number;           // 截圖間隔（秒）
  changeThreshold: number;    // 變化閾值（0-100%）
  monitorIndex: number;       // 監控的螢幕索引（-1 = 全部）
  maxFrames: number;          // 最大保存幀數
  addTimestamp: boolean;      // 是否加時間戳浮水印
}

interface MonitorState {
  // 狀態
  isMonitoring: boolean;
  frames: CapturedFrame[];
  lastFrameDataUrl: string | null;
  startTime: number | null;

  // 設定
  settings: MonitorSettings;

  // 動作
  startMonitoring: () => void;
  stopMonitoring: () => void;
  addFrame: (frame: CapturedFrame) => void;
  clearFrames: () => void;
  removeFrame: (id: string) => void;
  updateSettings: (settings: Partial<MonitorSettings>) => void;
  setLastFrame: (dataUrl: string) => void;
}

const DEFAULT_SETTINGS: MonitorSettings = {
  interval: 2,
  changeThreshold: 5,
  monitorIndex: -1,
  maxFrames: 100,
  addTimestamp: true,
};

export const useMonitorStore = create<MonitorState>((set, get) => ({
  isMonitoring: false,
  frames: [],
  lastFrameDataUrl: null,
  startTime: null,
  settings: DEFAULT_SETTINGS,

  startMonitoring: () => {
    set({
      isMonitoring: true,
      startTime: Date.now(),
      frames: [],
      lastFrameDataUrl: null,
    });
  },

  stopMonitoring: () => {
    set({ isMonitoring: false });
  },

  addFrame: (frame) => {
    const { frames, settings } = get();
    let newFrames = [...frames, frame];

    // 超過最大幀數，刪除最舊的
    if (newFrames.length > settings.maxFrames) {
      newFrames = newFrames.slice(-settings.maxFrames);
    }

    set({ frames: newFrames, lastFrameDataUrl: frame.dataUrl });
  },

  clearFrames: () => {
    set({ frames: [], lastFrameDataUrl: null });
  },

  removeFrame: (id) => {
    set((state) => ({
      frames: state.frames.filter((f) => f.id !== id),
    }));
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  setLastFrame: (dataUrl) => {
    set({ lastFrameDataUrl: dataUrl });
  },
}));
