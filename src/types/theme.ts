/**
 * 簡報主題系統類型定義
 * @module types/theme
 * @description 主題相關類型的集中導出，便於獨立引用
 */

// 從 slide.ts 重新導出主題相關類型
export type {
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  SlideTheme,
  LayoutType,
} from './slide';

// 主題相關常量
export { DEFAULT_THEME_ID } from './slide';

/**
 * 主題 ID 類型（內建主題）
 */
export type BuiltinThemeId = 'default' | 'dark' | 'minimal' | 'gradient';

/**
 * 主題模式
 */
export type ThemeMode = 'light' | 'dark';

/**
 * 主題預覽資訊
 */
export interface ThemePreview {
  /** 主題 ID */
  id: string;
  /** 主題名稱 */
  name: string;
  /** 主題描述 */
  description: string;
  /** 是否為深色主題 */
  isDark: boolean;
  /** 預覽顏色 */
  previewColors: {
    primary: string;
    background: string;
    text: string;
  };
}

/**
 * CSS 變數前綴
 */
export const CSS_VAR_PREFIX = '--slide-' as const;

/**
 * CSS 變數名稱映射
 */
export const CSS_VAR_NAMES = {
  // 顏色
  colorPrimary: 'color-primary',
  colorSecondary: 'color-secondary',
  colorAccent: 'color-accent',
  colorBackground: 'color-background',
  colorBackgroundSecondary: 'color-background-secondary',
  colorText: 'color-text',
  colorTextSecondary: 'color-text-secondary',
  colorTextMuted: 'color-text-muted',
  colorSuccess: 'color-success',
  colorWarning: 'color-warning',
  colorError: 'color-error',
  colorInfo: 'color-info',
  colorCodeBackground: 'color-code-background',
  colorCodeForeground: 'color-code-foreground',

  // 字體
  fontHeading: 'font-heading',
  fontBody: 'font-body',
  fontMono: 'font-mono',

  // 字體大小
  fontSizeH1: 'font-size-h1',
  fontSizeH2: 'font-size-h2',
  fontSizeH3: 'font-size-h3',
  fontSizeBody: 'font-size-body',
  fontSizeSmall: 'font-size-small',
  fontSizeCode: 'font-size-code',

  // 字體粗細
  fontWeightNormal: 'font-weight-normal',
  fontWeightMedium: 'font-weight-medium',
  fontWeightBold: 'font-weight-bold',

  // 行高
  lineHeightTight: 'line-height-tight',
  lineHeightNormal: 'line-height-normal',
  lineHeightRelaxed: 'line-height-relaxed',

  // 間距
  padding: 'padding',
  contentGap: 'content-gap',
  sectionGap: 'section-gap',
} as const;

/**
 * CSS 變數完整名稱類型
 */
export type CSSVarName = typeof CSS_VAR_NAMES[keyof typeof CSS_VAR_NAMES];
