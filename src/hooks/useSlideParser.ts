/**
 * Markdown 簡報解析器 React Hook
 * @module hooks/useSlideParser
 * @description 封裝 slideParser 邏輯為 React Hook
 */

import { useCallback, useState, useMemo } from 'react';
import {
  parseMarkdown,
  parseSlide,
  parseFrontMatter,
  parseSlideMeta,
  parseAnimatedElements,
  parseEmbeddedContents,
  getDefaultPresentationMeta,
  getDefaultSlideMeta,
} from '../utils/markdown/slideParser';
import type {
  Presentation,
  PresentationMeta,
  Slide,
  SlideMeta,
  ParseOptions,
  ParseResult,
} from '../types/slide';

// ============================================================================
// 類型定義
// ============================================================================

/**
 * Hook 返回類型
 */
export interface UseSlideParserReturn {
  /** 解析完整 Markdown 簡報 */
  parseMarkdown: (content: string, options?: ParseOptions) => ParseResult;

  /** 解析單張投影片 */
  parseSlide: (content: string, index: number) => Slide;

  /** 解析 Front Matter */
  parseFrontMatter: (content: string) => {
    meta: PresentationMeta;
    content: string;
    warnings: string[];
  };

  /** 解析投影片 Metadata */
  parseSlideMeta: (content: string) => {
    meta: SlideMeta;
    content: string;
  };

  /** 取得預設 PresentationMeta */
  getDefaultPresentationMeta: () => PresentationMeta;

  /** 取得預設 SlideMeta */
  getDefaultSlideMeta: () => SlideMeta;
}

/**
 * 有狀態的 Hook 返回類型
 */
export interface UseSlideParserStateReturn extends UseSlideParserReturn {
  /** 當前解析的簡報 */
  presentation: Presentation | null;

  /** 是否正在解析 */
  isParsing: boolean;

  /** 解析錯誤 */
  error: string | null;

  /** 警告列表 */
  warnings: string[];

  /** 解析並設定簡報 */
  parse: (content: string, options?: ParseOptions) => Promise<ParseResult>;

  /** 清除當前簡報 */
  clear: () => void;

  /** 更新單張投影片 */
  updateSlide: (index: number, content: string) => void;

  /** 新增投影片 */
  addSlide: (content: string, atIndex?: number) => void;

  /** 刪除投影片 */
  removeSlide: (index: number) => void;

  /** 移動投影片 */
  moveSlide: (fromIndex: number, toIndex: number) => void;
}

// ============================================================================
// Hook 實作
// ============================================================================

/**
 * Markdown 簡報解析器 Hook（無狀態版本）
 * 提供純解析功能，不管理狀態
 */
export function useSlideParser(): UseSlideParserReturn {
  const memoizedParseMarkdown = useCallback(
    (content: string, options?: ParseOptions) => parseMarkdown(content, options),
    []
  );

  const memoizedParseSlide = useCallback(
    (content: string, index: number) => parseSlide(content, index),
    []
  );

  const memoizedParseFrontMatter = useCallback(
    (content: string) => parseFrontMatter(content),
    []
  );

  const memoizedParseSlideMeta = useCallback(
    (content: string) => parseSlideMeta(content),
    []
  );

  const memoizedGetDefaultPresentationMeta = useCallback(
    () => getDefaultPresentationMeta(),
    []
  );

  const memoizedGetDefaultSlideMeta = useCallback(
    () => getDefaultSlideMeta(),
    []
  );

  return useMemo(
    () => ({
      parseMarkdown: memoizedParseMarkdown,
      parseSlide: memoizedParseSlide,
      parseFrontMatter: memoizedParseFrontMatter,
      parseSlideMeta: memoizedParseSlideMeta,
      getDefaultPresentationMeta: memoizedGetDefaultPresentationMeta,
      getDefaultSlideMeta: memoizedGetDefaultSlideMeta,
    }),
    [
      memoizedParseMarkdown,
      memoizedParseSlide,
      memoizedParseFrontMatter,
      memoizedParseSlideMeta,
      memoizedGetDefaultPresentationMeta,
      memoizedGetDefaultSlideMeta,
    ]
  );
}

/**
 * Markdown 簡報解析器 Hook（有狀態版本）
 * 管理解析狀態和簡報資料
 */
export function useSlideParserState(): UseSlideParserStateReturn {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const baseParser = useSlideParser();

  /**
   * 解析並設定簡報
   */
  const parse = useCallback(
    async (content: string, options?: ParseOptions): Promise<ParseResult> => {
      setIsParsing(true);
      setError(null);
      setWarnings([]);

      try {
        // 使用 setTimeout 使其非同步，避免阻塞 UI
        const result = await new Promise<ParseResult>((resolve) => {
          setTimeout(() => {
            resolve(baseParser.parseMarkdown(content, options));
          }, 0);
        });

        if (result.success && result.presentation) {
          setPresentation(result.presentation);
          setWarnings(result.warnings);
        } else {
          setError(result.error || 'Unknown parsing error');
          setWarnings(result.warnings);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
          warnings: [],
        };
      } finally {
        setIsParsing(false);
      }
    },
    [baseParser]
  );

  /**
   * 清除當前簡報
   */
  const clear = useCallback(() => {
    setPresentation(null);
    setError(null);
    setWarnings([]);
  }, []);

  /**
   * 更新單張投影片
   */
  const updateSlide = useCallback(
    (index: number, content: string) => {
      if (!presentation) return;

      const newSlide = baseParser.parseSlide(content, index);
      const newSlides = [...presentation.slides];
      newSlides[index] = { ...newSlide, id: presentation.slides[index].id };

      setPresentation({
        ...presentation,
        slides: newSlides,
        updatedAt: new Date().toISOString(),
      });
    },
    [presentation, baseParser]
  );

  /**
   * 新增投影片
   */
  const addSlide = useCallback(
    (content: string, atIndex?: number) => {
      if (!presentation) return;

      const insertIndex = atIndex ?? presentation.slides.length;
      const newSlide = baseParser.parseSlide(content, insertIndex);

      const newSlides = [...presentation.slides];
      newSlides.splice(insertIndex, 0, newSlide);

      // 更新後續投影片的索引
      const reindexedSlides = newSlides.map((slide, idx) => ({
        ...slide,
        index: idx,
      }));

      setPresentation({
        ...presentation,
        slides: reindexedSlides,
        updatedAt: new Date().toISOString(),
      });
    },
    [presentation, baseParser]
  );

  /**
   * 刪除投影片
   */
  const removeSlide = useCallback(
    (index: number) => {
      if (!presentation || presentation.slides.length <= 1) return;

      const newSlides = presentation.slides.filter((_, idx) => idx !== index);

      // 更新索引
      const reindexedSlides = newSlides.map((slide, idx) => ({
        ...slide,
        index: idx,
      }));

      setPresentation({
        ...presentation,
        slides: reindexedSlides,
        updatedAt: new Date().toISOString(),
      });
    },
    [presentation]
  );

  /**
   * 移動投影片
   */
  const moveSlide = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!presentation) return;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= presentation.slides.length) return;
      if (toIndex < 0 || toIndex >= presentation.slides.length) return;

      const newSlides = [...presentation.slides];
      const [movedSlide] = newSlides.splice(fromIndex, 1);
      newSlides.splice(toIndex, 0, movedSlide);

      // 更新索引
      const reindexedSlides = newSlides.map((slide, idx) => ({
        ...slide,
        index: idx,
      }));

      setPresentation({
        ...presentation,
        slides: reindexedSlides,
        updatedAt: new Date().toISOString(),
      });
    },
    [presentation]
  );

  return {
    ...baseParser,
    presentation,
    isParsing,
    error,
    warnings,
    parse,
    clear,
    updateSlide,
    addSlide,
    removeSlide,
    moveSlide,
  };
}

// 預設導出無狀態版本
export default useSlideParser;
