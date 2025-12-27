/**
 * Slide Renderer Component
 * @module components/Slides/SlideRenderer
 * @description Renders a single slide with layout, theme, and animations
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide, SlideTheme, AnimationType, LayoutType } from '../../types/slide';
import { DefaultLayout, CenterLayout, CoverLayout, TwoColsLayout } from './layouts';

export interface SlideRendererProps {
  /** Slide data to render */
  slide: Slide;
  /** Theme configuration */
  theme: SlideTheme;
  /** Current click index for animations */
  clickIndex: number;
  /** Whether in preview mode (smaller scale) */
  preview?: boolean;
  /** Scale factor */
  scale?: number;
}

// Animation variants for different animation types
const animationVariants: Record<AnimationType, { hidden: any; visible: any }> = {
  'fade-in': {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  'fade-out': {
    hidden: { opacity: 1 },
    visible: { opacity: 0 },
  },
  'slide-up': {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  },
  'slide-down': {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0 },
  },
  'slide-left': {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
  },
  'slide-right': {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 },
  },
  'zoom-in': {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
  },
  'bounce': {
    hidden: { opacity: 0, y: -100 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  },
};

// Get layout component by type
const getLayoutComponent = (layout: LayoutType): React.FC<{
  children: React.ReactNode;
  theme: SlideTheme;
  className?: string;
  style?: React.CSSProperties;
}> => {
  switch (layout) {
    case 'center':
      return CenterLayout;
    case 'cover':
    case 'section':
    case 'end':
      return CoverLayout;
    case 'two-cols':
    case 'image-right':
    case 'image-left':
      return TwoColsLayout;
    case 'default':
    case 'image':
    case 'quote':
    case 'fact':
    default:
      return DefaultLayout;
  }
};

// Generate CSS variables from theme
const generateThemeCSS = (theme: SlideTheme): React.CSSProperties => {
  return {
    '--slide-primary': theme.colors.primary,
    '--slide-secondary': theme.colors.secondary,
    '--slide-accent': theme.colors.accent,
    '--slide-background': theme.colors.background,
    '--slide-background-secondary': theme.colors.backgroundSecondary,
    '--slide-text': theme.colors.text,
    '--slide-text-secondary': theme.colors.textSecondary,
    '--slide-text-muted': theme.colors.textMuted,
    '--slide-code-background': theme.colors.codeBackground,
    '--slide-code-foreground': theme.colors.codeForeground,
    '--slide-font-heading': theme.typography.fontFamily.heading,
    '--slide-font-body': theme.typography.fontFamily.body,
    '--slide-font-mono': theme.typography.fontFamily.mono,
    '--slide-font-size-h1': theme.typography.fontSize.h1,
    '--slide-font-size-h2': theme.typography.fontSize.h2,
    '--slide-font-size-h3': theme.typography.fontSize.h3,
    '--slide-font-size-body': theme.typography.fontSize.body,
    '--slide-font-size-small': theme.typography.fontSize.small,
    '--slide-font-size-code': theme.typography.fontSize.code,
    '--slide-padding': theme.spacing.slidePadding,
    '--slide-content-gap': theme.spacing.contentGap,
    '--slide-section-gap': theme.spacing.sectionGap,
  } as React.CSSProperties;
};

// Animated content wrapper
interface AnimatedContentProps {
  id: string;
  animation: AnimationType;
  duration: number;
  delay: number;
  visible: boolean;
  children: React.ReactNode;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  id,
  animation,
  duration,
  delay,
  visible,
  children,
}) => {
  const variants = animationVariants[animation] || animationVariants['fade-in'];

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={id}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={variants}
          transition={{
            duration: duration / 1000,
            delay: delay / 1000,
            ease: 'easeOut',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  theme,
  clickIndex,
  preview = false,
  scale = 1,
}) => {
  const LayoutComponent = useMemo(() => getLayoutComponent(slide.meta.layout), [slide.meta.layout]);
  const themeCSS = useMemo(() => generateThemeCSS(theme), [theme]);

  // Parse animated elements visibility based on clickIndex
  const animatedElementsMap = useMemo(() => {
    const map = new Map<string, { visible: boolean; element: typeof slide.animatedElements[0] }>();
    slide.animatedElements.forEach(el => {
      map.set(el.id, {
        visible: clickIndex >= el.clickIndex,
        element: el,
      });
    });
    return map;
  }, [slide.animatedElements, clickIndex]);

  // Custom components for ReactMarkdown to handle animated elements
  const markdownComponents = useMemo(() => ({
    // Wrap elements with v-click directive in animated wrappers
    div: ({ node, className, children, ...props }: any) => {
      // Check for data-click attribute (animated elements)
      const dataClick = props['data-click'];
      if (dataClick !== undefined) {
        const clickTarget = parseInt(dataClick, 10) || 0;
        const isVisible = clickIndex >= clickTarget;
        const animatedEl = slide.animatedElements.find(el => el.clickIndex === clickTarget);

        return (
          <AnimatedContent
            id={`animated-${dataClick}`}
            animation={animatedEl?.animation || 'fade-in'}
            duration={animatedEl?.duration || 300}
            delay={animatedEl?.delay || 0}
            visible={isVisible}
          >
            <div className={className} {...props}>
              {children}
            </div>
          </AnimatedContent>
        );
      }

      return <div className={className} {...props}>{children}</div>;
    },
    // Style headings
    h1: ({ children }: any) => (
      <h1 className="slide-h1" style={{
        fontSize: theme.typography.fontSize.h1,
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text,
        lineHeight: theme.typography.lineHeight.tight,
        margin: 0,
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="slide-h2" style={{
        fontSize: theme.typography.fontSize.h2,
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text,
        lineHeight: theme.typography.lineHeight.tight,
        margin: 0,
      }}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="slide-h3" style={{
        fontSize: theme.typography.fontSize.h3,
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeight.tight,
        margin: 0,
      }}>
        {children}
      </h3>
    ),
    // Style paragraphs
    p: ({ children }: any) => (
      <p className="slide-p" style={{
        fontSize: theme.typography.fontSize.body,
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.text,
        lineHeight: theme.typography.lineHeight.relaxed,
        margin: 0,
      }}>
        {children}
      </p>
    ),
    // Style lists
    ul: ({ children }: any) => (
      <ul className="slide-ul" style={{
        fontSize: theme.typography.fontSize.body,
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.text,
        lineHeight: theme.typography.lineHeight.relaxed,
        paddingLeft: '1.5em',
        margin: 0,
      }}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="slide-ol" style={{
        fontSize: theme.typography.fontSize.body,
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.text,
        lineHeight: theme.typography.lineHeight.relaxed,
        paddingLeft: '1.5em',
        margin: 0,
      }}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="slide-li" style={{
        marginBottom: '0.5em',
      }}>
        {children}
      </li>
    ),
    // Style code blocks
    code: ({ node, inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code
            className="slide-inline-code"
            style={{
              backgroundColor: theme.colors.codeBackground,
              color: theme.colors.codeForeground,
              fontFamily: theme.typography.fontFamily.mono,
              fontSize: theme.typography.fontSize.code,
              padding: '0.2em 0.4em',
              borderRadius: '4px',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => (
      <pre
        className="slide-code-block"
        style={{
          backgroundColor: theme.colors.codeBackground,
          color: theme.colors.codeForeground,
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.code,
          padding: '1em',
          borderRadius: '8px',
          overflow: 'auto',
          margin: 0,
        }}
      >
        {children}
      </pre>
    ),
    // Style blockquotes
    blockquote: ({ children }: any) => (
      <blockquote
        className="slide-blockquote"
        style={{
          borderLeft: `4px solid ${theme.colors.primary}`,
          paddingLeft: '1em',
          marginLeft: 0,
          marginRight: 0,
          fontStyle: 'italic',
          color: theme.colors.textSecondary,
        }}
      >
        {children}
      </blockquote>
    ),
    // Style links
    a: ({ href, children }: any) => (
      <a
        href={href}
        className="slide-link"
        style={{
          color: theme.colors.primary,
          textDecoration: 'none',
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    // Style images
    img: ({ src, alt }: any) => (
      <img
        src={src}
        alt={alt || ''}
        className="slide-img"
        style={{
          maxWidth: '100%',
          maxHeight: '60vh',
          objectFit: 'contain',
          borderRadius: '8px',
        }}
      />
    ),
  }), [theme, clickIndex, slide.animatedElements]);

  // Determine background style
  const backgroundStyle: React.CSSProperties = useMemo(() => {
    const bg = slide.meta.background;
    if (!bg) {
      return { backgroundColor: theme.colors.background };
    }
    // Check if it's a URL (image)
    if (bg.startsWith('http') || bg.startsWith('/') || bg.startsWith('data:')) {
      return {
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    // Check if it's a gradient
    if (bg.includes('gradient')) {
      return { background: bg };
    }
    // Otherwise treat as color
    return { backgroundColor: bg };
  }, [slide.meta.background, theme.colors.background]);

  // Decide what content to render
  const contentToRender = slide.htmlContent || slide.rawContent;
  const isHTML = !!slide.htmlContent;

  return (
    <div
      className={`slide-renderer ${preview ? 'slide-renderer--preview' : ''} ${slide.meta.class || ''}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        ...backgroundStyle,
        ...themeCSS,
      }}
    >
      <LayoutComponent theme={theme}>
        {isHTML ? (
          // Render pre-parsed HTML content
          <div
            className="slide-html-content"
            dangerouslySetInnerHTML={{ __html: contentToRender }}
          />
        ) : (
          // Render markdown content
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={markdownComponents}
          >
            {contentToRender}
          </ReactMarkdown>
        )}
      </LayoutComponent>

      {/* Page number (if not hidden) */}
      {!slide.meta.hidePageNumber && !preview && (
        <div
          className="slide-page-number"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '30px',
            fontSize: theme.typography.fontSize.small,
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamily.body,
          }}
        >
          {slide.index + 1}
        </div>
      )}
    </div>
  );
};

export default SlideRenderer;
