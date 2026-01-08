/**
 * 導出模組 Store
 * Zustand store for managing export configurations, progress, and history
 * @module stores/exportStore
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import type {
  ExportConfig,
  ExportFormat,
  ExportTheme,
  ExportProgress,
  ExportResult,
  ExportHistoryEntry,
  ExportPreset,
  ThemeVariables,
  HTMLSingleExportConfig,
  HTMLSiteExportConfig,
  PDFExportConfig,
  SlidesExportConfig,
} from '../types/export';
import {
  DEFAULT_HTML_SINGLE_CONFIG,
  DEFAULT_PDF_CONFIG,
} from '../types/export';

// ============================================================================
// ID 生成與時間工具
// ============================================================================

const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const now = () => new Date().toISOString();

// ============================================================================
// 預設主題
// ============================================================================

const defaultThemeVariables: ThemeVariables = {
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '16px',
  lineHeight: '1.6',
  codeFont: 'JetBrains Mono, monospace',
  borderRadius: '4px',
};

const builtInThemes: ExportTheme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and modern default theme',
    previewImage: '/themes/default-preview.png',
    cssPath: '/themes/default.css',
    variables: { ...defaultThemeVariables },
    isDark: false,
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Dark theme for comfortable reading',
    previewImage: '/themes/dark-preview.png',
    cssPath: '/themes/dark.css',
    variables: {
      ...defaultThemeVariables,
      backgroundColor: '#1e293b',
      textColor: '#e2e8f0',
      primaryColor: '#60a5fa',
    },
    isDark: true,
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Formal academic paper style',
    previewImage: '/themes/academic-preview.png',
    cssPath: '/themes/academic.css',
    variables: {
      ...defaultThemeVariables,
      fontFamily: 'Georgia, Times New Roman, serif',
      lineHeight: '1.8',
    },
    isDark: false,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and distraction-free',
    previewImage: '/themes/minimal-preview.png',
    cssPath: '/themes/minimal.css',
    variables: {
      ...defaultThemeVariables,
      primaryColor: '#000000',
    },
    isDark: false,
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional business style',
    previewImage: '/themes/corporate-preview.png',
    cssPath: '/themes/corporate.css',
    variables: {
      ...defaultThemeVariables,
      primaryColor: '#1e40af',
      fontFamily: 'Arial, Helvetica, sans-serif',
    },
    isDark: false,
  },
];

// ============================================================================
// 預設配置
// ============================================================================

const defaultProgress: ExportProgress = {
  status: 'idle',
  currentStep: '',
  percentage: 0,
  processedItems: 0,
  totalItems: 0,
  warnings: [],
  errors: [],
};

// ============================================================================
// Store 狀態與 Actions 介面
// ============================================================================

interface ExportStoreState {
  /** 當前導出配置 */
  config: ExportConfig | null;

  /** 選擇的格式 */
  selectedFormat: ExportFormat | null;

  /** 是否正在導出 */
  isExporting: boolean;

  /** 導出進度 */
  progress: ExportProgress;

  /** 最後導出結果 */
  lastResult: ExportResult | null;

  /** 可用主題列表 */
  availableThemes: ExportTheme[];

  /** 自訂主題列表 */
  customThemes: ExportTheme[];

  /** 導出歷史 */
  history: ExportHistoryEntry[];

  /** 預設配置列表 */
  presets: ExportPreset[];

  /** 預覽 HTML */
  previewHtml: string | null;

  /** 是否顯示預覽 */
  showPreview: boolean;

  /** 對話框步驟 */
  dialogStep: 'format' | 'options' | 'preview' | 'exporting' | 'complete';

  /** 輸出路徑 */
  outputPath: string;

  /** 是否顯示對話框 */
  isDialogOpen: boolean;

  /** 取消控制器 */
  abortController: AbortController | null;
}

interface ExportStoreActions {
  // ===== 配置管理 =====
  /** 設定導出格式 */
  setFormat: (format: ExportFormat) => void;

  /** 設定完整配置 */
  setConfig: (config: ExportConfig) => void;

  /** 更新配置 */
  updateConfig: <T extends ExportConfig>(updates: Partial<T>) => void;

  /** 設定輸出路徑 */
  setOutputPath: (path: string) => void;

  /** 重設配置 */
  resetConfig: () => void;

  /** 建立預設的格式配置 */
  createDefaultConfig: (format: ExportFormat) => ExportConfig;

  // ===== 主題管理 =====
  /** 設定主題 */
  setTheme: (themeId: string) => void;

  /** 新增自訂主題 */
  addCustomTheme: (theme: ExportTheme) => void;

  /** 移除自訂主題 */
  removeCustomTheme: (themeId: string) => void;

  /** 取得主題 by ID */
  getThemeById: (id: string) => ExportTheme | undefined;

  // ===== 預設管理 =====
  /** 儲存當前配置為預設 */
  saveAsPreset: (name: string, description?: string) => string;

  /** 載入預設 */
  loadPreset: (presetId: string) => void;

  /** 刪除預設 */
  deletePreset: (presetId: string) => void;

  /** 更新預設 */
  updatePreset: (presetId: string, updates: Partial<ExportPreset>) => void;

  // ===== 導出執行 =====
  /** 開始導出 */
  startExport: () => Promise<ExportResult | null>;

  /** 取消導出 */
  cancelExport: () => void;

  /** 更新進度 */
  updateProgress: (progress: Partial<ExportProgress>) => void;

  /** 設定導出結果 */
  setResult: (result: ExportResult) => void;

  // ===== 預覽 =====
  /** 生成預覽 */
  generatePreview: () => Promise<string>;

  /** 設定預覽 HTML */
  setPreviewHtml: (html: string | null) => void;

  /** 切換預覽顯示 */
  togglePreview: () => void;

  // ===== 歷史管理 =====
  /** 新增歷史記錄 */
  addToHistory: (entry: Omit<ExportHistoryEntry, 'id'>) => void;

  /** 清除歷史 */
  clearHistory: () => void;

  /** 重新導出（從歷史） */
  reExport: (historyId: string) => void;

  // ===== 對話框控制 =====
  /** 開啟對話框 */
  openDialog: () => void;

  /** 關閉對話框 */
  closeDialog: () => void;

  /** 設定對話框步驟 */
  setDialogStep: (step: ExportStoreState['dialogStep']) => void;

  /** 下一步 */
  nextStep: () => void;

  /** 上一步 */
  previousStep: () => void;

  // ===== 狀態管理 =====
  /** 重設 store */
  reset: () => void;
}

type ExportStore = ExportStoreState & ExportStoreActions;

// ============================================================================
// 初始狀態
// ============================================================================

const initialState: ExportStoreState = {
  config: null,
  selectedFormat: null,
  isExporting: false,
  progress: defaultProgress,
  lastResult: null,
  availableThemes: builtInThemes,
  customThemes: [],
  history: [],
  presets: [],
  previewHtml: null,
  showPreview: false,
  dialogStep: 'format',
  outputPath: '',
  isDialogOpen: false,
  abortController: null,
};

// ============================================================================
// Store 實作
// ============================================================================

export const useExportStore = create<ExportStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // ===== 配置管理 =====

        setFormat: (format) => {
          const config = get().createDefaultConfig(format);
          set({
            selectedFormat: format,
            config,
          });
        },

        setConfig: (config) => {
          set({ config, selectedFormat: config.format });
        },

        updateConfig: (updates) => {
          set((state) => {
            if (!state.config) return state;
            return {
              config: { ...state.config, ...updates } as ExportConfig,
            };
          });
        },

        setOutputPath: (path) => {
          set((state) => {
            if (!state.config) return { outputPath: path };
            return {
              outputPath: path,
              config: { ...state.config, outputPath: path },
            };
          });
        },

        resetConfig: () => {
          set({
            config: null,
            selectedFormat: null,
            previewHtml: null,
            showPreview: false,
          });
        },

        createDefaultConfig: (format) => {
          const theme = get().availableThemes[0];

          switch (format) {
            case 'html-single':
              return {
                ...DEFAULT_HTML_SINGLE_CONFIG,
                outputPath: get().outputPath,
                theme,
              } as HTMLSingleExportConfig;

            case 'html-site':
              return {
                format: 'html-site',
                outputPath: get().outputPath,
                theme,
                generateTOC: true,
                tocDepth: 3,
                imageQuality: 'medium',
                minify: true,
                includeBranding: true,
                siteTitle: 'My Documentation',
                baseUrl: '/',
                enableSearch: true,
                generateSitemap: true,
                generate404: true,
                navigation: {
                  type: 'auto',
                  showBreadcrumb: true,
                  showPrevNext: true,
                  sidebarPosition: 'left',
                  collapsibleSidebar: true,
                },
              } as HTMLSiteExportConfig;

            case 'pdf':
              return {
                ...DEFAULT_PDF_CONFIG,
                outputPath: get().outputPath,
                theme,
              } as PDFExportConfig;

            case 'slides':
              return {
                format: 'slides',
                outputPath: get().outputPath,
                theme,
                generateTOC: false,
                tocDepth: 2,
                imageQuality: 'high',
                minify: true,
                includeBranding: true,
                singleFile: true,
                engine: 'reveal',
                transition: 'slide',
                includeNotes: true,
                showControls: true,
                showProgress: true,
                touchNavigation: true,
                aspectRatio: '16:9',
                hashNavigation: true,
              } as SlidesExportConfig;

            default:
              throw new Error(`Unknown format: ${format}`);
          }
        },

        // ===== 主題管理 =====

        setTheme: (themeId) => {
          const theme = get().getThemeById(themeId);
          if (theme) {
            get().updateConfig({ theme });
          }
        },

        addCustomTheme: (theme) => {
          set((state) => ({
            customThemes: [...state.customThemes, theme],
            availableThemes: [...state.availableThemes, theme],
          }));
        },

        removeCustomTheme: (themeId) => {
          set((state) => ({
            customThemes: state.customThemes.filter((t) => t.id !== themeId),
            availableThemes: state.availableThemes.filter((t) => t.id !== themeId),
          }));
        },

        getThemeById: (id) => {
          const state = get();
          return state.availableThemes.find((t) => t.id === id);
        },

        // ===== 預設管理 =====

        saveAsPreset: (name, description) => {
          const state = get();
          if (!state.config) return '';

          const id = generateId('preset');
          const preset: ExportPreset = {
            id,
            name,
            description,
            config: state.config,
            createdAt: now(),
          };

          set((state) => ({
            presets: [...state.presets, preset],
          }));

          return id;
        },

        loadPreset: (presetId) => {
          const preset = get().presets.find((p) => p.id === presetId);
          if (preset && preset.config) {
            set({
              config: preset.config as ExportConfig,
              selectedFormat: (preset.config as ExportConfig).format,
            });
          }
        },

        deletePreset: (presetId) => {
          set((state) => ({
            presets: state.presets.filter((p) => p.id !== presetId),
          }));
        },

        updatePreset: (presetId, updates) => {
          set((state) => ({
            presets: state.presets.map((p) =>
              p.id === presetId ? { ...p, ...updates } : p
            ),
          }));
        },

        // ===== 導出執行 =====

        startExport: async () => {
          const state = get();
          if (!state.config) return null;

          const abortController = new AbortController();

          set({
            isExporting: true,
            abortController,
            dialogStep: 'exporting',
            progress: {
              ...defaultProgress,
              status: 'preparing',
              currentStep: 'Preparing export...',
              startTime: now(),
            },
          });

          try {
            // 模擬導出過程（實際應調用 Electron IPC）
            for (let i = 0; i <= 100; i += 10) {
              if (abortController.signal.aborted) {
                throw new Error('Export cancelled');
              }

              await new Promise((resolve) => setTimeout(resolve, 200));

              set((state) => ({
                progress: {
                  ...state.progress,
                  status: 'processing',
                  percentage: i,
                  currentStep: i < 50 ? 'Processing content...' : 'Generating output...',
                  processedItems: Math.floor(i / 10),
                  totalItems: 10,
                },
              }));
            }

            const result: ExportResult = {
              success: true,
              outputPath: state.config.outputPath,
              files: [
                { path: 'index.html', type: 'html', size: 15000 },
                { path: 'assets/style.css', type: 'css', size: 5000 },
              ],
              totalSize: 20000,
              duration: 2000,
              warnings: [],
              statistics: {
                pageCount: 1,
                imageCount: 0,
                whiteboardCount: 0,
                codeBlockCount: 0,
                originalSize: 25000,
                compressedSize: 20000,
              },
              exportedAt: now(),
            };

            set({
              isExporting: false,
              lastResult: result,
              dialogStep: 'complete',
              progress: {
                ...get().progress,
                status: 'completed',
                percentage: 100,
                currentStep: 'Export completed!',
              },
            });

            // 添加到歷史
            get().addToHistory({
              format: state.config.format,
              outputPath: state.config.outputPath,
              config: state.config,
              result,
              exportedAt: now(),
            });

            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isCancelled = errorMessage === 'Export cancelled';

            set({
              isExporting: false,
              progress: {
                ...get().progress,
                status: isCancelled ? 'cancelled' : 'error',
                errors: isCancelled ? [] : [errorMessage],
              },
            });

            return null;
          }
        },

        cancelExport: () => {
          const state = get();
          if (state.abortController) {
            state.abortController.abort();
          }

          set({
            isExporting: false,
            abortController: null,
            progress: {
              ...get().progress,
              status: 'cancelled',
              currentStep: 'Export cancelled',
            },
          });
        },

        updateProgress: (progress) => {
          set((state) => ({
            progress: { ...state.progress, ...progress },
          }));
        },

        setResult: (result) => {
          set({ lastResult: result });
        },

        // ===== 預覽 =====

        generatePreview: async () => {
          // 模擬預覽生成
          const previewHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Preview</title>
              <style>
                body { font-family: system-ui, sans-serif; padding: 2rem; }
                h1 { color: #1e293b; }
              </style>
            </head>
            <body>
              <h1>Preview Content</h1>
              <p>This is a preview of your exported content.</p>
            </body>
            </html>
          `;

          set({ previewHtml });
          return previewHtml;
        },

        setPreviewHtml: (html) => {
          set({ previewHtml: html });
        },

        togglePreview: () => {
          set((state) => ({ showPreview: !state.showPreview }));
        },

        // ===== 歷史管理 =====

        addToHistory: (entry) => {
          const id = generateId('history');
          set((state) => ({
            history: [{ ...entry, id }, ...state.history].slice(0, 20), // 保留最近 20 條
          }));
        },

        clearHistory: () => {
          set({ history: [] });
        },

        reExport: (historyId) => {
          const entry = get().history.find((h) => h.id === historyId);
          if (entry) {
            set({
              config: entry.config,
              selectedFormat: entry.format,
              outputPath: entry.outputPath,
            });
          }
        },

        // ===== 對話框控制 =====

        openDialog: () => {
          set({
            isDialogOpen: true,
            dialogStep: 'format',
            progress: defaultProgress,
            lastResult: null,
          });
        },

        closeDialog: () => {
          const state = get();
          if (state.isExporting) {
            get().cancelExport();
          }
          set({
            isDialogOpen: false,
            dialogStep: 'format',
          });
        },

        setDialogStep: (step) => {
          set({ dialogStep: step });
        },

        nextStep: () => {
          const steps: ExportStoreState['dialogStep'][] = [
            'format',
            'options',
            'preview',
            'exporting',
            'complete',
          ];
          const currentIndex = steps.indexOf(get().dialogStep);
          if (currentIndex < steps.length - 1) {
            set({ dialogStep: steps[currentIndex + 1] });
          }
        },

        previousStep: () => {
          const steps: ExportStoreState['dialogStep'][] = [
            'format',
            'options',
            'preview',
            'exporting',
            'complete',
          ];
          const currentIndex = steps.indexOf(get().dialogStep);
          if (currentIndex > 0) {
            set({ dialogStep: steps[currentIndex - 1] });
          }
        },

        // ===== 狀態管理 =====

        reset: () => {
          const state = get();
          if (state.abortController) {
            state.abortController.abort();
          }
          set({
            ...initialState,
            availableThemes: builtInThemes,
            // 保留持久化的數據
            customThemes: state.customThemes,
            presets: state.presets,
            history: state.history,
          });
        },
      }),
      {
        name: 'shotboard-export-store',
        partialize: (state) => ({
          customThemes: state.customThemes,
          presets: state.presets,
          history: state.history,
        }),
      }
    )
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectConfig = (state: ExportStore) => state.config;

export const selectIsExporting = (state: ExportStore) => state.isExporting;

export const selectProgress = (state: ExportStore) => state.progress;

export const selectAvailableThemes = (state: ExportStore) => state.availableThemes;

export const selectPresets = (state: ExportStore) => state.presets;

export const selectHistory = (state: ExportStore) => state.history;

export const selectDialogStep = (state: ExportStore) => state.dialogStep;

export const selectCanProceed = (state: ExportStore): boolean => {
  switch (state.dialogStep) {
    case 'format':
      return state.selectedFormat !== null;
    case 'options':
      return state.config !== null && state.outputPath !== '';
    case 'preview':
      return true;
    default:
      return false;
  }
};
