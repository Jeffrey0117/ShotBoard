import { useMemo, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import { MermaidRenderer } from '../Mermaid';
import '../Mermaid/mermaid.css';

// Whiteboard block regex pattern: ::whiteboard{id="xxx" width="xxx" height="xxx"}
const WHITEBOARD_PATTERN = /::whiteboard\{([^}]+)\}/g;

interface WhiteboardAttributes {
  id: string;
  width?: string;
  height?: string;
}

function parseWhiteboardAttributes(attrString: string): WhiteboardAttributes | null {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]+)"/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }

  if (!attrs.id) return null;

  return {
    id: attrs.id,
    width: attrs.width,
    height: attrs.height,
  };
}

// Transform content to replace whiteboard syntax with placeholder
function preprocessContent(content: string): string {
  return content.replace(WHITEBOARD_PATTERN, (match, attrString) => {
    const attrs = parseWhiteboardAttributes(attrString);
    if (!attrs) return match;

    const width = attrs.width || '100%';
    const height = attrs.height || '300';

    return `<div class="whiteboard-block" data-whiteboard-id="${attrs.id}" data-width="${width}" data-height="${height}">
      <div class="whiteboard-block__header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        <span>Whiteboard: ${attrs.id}</span>
      </div>
      <div class="whiteboard-block__content">
        <div class="whiteboard-block__placeholder">Click to edit whiteboard</div>
      </div>
    </div>`;
  });
}

export interface MarkdownPreviewProps {
  /** Markdown content to render */
  content: string;
  /** Scroll position for sync scrolling (0-1 ratio) */
  scrollRatio?: number;
  /** Callback when whiteboard block is clicked */
  onWhiteboardClick?: (whiteboardId: string) => void;
  /** Additional CSS class */
  className?: string;
}

// Custom code component with syntax highlighting and Mermaid support
const CodeBlock: React.FC<{
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ inline, className, children }) => {
  const language = className?.replace('language-', '') || '';

  if (inline) {
    return <code className={className}>{children}</code>;
  }

  // Handle Mermaid code blocks
  if (language === 'mermaid') {
    const code = String(children).replace(/\n$/, '');
    return <MermaidRenderer code={code} />;
  }

  return (
    <pre className={`language-${language}`}>
      <code className={className}>{children}</code>
    </pre>
  );
};

// Custom link component with external link handling
const LinkComponent: React.FC<{
  href?: string;
  children?: React.ReactNode;
}> = ({ href, children }) => {
  const isExternal = href?.startsWith('http://') || href?.startsWith('https://');

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
};

// Custom image component with lazy loading
const ImageComponent: React.FC<{
  src?: string;
  alt?: string;
}> = ({ src, alt }) => {
  return (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
};

// Custom checkbox for task lists
const InputComponent: React.FC<{
  type?: string;
  checked?: boolean;
  disabled?: boolean;
}> = ({ type, checked, disabled }) => {
  if (type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        readOnly
        aria-label={checked ? 'Completed task' : 'Incomplete task'}
      />
    );
  }
  return <input type={type} />;
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  scrollRatio,
  onWhiteboardClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Preprocess content to handle whiteboard syntax
  const processedContent = useMemo(() => {
    return preprocessContent(content);
  }, [content]);

  // Handle sync scrolling
  useEffect(() => {
    if (scrollRatio === undefined || !containerRef.current) return;
    if (isScrollingRef.current) return;

    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const targetScroll = maxScroll * scrollRatio;

    container.scrollTop = targetScroll;
  }, [scrollRatio]);

  // Handle whiteboard clicks
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const whiteboardBlock = target.closest('.whiteboard-block');

      if (whiteboardBlock && onWhiteboardClick) {
        const whiteboardId = whiteboardBlock.getAttribute('data-whiteboard-id');
        if (whiteboardId) {
          onWhiteboardClick(whiteboardId);
        }
      }
    },
    [onWhiteboardClick]
  );

  // Define custom components
  const components: Components = useMemo(
    () => ({
      code: CodeBlock as Components['code'],
      a: LinkComponent as Components['a'],
      img: ImageComponent as Components['img'],
      input: InputComponent as Components['input'],
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      className={`markdown-preview ${className}`}
      onClick={handleClick}
      role="document"
      aria-label="Markdown preview"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
