/**
 * 主題解析與套用工具
 * @module utils/themeResolver
 * @description 提供主題解析、套用、生成 CSS 變數等功能
 */

import type {
  SlideTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  LayoutType,
} from '../types/slide';
import type { BuiltinThemeId, ThemePreview } from '../types/theme';
import { CSS_VAR_PREFIX } from '../types/theme';

// ============================================================================
// 內建主題定義
// ============================================================================

/**
 * 預設亮色主題
 */
const defaultTheme: SlideTheme = {
  id: 'default',
  name: 'Default',
  description: 'Clean and professional light theme',
  isDark: false,
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    accent: '#8b5cf6',
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    text: '#1f2937',
    textSecondary: '#4b5563',
    textMuted: '#9ca3af',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    codeBackground: '#f1f5f9',
    codeForeground: '#1e293b',
  },
  typography: {
    fontFamily: {
      heading: '"Inter", "Noto Sans TC", sans-serif',
      body: '"Inter", "Noto Sans TC", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontSize: {
      h1: '3rem',
      h2: '2.25rem',
      h3: '1.5rem',
      body: '1.125rem',
      small: '0.875rem',
      code: '0.9rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    slidePadding: '4rem',
    contentGap: '1.5rem',
    sectionGap: '3rem',
  },
};

/**
 * 深色主題
 */
const darkTheme: SlideTheme = {
  id: 'dark',
  name: 'Dark',
  description: 'Elegant dark theme for low-light presentations',
  isDark: true,
  colors: {
    primary: '#60a5fa',
    secondary: '#818cf8',
    accent: '#a78bfa',
    background: '#1a1a2e',
    backgroundSecondary: '#16213e',
    text: '#e5e7eb',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    codeBackground: '#0f172a',
    codeForeground: '#e2e8f0',
  },
  typography: {
    fontFamily: {
      heading: '"Inter", "Noto Sans TC", sans-serif',
      body: '"Inter", "Noto Sans TC", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontSize: {
      h1: '3rem',
      h2: '2.25rem',
      h3: '1.5rem',
      body: '1.125rem',
      small: '0.875rem',
      code: '0.9rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    slidePadding: '4rem',
    contentGap: '1.5rem',
    sectionGap: '3rem',
  },
};

/**
 * 極簡主題
 */
const minimalTheme: SlideTheme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean black and white minimalist theme',
  isDark: false,
  colors: {
    primary: '#000000',
    secondary: '#333333',
    accent: '#666666',
    background: '#ffffff',
    backgroundSecondary: '#fafafa',
    text: '#000000',
    textSecondary: '#333333',
    textMuted: '#666666',
    success: '#000000',
    warning: '#000000',
    error: '#000000',
    info: '#000000',
    codeBackground: '#f5f5f5',
    codeForeground: '#000000',
  },
  typography: {
    fontFamily: {
      heading: '"Helvetica Neue", Arial, sans-serif',
      body: '"Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", "Monaco", monospace',
    },
    fontSize: {
      h1: '3.5rem',
      h2: '2.5rem',
      h3: '1.75rem',
      body: '1.25rem',
      small: '1rem',
      code: '1rem',
    },
    fontWeight: {
      normal: 300,
      medium: 400,
      bold: 600,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.6,
      relaxed: 1.8,
    },
  },
  spacing: {
    slidePadding: '5rem',
    contentGap: '2rem',
    sectionGap: '4rem',
  },
  customCSS: `
    /* Minimal theme specific styles */
    .slide h1, .slide h2, .slide h3 {
      letter-spacing: -0.02em;
    }
    .slide ul, .slide ol {
      list-style: none;
    }
    .slide li::before {
      content: "\\2014";
      margin-right: 0.5em;
      color: var(--slide-color-text-muted);
    }
  `,
};

/**
 * 漸層主題
 */
const gradientTheme: SlideTheme = {
  id: 'gradient',
  name: 'Gradient',
  description: 'Vibrant gradient background theme',
  isDark: true,
  colors: {
    primary: '#f472b6',
    secondary: '#c084fc',
    accent: '#38bdf8',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f472b6 100%)',
    backgroundSecondary: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 50%, #ec4899 100%)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.85)',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#fb7185',
    info: '#38bdf8',
    codeBackground: 'rgba(0, 0, 0, 0.3)',
    codeForeground: '#f8fafc',
  },
  typography: {
    fontFamily: {
      heading: '"Poppins", "Noto Sans TC", sans-serif',
      body: '"Poppins", "Noto Sans TC", sans-serif',
      mono: '"Fira Code", monospace',
    },
    fontSize: {
      h1: '3.5rem',
      h2: '2.5rem',
      h3: '1.75rem',
      body: '1.25rem',
      small: '1rem',
      code: '0.95rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    slidePadding: '4rem',
    contentGap: '1.5rem',
    sectionGap: '3rem',
  },
  customCSS: `
    /* Gradient theme specific styles */
    .slide {
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .slide h1, .slide h2 {
      text-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    .slide code {
      backdrop-filter: blur(8px);
    }
  `,
};

// ============================================================================
// 內建主題物件
// ============================================================================

/**
 * 所有內建主題
 */
export const builtinThemes: Record<BuiltinThemeId, SlideTheme> = {
  default: defaultTheme,
  dark: darkTheme,
  minimal: minimalTheme,
  gradient: gradientTheme,
};

// ============================================================================
// 主題解析函數
// ============================================================================

/**
 * 解析主題名稱並返回主題物件
 * @param themeId - 主題 ID
 * @returns 主題物件，如果找不到則返回預設主題
 */
export function resolveTheme(themeId: string): SlideTheme {
  // 檢查是否為內建主題
  if (themeId in builtinThemes) {
    return builtinThemes[themeId as BuiltinThemeId];
  }

  // 如果找不到，返回預設主題並發出警告
  console.warn(`Theme "${themeId}" not found, falling back to default theme`);
  return builtinThemes.default;
}

/**
 * 獲取所有可用主題
 * @returns 主題陣列
 */
export function getAvailableThemes(): SlideTheme[] {
  return Object.values(builtinThemes);
}

/**
 * 獲取主題預覽資訊列表
 * @returns 主題預覽資訊陣列
 */
export function getThemePreviews(): ThemePreview[] {
  return Object.values(builtinThemes).map((theme) => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    isDark: theme.isDark ?? false,
    previewColors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      text: theme.colors.text,
    },
  }));
}

// ============================================================================
// CSS 變數生成函數
// ============================================================================

/**
 * 生成顏色 CSS 變數
 */
function generateColorVars(colors: ThemeColors): string {
  return `
  ${CSS_VAR_PREFIX}color-primary: ${colors.primary};
  ${CSS_VAR_PREFIX}color-secondary: ${colors.secondary};
  ${CSS_VAR_PREFIX}color-accent: ${colors.accent};
  ${CSS_VAR_PREFIX}color-background: ${colors.background};
  ${CSS_VAR_PREFIX}color-background-secondary: ${colors.backgroundSecondary};
  ${CSS_VAR_PREFIX}color-text: ${colors.text};
  ${CSS_VAR_PREFIX}color-text-secondary: ${colors.textSecondary};
  ${CSS_VAR_PREFIX}color-text-muted: ${colors.textMuted};
  ${CSS_VAR_PREFIX}color-success: ${colors.success};
  ${CSS_VAR_PREFIX}color-warning: ${colors.warning};
  ${CSS_VAR_PREFIX}color-error: ${colors.error};
  ${CSS_VAR_PREFIX}color-info: ${colors.info};
  ${CSS_VAR_PREFIX}color-code-background: ${colors.codeBackground};
  ${CSS_VAR_PREFIX}color-code-foreground: ${colors.codeForeground};`;
}

/**
 * 生成字體 CSS 變數
 */
function generateTypographyVars(typography: ThemeTypography): string {
  return `
  ${CSS_VAR_PREFIX}font-heading: ${typography.fontFamily.heading};
  ${CSS_VAR_PREFIX}font-body: ${typography.fontFamily.body};
  ${CSS_VAR_PREFIX}font-mono: ${typography.fontFamily.mono};
  ${CSS_VAR_PREFIX}font-size-h1: ${typography.fontSize.h1};
  ${CSS_VAR_PREFIX}font-size-h2: ${typography.fontSize.h2};
  ${CSS_VAR_PREFIX}font-size-h3: ${typography.fontSize.h3};
  ${CSS_VAR_PREFIX}font-size-body: ${typography.fontSize.body};
  ${CSS_VAR_PREFIX}font-size-small: ${typography.fontSize.small};
  ${CSS_VAR_PREFIX}font-size-code: ${typography.fontSize.code};
  ${CSS_VAR_PREFIX}font-weight-normal: ${typography.fontWeight.normal};
  ${CSS_VAR_PREFIX}font-weight-medium: ${typography.fontWeight.medium};
  ${CSS_VAR_PREFIX}font-weight-bold: ${typography.fontWeight.bold};
  ${CSS_VAR_PREFIX}line-height-tight: ${typography.lineHeight.tight};
  ${CSS_VAR_PREFIX}line-height-normal: ${typography.lineHeight.normal};
  ${CSS_VAR_PREFIX}line-height-relaxed: ${typography.lineHeight.relaxed};`;
}

/**
 * 生成間距 CSS 變數
 */
function generateSpacingVars(spacing: ThemeSpacing): string {
  return `
  ${CSS_VAR_PREFIX}padding: ${spacing.slidePadding};
  ${CSS_VAR_PREFIX}content-gap: ${spacing.contentGap};
  ${CSS_VAR_PREFIX}section-gap: ${spacing.sectionGap};`;
}

/**
 * 生成完整的主題 CSS 變數字串
 * @param theme - 主題物件
 * @returns CSS 變數字串
 */
export function generateThemeCSS(theme: SlideTheme): string {
  const colorVars = generateColorVars(theme.colors);
  const typographyVars = generateTypographyVars(theme.typography);
  const spacingVars = generateSpacingVars(theme.spacing);

  let css = `
:root {
  /* Theme: ${theme.name} */
  /* ${theme.description} */
  ${colorVars}
  ${typographyVars}
  ${spacingVars}
}`;

  // 添加自定義 CSS
  if (theme.customCSS) {
    css += `\n\n/* Custom Theme Styles */\n${theme.customCSS}`;
  }

  return css;
}

/**
 * 生成用於 style 屬性的 CSS 變數物件
 * @param theme - 主題物件
 * @returns CSS 變數物件
 */
export function generateThemeStyleObject(theme: SlideTheme): Record<string, string> {
  const vars: Record<string, string> = {};

  // 顏色
  vars[`${CSS_VAR_PREFIX}color-primary`] = theme.colors.primary;
  vars[`${CSS_VAR_PREFIX}color-secondary`] = theme.colors.secondary;
  vars[`${CSS_VAR_PREFIX}color-accent`] = theme.colors.accent;
  vars[`${CSS_VAR_PREFIX}color-background`] = theme.colors.background;
  vars[`${CSS_VAR_PREFIX}color-background-secondary`] = theme.colors.backgroundSecondary;
  vars[`${CSS_VAR_PREFIX}color-text`] = theme.colors.text;
  vars[`${CSS_VAR_PREFIX}color-text-secondary`] = theme.colors.textSecondary;
  vars[`${CSS_VAR_PREFIX}color-text-muted`] = theme.colors.textMuted;
  vars[`${CSS_VAR_PREFIX}color-success`] = theme.colors.success;
  vars[`${CSS_VAR_PREFIX}color-warning`] = theme.colors.warning;
  vars[`${CSS_VAR_PREFIX}color-error`] = theme.colors.error;
  vars[`${CSS_VAR_PREFIX}color-info`] = theme.colors.info;
  vars[`${CSS_VAR_PREFIX}color-code-background`] = theme.colors.codeBackground;
  vars[`${CSS_VAR_PREFIX}color-code-foreground`] = theme.colors.codeForeground;

  // 字體
  vars[`${CSS_VAR_PREFIX}font-heading`] = theme.typography.fontFamily.heading;
  vars[`${CSS_VAR_PREFIX}font-body`] = theme.typography.fontFamily.body;
  vars[`${CSS_VAR_PREFIX}font-mono`] = theme.typography.fontFamily.mono;
  vars[`${CSS_VAR_PREFIX}font-size-h1`] = theme.typography.fontSize.h1;
  vars[`${CSS_VAR_PREFIX}font-size-h2`] = theme.typography.fontSize.h2;
  vars[`${CSS_VAR_PREFIX}font-size-h3`] = theme.typography.fontSize.h3;
  vars[`${CSS_VAR_PREFIX}font-size-body`] = theme.typography.fontSize.body;
  vars[`${CSS_VAR_PREFIX}font-size-small`] = theme.typography.fontSize.small;
  vars[`${CSS_VAR_PREFIX}font-size-code`] = theme.typography.fontSize.code;
  vars[`${CSS_VAR_PREFIX}font-weight-normal`] = String(theme.typography.fontWeight.normal);
  vars[`${CSS_VAR_PREFIX}font-weight-medium`] = String(theme.typography.fontWeight.medium);
  vars[`${CSS_VAR_PREFIX}font-weight-bold`] = String(theme.typography.fontWeight.bold);
  vars[`${CSS_VAR_PREFIX}line-height-tight`] = String(theme.typography.lineHeight.tight);
  vars[`${CSS_VAR_PREFIX}line-height-normal`] = String(theme.typography.lineHeight.normal);
  vars[`${CSS_VAR_PREFIX}line-height-relaxed`] = String(theme.typography.lineHeight.relaxed);

  // 間距
  vars[`${CSS_VAR_PREFIX}padding`] = theme.spacing.slidePadding;
  vars[`${CSS_VAR_PREFIX}content-gap`] = theme.spacing.contentGap;
  vars[`${CSS_VAR_PREFIX}section-gap`] = theme.spacing.sectionGap;

  return vars;
}

// ============================================================================
// 主題套用函數
// ============================================================================

/**
 * 將主題 CSS 變數套用到指定的 HTML 元素
 * @param theme - 主題物件
 * @param element - 目標 HTML 元素
 */
export function applyTheme(theme: SlideTheme, element: HTMLElement): void {
  const vars = generateThemeStyleObject(theme);

  Object.entries(vars).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });

  // 設定 data-theme 屬性
  element.dataset.theme = theme.id;
  element.dataset.themeMode = theme.isDark ? 'dark' : 'light';
}

/**
 * 將主題套用到 document root
 * @param theme - 主題物件
 */
export function applyThemeToRoot(theme: SlideTheme): void {
  applyTheme(theme, document.documentElement);
}

/**
 * 移除元素上的主題 CSS 變數
 * @param element - 目標 HTML 元素
 */
export function removeTheme(element: HTMLElement): void {
  const vars = generateThemeStyleObject(builtinThemes.default);

  Object.keys(vars).forEach((key) => {
    element.style.removeProperty(key);
  });

  delete element.dataset.theme;
  delete element.dataset.themeMode;
}

// ============================================================================
// 佈局樣式生成
// ============================================================================

/**
 * 獲取佈局的預設樣式
 * @param layout - 佈局類型
 * @returns CSS 樣式物件
 */
export function getLayoutStyles(layout: LayoutType): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--slide-padding)',
    gap: 'var(--slide-content-gap)',
  };

  const layoutStyles: Record<LayoutType, React.CSSProperties> = {
    default: {
      ...baseStyles,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    center: {
      ...baseStyles,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
    cover: {
      ...baseStyles,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 0,
    },
    section: {
      ...baseStyles,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
    'two-cols': {
      ...baseStyles,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    'image-right': {
      ...baseStyles,
      flexDirection: 'row',
      alignItems: 'center',
    },
    'image-left': {
      ...baseStyles,
      flexDirection: 'row-reverse',
      alignItems: 'center',
    },
    image: {
      ...baseStyles,
      padding: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quote: {
      ...baseStyles,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontStyle: 'italic',
    },
    fact: {
      ...baseStyles,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
    end: {
      ...baseStyles,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
  };

  return layoutStyles[layout] || layoutStyles.default;
}

/**
 * 合併主題佈局覆蓋樣式
 * @param theme - 主題物件
 * @param layout - 佈局類型
 * @returns 合併後的 CSS 樣式物件
 */
export function getMergedLayoutStyles(
  theme: SlideTheme,
  layout: LayoutType
): React.CSSProperties {
  const baseStyles = getLayoutStyles(layout);
  const themeOverrides = theme.layouts?.[layout] || {};

  return {
    ...baseStyles,
    ...themeOverrides,
  };
}

// ============================================================================
// 主題輔助函數
// ============================================================================

/**
 * 檢查主題 ID 是否有效
 * @param themeId - 主題 ID
 * @returns 是否為有效的內建主題
 */
export function isValidThemeId(themeId: string): themeId is BuiltinThemeId {
  return themeId in builtinThemes;
}

/**
 * 根據背景色自動判斷是否為深色主題
 * @param backgroundColor - 背景顏色
 * @returns 是否為深色背景
 */
export function isDarkBackground(backgroundColor: string): boolean {
  // 處理漸層背景
  if (backgroundColor.includes('gradient')) {
    return true; // 漸層主題通常使用深色文字
  }

  // 嘗試解析十六進位顏色
  const hex = backgroundColor.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 使用相對亮度公式
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  return false;
}

/**
 * 創建自定義主題（基於現有主題修改）
 * @param baseThemeId - 基礎主題 ID
 * @param overrides - 覆蓋的屬性
 * @returns 新的主題物件
 */
export function createCustomTheme(
  baseThemeId: BuiltinThemeId,
  overrides: Partial<SlideTheme>
): SlideTheme {
  const baseTheme = builtinThemes[baseThemeId];

  return {
    ...baseTheme,
    ...overrides,
    id: overrides.id || `${baseTheme.id}-custom`,
    colors: {
      ...baseTheme.colors,
      ...overrides.colors,
    },
    typography: {
      ...baseTheme.typography,
      ...overrides.typography,
      fontFamily: {
        ...baseTheme.typography.fontFamily,
        ...overrides.typography?.fontFamily,
      },
      fontSize: {
        ...baseTheme.typography.fontSize,
        ...overrides.typography?.fontSize,
      },
      fontWeight: {
        ...baseTheme.typography.fontWeight,
        ...overrides.typography?.fontWeight,
      },
      lineHeight: {
        ...baseTheme.typography.lineHeight,
        ...overrides.typography?.lineHeight,
      },
    },
    spacing: {
      ...baseTheme.spacing,
      ...overrides.spacing,
    },
  };
}

// ============================================================================
// 導出預設主題
// ============================================================================

export { defaultTheme, darkTheme, minimalTheme, gradientTheme };
