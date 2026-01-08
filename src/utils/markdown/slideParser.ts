/**
 * Markdown 簡報解析器
 * @module utils/markdown/slideParser
 * @description 將 Markdown 轉換為投影片結構
 */

import matter from 'gray-matter';
import type {
  Presentation,
  PresentationMeta,
  Slide,
  SlideMeta,
  AnimatedElement,
  EmbeddedContent,
  AnimationType,
  LayoutType,
  TransitionType,
  AspectRatio,
  FontConfig,
  ParseOptions,
  ParseResult,
  DEFAULT_PRESENTATION_META,
  DEFAULT_SLIDE_META,
  DEFAULT_ANIMATION_DURATION,
} from '../../types/slide';

// ============================================================================
// 常量
// ============================================================================

/** 投影片分隔符號 */
const SLIDE_SEPARATOR = /^---$/m;

/** v-clicks 標籤正則 */
const V_CLICKS_REGEX = /<v-clicks(?:\s+[^>]*)?>([\s\S]*?)<\/v-clicks>/gi;

/** v-click 標籤正則 */
const V_CLICK_REGEX = /<v-click(?:\s+animation="([^"]+)")?(?:\s+delay="(\d+)")?(?:\s+duration="(\d+)")?[^>]*>([\s\S]*?)<\/v-click>/gi;

/** 白板嵌入正則 */
const WHITEBOARD_EMBED_REGEX = /::whiteboard\{([^}]*)\}/g;

/** 圖片嵌入正則 */
const IMAGE_EMBED_REGEX = /!\[([^\]]*)\]\(([^)]+)\)(?:\{([^}]*)\})?/g;

/** 影片嵌入正則 */
const VIDEO_EMBED_REGEX = /::video\{([^}]*)\}/g;

/** 程式碼區塊正則 */
const CODE_BLOCK_REGEX = /```(\w+)?(?:\s+\{([^}]*)\})?\n([\s\S]*?)```/g;

/** 講者筆記正則 (HTML 註解格式) */
const SPEAKER_NOTES_REGEX = /<!--\s*notes?\s*:\s*([\s\S]*?)-->/gi;

/** 投影片 metadata 正則 (YAML-like header) */
const SLIDE_META_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

/** 屬性解析正則 */
const PROPS_REGEX = /(\w+)(?:=["']([^"']+)["']|=(\S+))?/g;

// ============================================================================
// 輔助函數
// ============================================================================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 解析屬性字串
 * @param propsString - 屬性字串，例如 'id="wb1" width="800"'
 */
function parseProps(propsString: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  let match: RegExpExecArray | null;

  while ((match = PROPS_REGEX.exec(propsString)) !== null) {
    const key = match[1];
    const value = match[2] || match[3] || true;

    // 嘗試解析數字
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      props[key] = parseInt(value, 10);
    } else if (typeof value === 'string' && /^\d+\.\d+$/.test(value)) {
      props[key] = parseFloat(value);
    } else if (value === 'true') {
      props[key] = true;
    } else if (value === 'false') {
      props[key] = false;
    } else {
      props[key] = value;
    }
  }

  return props;
}

/**
 * 驗證佈局類型
 */
function isValidLayout(layout: string): layout is LayoutType {
  const validLayouts: LayoutType[] = [
    'default', 'center', 'cover', 'section', 'two-cols',
    'image-right', 'image-left', 'image', 'quote', 'fact', 'end'
  ];
  return validLayouts.includes(layout as LayoutType);
}

/**
 * 驗證轉場類型
 */
function isValidTransition(transition: string): transition is TransitionType {
  const validTransitions: TransitionType[] = [
    'none', 'slide', 'slide-up', 'fade', 'zoom', 'flip'
  ];
  return validTransitions.includes(transition as TransitionType);
}

/**
 * 驗證動畫類型
 */
function isValidAnimation(animation: string): animation is AnimationType {
  const validAnimations: AnimationType[] = [
    'fade-in', 'fade-out', 'slide-up', 'slide-down',
    'slide-left', 'slide-right', 'zoom-in', 'bounce'
  ];
  return validAnimations.includes(animation as AnimationType);
}

/**
 * 驗證投影片比例
 */
function isValidAspectRatio(ratio: string): ratio is AspectRatio {
  const validRatios: AspectRatio[] = ['16/9', '4/3', '1/1', '21/9'];
  return validRatios.includes(ratio as AspectRatio);
}

// ============================================================================
// Front Matter 解析
// ============================================================================

/**
 * 解析 Front Matter 為 PresentationMeta
 */
export function parseFrontMatter(content: string): {
  meta: PresentationMeta;
  content: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  try {
    const { data, content: bodyContent } = matter(content);

    // 構建 PresentationMeta，使用預設值填補缺失欄位
    const meta: PresentationMeta = {
      title: typeof data.title === 'string' ? data.title : 'Untitled Presentation',
      theme: typeof data.theme === 'string' ? data.theme : 'default',
      author: typeof data.author === 'string' ? data.author : '',
      date: typeof data.date === 'string'
        ? data.date
        : data.date instanceof Date
          ? data.date.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      aspectRatio: isValidAspectRatio(data.aspectRatio) ? data.aspectRatio : '16/9',
      transition: isValidTransition(data.transition) ? data.transition : 'slide',
      highlightTheme: typeof data.highlightTheme === 'string' ? data.highlightTheme : 'dracula',
      fonts: parseFontConfig(data.fonts),
      description: typeof data.description === 'string' ? data.description : undefined,
      keywords: Array.isArray(data.keywords) ? data.keywords : undefined,
    };

    // 檢查未知欄位
    const knownFields = [
      'title', 'theme', 'author', 'date', 'aspectRatio', 'transition',
      'highlightTheme', 'fonts', 'description', 'keywords'
    ];
    Object.keys(data).forEach(key => {
      if (!knownFields.includes(key)) {
        warnings.push(`Unknown front matter field: "${key}"`);
      }
    });

    return { meta, content: bodyContent, warnings };
  } catch (error) {
    warnings.push(`Failed to parse front matter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      meta: { ...getDefaultPresentationMeta() },
      content,
      warnings,
    };
  }
}

/**
 * 解析字體配置
 */
function parseFontConfig(fonts: unknown): FontConfig {
  if (!fonts || typeof fonts !== 'object') {
    return {};
  }

  const fontData = fonts as Record<string, unknown>;
  return {
    sans: typeof fontData.sans === 'string' ? fontData.sans : undefined,
    serif: typeof fontData.serif === 'string' ? fontData.serif : undefined,
    mono: typeof fontData.mono === 'string' ? fontData.mono : undefined,
    heading: typeof fontData.heading === 'string' ? fontData.heading : undefined,
    weights: typeof fontData.weights === 'string' ? fontData.weights : undefined,
  };
}

/**
 * 取得預設 PresentationMeta
 */
function getDefaultPresentationMeta(): PresentationMeta {
  return {
    title: 'Untitled Presentation',
    theme: 'default',
    author: '',
    date: new Date().toISOString().split('T')[0],
    aspectRatio: '16/9',
    transition: 'slide',
    highlightTheme: 'dracula',
    fonts: {},
  };
}

/**
 * 取得預設 SlideMeta
 */
function getDefaultSlideMeta(): SlideMeta {
  return {
    layout: 'default',
    clicks: 0,
  };
}

// ============================================================================
// 投影片 Metadata 解析
// ============================================================================

/**
 * 從投影片內容解析 metadata
 */
export function parseSlideMeta(content: string): {
  meta: SlideMeta;
  content: string;
} {
  const meta: SlideMeta = { ...getDefaultSlideMeta() };
  let processedContent = content.trim();

  // 嘗試解析投影片開頭的 metadata 區塊
  const metaMatch = processedContent.match(SLIDE_META_REGEX);
  if (metaMatch) {
    const metaContent = metaMatch[1];
    processedContent = processedContent.slice(metaMatch[0].length);

    // 簡單的 YAML-like 解析
    const lines = metaContent.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        switch (key) {
          case 'layout':
            if (isValidLayout(value)) {
              meta.layout = value;
            }
            break;
          case 'background':
            meta.background = value;
            break;
          case 'class':
            meta.class = value;
            break;
          case 'transition':
            if (isValidTransition(value)) {
              meta.transition = value;
            }
            break;
          case 'notes':
            meta.notes = value;
            break;
          case 'clicks':
            const clicks = parseInt(value, 10);
            if (!isNaN(clicks)) {
              meta.clicks = clicks;
            }
            break;
          case 'hidePageNumber':
            meta.hidePageNumber = value === 'true';
            break;
        }
      }
    }
  }

  // 也從 HTML 註解中提取講者筆記
  const notesFromComments = extractSpeakerNotes(processedContent);
  if (notesFromComments && !meta.notes) {
    meta.notes = notesFromComments;
  }

  return { meta, content: processedContent };
}

/**
 * 從內容中提取講者筆記
 */
function extractSpeakerNotes(content: string): string | undefined {
  const notes: string[] = [];
  let match: RegExpExecArray | null;

  // 重置正則狀態
  SPEAKER_NOTES_REGEX.lastIndex = 0;

  while ((match = SPEAKER_NOTES_REGEX.exec(content)) !== null) {
    notes.push(match[1].trim());
  }

  return notes.length > 0 ? notes.join('\n\n') : undefined;
}

// ============================================================================
// 動畫解析
// ============================================================================

/**
 * 解析 v-clicks 動畫元素
 */
export function parseAnimatedElements(content: string): {
  elements: AnimatedElement[];
  content: string;
} {
  const elements: AnimatedElement[] = [];
  let processedContent = content;
  let clickIndex = 0;

  // 處理 <v-clicks> 區塊
  processedContent = processedContent.replace(V_CLICKS_REGEX, (match, innerContent) => {
    // 將內部的每個元素標記為動畫元素
    const lines = innerContent.trim().split('\n');
    const wrappedLines = lines.map((line: string) => {
      if (line.trim()) {
        clickIndex++;
        const elementId = generateId();
        elements.push({
          id: elementId,
          clickIndex,
          animation: 'fade-in',
          duration: 300, // DEFAULT_ANIMATION_DURATION
          delay: 0,
        });
        return `<span data-v-click="${clickIndex}" data-animation="fade-in" id="${elementId}">${line}</span>`;
      }
      return line;
    });

    return wrappedLines.join('\n');
  });

  // 處理單獨的 <v-click> 標籤
  // 重置正則狀態
  V_CLICK_REGEX.lastIndex = 0;

  processedContent = processedContent.replace(V_CLICK_REGEX, (match, animation, delay, duration, innerContent) => {
    clickIndex++;
    const elementId = generateId();
    const animationType: AnimationType = isValidAnimation(animation) ? animation : 'fade-in';
    const delayMs = delay ? parseInt(delay, 10) : 0;
    const durationMs = duration ? parseInt(duration, 10) : 300;

    elements.push({
      id: elementId,
      clickIndex,
      animation: animationType,
      duration: durationMs,
      delay: delayMs,
    });

    return `<span data-v-click="${clickIndex}" data-animation="${animationType}" data-delay="${delayMs}" data-duration="${durationMs}" id="${elementId}">${innerContent}</span>`;
  });

  return { elements, content: processedContent };
}

// ============================================================================
// 嵌入內容解析
// ============================================================================

/**
 * 解析嵌入內容
 */
export function parseEmbeddedContents(content: string): {
  embeddedContents: EmbeddedContent[];
  content: string;
} {
  const embeddedContents: EmbeddedContent[] = [];
  let processedContent = content;

  // 處理白板嵌入 ::whiteboard{id="wb1" width="800"}
  processedContent = processedContent.replace(WHITEBOARD_EMBED_REGEX, (match, propsString) => {
    const props = parseProps(propsString);
    const id = typeof props.id === 'string' ? props.id : generateId();

    embeddedContents.push({
      type: 'whiteboard',
      id,
      props,
    });

    return `<div data-embed="whiteboard" data-embed-id="${id}" class="embed-whiteboard"></div>`;
  });

  // 處理影片嵌入 ::video{src="..." autoplay loop}
  processedContent = processedContent.replace(VIDEO_EMBED_REGEX, (match, propsString) => {
    const props = parseProps(propsString);
    const id = typeof props.id === 'string' ? props.id : generateId();

    embeddedContents.push({
      type: 'video',
      id,
      props,
    });

    return `<div data-embed="video" data-embed-id="${id}" class="embed-video"></div>`;
  });

  // 處理圖片嵌入 ![alt](url){props}
  processedContent = processedContent.replace(IMAGE_EMBED_REGEX, (match, alt, src, propsString) => {
    const props = propsString ? parseProps(propsString) : {};
    const id = typeof props.id === 'string' ? props.id : generateId();

    embeddedContents.push({
      type: 'image',
      id,
      props: { ...props, alt, src },
    });

    return `<img data-embed="image" data-embed-id="${id}" src="${src}" alt="${alt}" class="embed-image" />`;
  });

  // 處理程式碼區塊
  CODE_BLOCK_REGEX.lastIndex = 0;
  processedContent = processedContent.replace(CODE_BLOCK_REGEX, (match, lang, propsString, code) => {
    const props = propsString ? parseProps(propsString) : {};
    const id = typeof props.id === 'string' ? props.id : generateId();
    const language = lang || 'text';

    embeddedContents.push({
      type: 'code',
      id,
      props: { ...props, language, code: code.trim() },
    });

    return `<pre data-embed="code" data-embed-id="${id}" data-language="${language}" class="embed-code"><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
  });

  return { embeddedContents, content: processedContent };
}

/**
 * HTML 特殊字元轉義
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

// ============================================================================
// 主要解析函數
// ============================================================================

/**
 * 解析單張投影片
 */
export function parseSlide(rawContent: string, index: number): Slide {
  // 1. 解析投影片 metadata
  const { meta, content: contentAfterMeta } = parseSlideMeta(rawContent);

  // 2. 解析動畫元素
  const { elements: animatedElements, content: contentAfterAnimation } = parseAnimatedElements(contentAfterMeta);

  // 3. 解析嵌入內容
  const { embeddedContents, content: finalContent } = parseEmbeddedContents(contentAfterAnimation);

  // 4. 移除講者筆記註解（它們已經被提取到 meta.notes）
  const htmlContent = finalContent.replace(SPEAKER_NOTES_REGEX, '').trim();

  // 5. 更新 clicks 數量
  if (animatedElements.length > 0 && (!meta.clicks || meta.clicks < animatedElements.length)) {
    meta.clicks = animatedElements.length;
  }

  return {
    id: generateId(),
    index,
    rawContent,
    htmlContent,
    meta,
    animatedElements,
    embeddedContents,
  };
}

/**
 * 解析完整 Markdown 簡報
 */
export function parseMarkdown(markdownContent: string, options: ParseOptions = {}): ParseResult {
  const warnings: string[] = [];

  try {
    // 1. 解析 Front Matter
    const { meta, content, warnings: frontMatterWarnings } = parseFrontMatter(markdownContent);
    warnings.push(...frontMatterWarnings);

    // 2. 分割投影片（使用 --- 作為分隔符）
    // 注意：Front Matter 已經被移除，所以第一個 --- 是投影片分隔符
    const slideContents = splitSlides(content);

    // 3. 解析每張投影片
    const slides: Slide[] = slideContents
      .map((slideContent, index) => {
        try {
          return parseSlide(slideContent, index);
        } catch (error) {
          warnings.push(`Failed to parse slide ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // 返回一個基本的投影片
          return {
            id: generateId(),
            index,
            rawContent: slideContent,
            htmlContent: slideContent,
            meta: getDefaultSlideMeta(),
            animatedElements: [],
            embeddedContents: [],
          };
        }
      });

    // 4. 構建 Presentation
    const presentation: Presentation = {
      id: generateId(),
      meta,
      slides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFile: options.basePath,
    };

    return {
      success: true,
      presentation,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      warnings,
    };
  }
}

/**
 * 分割投影片內容
 */
function splitSlides(content: string): string[] {
  // 先清理內容，移除開頭和結尾的空白
  const trimmedContent = content.trim();

  // 使用 --- 分割，但要注意可能的 front matter 殘留
  const parts = trimmedContent.split(/\n---\n/);

  // 過濾掉空的部分
  return parts
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

// ============================================================================
// 導出
// ============================================================================

export {
  generateId,
  parseProps,
  isValidLayout,
  isValidTransition,
  isValidAnimation,
  isValidAspectRatio,
  extractSpeakerNotes,
  getDefaultPresentationMeta,
  getDefaultSlideMeta,
};
