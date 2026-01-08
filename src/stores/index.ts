/**
 * Zustand Stores 統一導出
 * @module stores
 */

// 專案 Store
export { useProjectStore } from './projectStore';

// 筆記管理 Store
export {
  useNoteStore,
  selectActiveNote,
  selectAllTags,
  selectFilteredNotes,
  selectFileTree,
} from './noteStore';

// 簡報系統 Store
export {
  useSlideStore,
  selectCurrentSlide,
  selectIsPresenting,
  selectSlideCount,
  selectProgress as selectSlideProgress,
  selectAnnotation,
  selectTheme as selectSlideTheme,
} from './slideStore';

// 導出模組 Store
export {
  useExportStore,
  selectConfig,
  selectIsExporting,
  selectProgress as selectExportProgress,
  selectAvailableThemes,
  selectPresets,
  selectHistory,
  selectDialogStep,
  selectCanProceed,
} from './exportStore';
