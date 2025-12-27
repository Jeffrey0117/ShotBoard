/**
 * SlideBackgroundRenderer Component
 * Renders slide content as a background layer for whiteboard pages
 * @module components/Slides/SlideBackgroundRenderer
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import type { SlideTheme } from '../../types/slide';
import { DEFAULT_THEME } from '../../stores/slideStore';

export interface SlideBackgroundRendererProps {
  /** Markdown content to render */
  content: string;
  /** Theme configuration */
  theme?: SlideTheme;
  /** Additional CSS class */
  className?: string;
}

export const SlideBackgroundRenderer: React.FC<SlideBackgroundRendererProps> = ({
  content,
  theme = DEFAULT_THEME,
  className = '',
}) => {
  // Generate CSS variables from theme
  const themeStyles = useMemo((): React.CSSProperties => ({
    '--slide-bg-primary': theme.colors.primary,
    '--slide-bg-secondary': theme.colors.secondary,
    '--slide-bg-accent': theme.colors.accent,
    '--slide-bg-background': theme.colors.background,
    '--slide-bg-text': theme.colors.text,
    '--slide-bg-text-secondary': theme.colors.textSecondary,
    '--slide-bg-text-muted': theme.colors.textMuted,
    '--slide-bg-code-background': theme.colors.codeBackground,
    '--slide-bg-code-foreground': theme.colors.codeForeground,
    '--slide-bg-font-heading': theme.typography.fontFamily.heading,
    '--slide-bg-font-body': theme.typography.fontFamily.body,
    '--slide-bg-font-mono': theme.typography.fontFamily.mono,
  } as React.CSSProperties), [theme]);

  // Custom components for ReactMarkdown
  const markdownComponents = useMemo(() => ({
    h1: ({ children }: any) => (
      <h1 className="slide-bg-h1">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="slide-bg-h2">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="slide-bg-h3">{children}</h3>
    ),
    p: ({ children }: any) => (
      <p className="slide-bg-p">{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className="slide-bg-ul">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="slide-bg-ol">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="slide-bg-li">{children}</li>
    ),
    code: ({ inline, className, children }: any) => {
      if (inline) {
        return <code className="slide-bg-inline-code">{children}</code>;
      }
      return (
        <pre className="slide-bg-code-block">
          <code className={className}>{children}</code>
        </pre>
      );
    },
    blockquote: ({ children }: any) => (
      <blockquote className="slide-bg-blockquote">{children}</blockquote>
    ),
    a: ({ href, children }: any) => (
      <a href={href} className="slide-bg-link" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    img: ({ src, alt }: any) => (
      <img src={src} alt={alt || ''} className="slide-bg-img" />
    ),
    table: ({ children }: any) => (
      <table className="slide-bg-table">{children}</table>
    ),
    th: ({ children }: any) => (
      <th className="slide-bg-th">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="slide-bg-td">{children}</td>
    ),
  }), []);

  return (
    <div
      className={`slide-background-renderer ${className}`}
      style={themeStyles}
    >
      <div className="slide-background-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>

      <style>{`
        .slide-background-renderer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--slide-bg-background, #1a1a2e);
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .slide-background-content {
          width: 100%;
          height: 100%;
          padding: 60px 80px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .slide-bg-h1 {
          font-size: 3rem;
          font-family: var(--slide-bg-font-heading, system-ui, sans-serif);
          font-weight: 700;
          color: var(--slide-bg-text, #ffffff);
          line-height: 1.2;
          margin: 0 0 0.5em 0;
        }

        .slide-bg-h2 {
          font-size: 2.25rem;
          font-family: var(--slide-bg-font-heading, system-ui, sans-serif);
          font-weight: 700;
          color: var(--slide-bg-text, #ffffff);
          line-height: 1.2;
          margin: 0 0 0.5em 0;
        }

        .slide-bg-h3 {
          font-size: 1.5rem;
          font-family: var(--slide-bg-font-heading, system-ui, sans-serif);
          font-weight: 600;
          color: var(--slide-bg-text-secondary, #cccccc);
          line-height: 1.3;
          margin: 0 0 0.5em 0;
        }

        .slide-bg-p {
          font-size: 1.25rem;
          font-family: var(--slide-bg-font-body, system-ui, sans-serif);
          color: var(--slide-bg-text, #ffffff);
          line-height: 1.6;
          margin: 0;
        }

        .slide-bg-ul,
        .slide-bg-ol {
          font-size: 1.25rem;
          font-family: var(--slide-bg-font-body, system-ui, sans-serif);
          color: var(--slide-bg-text, #ffffff);
          line-height: 1.6;
          padding-left: 1.5em;
          margin: 0;
        }

        .slide-bg-li {
          margin-bottom: 0.5em;
        }

        .slide-bg-li:last-child {
          margin-bottom: 0;
        }

        .slide-bg-inline-code {
          background-color: var(--slide-bg-code-background, #2d2d4a);
          color: var(--slide-bg-code-foreground, #e0e0e0);
          font-family: var(--slide-bg-font-mono, 'Consolas', monospace);
          font-size: 0.9em;
          padding: 0.2em 0.4em;
          border-radius: 4px;
        }

        .slide-bg-code-block {
          background-color: var(--slide-bg-code-background, #2d2d4a);
          color: var(--slide-bg-code-foreground, #e0e0e0);
          font-family: var(--slide-bg-font-mono, 'Consolas', monospace);
          font-size: 1rem;
          padding: 1em;
          border-radius: 8px;
          overflow: auto;
          margin: 0;
          max-height: 50vh;
        }

        .slide-bg-code-block code {
          font-family: inherit;
          background: transparent;
          padding: 0;
        }

        .slide-bg-blockquote {
          border-left: 4px solid var(--slide-bg-primary, #5c6bc0);
          padding-left: 1em;
          margin: 0;
          font-style: italic;
          color: var(--slide-bg-text-secondary, #cccccc);
        }

        .slide-bg-link {
          color: var(--slide-bg-primary, #5c6bc0);
          text-decoration: none;
        }

        .slide-bg-link:hover {
          text-decoration: underline;
        }

        .slide-bg-img {
          max-width: 100%;
          max-height: 50vh;
          object-fit: contain;
          border-radius: 8px;
        }

        .slide-bg-table {
          border-collapse: collapse;
          width: 100%;
          font-size: 1.1rem;
        }

        .slide-bg-th,
        .slide-bg-td {
          border: 1px solid var(--slide-bg-text-muted, #444);
          padding: 12px 16px;
          text-align: left;
        }

        .slide-bg-th {
          background-color: rgba(255, 255, 255, 0.1);
          font-weight: 600;
          color: var(--slide-bg-text, #ffffff);
        }

        .slide-bg-td {
          color: var(--slide-bg-text, #ffffff);
        }
      `}</style>
    </div>
  );
};

export default SlideBackgroundRenderer;
