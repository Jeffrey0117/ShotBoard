/**
 * Markdown 工具模組
 * @module utils/markdown
 */

export {
  // 主要解析函數
  parseMarkdown,
  parseSlide,
  parseFrontMatter,
  parseSlideMeta,
  parseAnimatedElements,
  parseEmbeddedContents,

  // 輔助函數
  generateId,
  parseProps,
  isValidLayout,
  isValidTransition,
  isValidAnimation,
  isValidAspectRatio,
  extractSpeakerNotes,
  getDefaultPresentationMeta,
  getDefaultSlideMeta,
} from './slideParser';
