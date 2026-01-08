import { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with default config
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  mindmap: {
    useMaxWidth: true,
  },
});

export interface MermaidError {
  message: string;
  line?: number;
  column?: number;
}

export interface MermaidRendererProps {
  /** Mermaid code to render */
  code: string;
  /** Theme: default, dark, forest, neutral */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  /** Additional CSS class */
  className?: string;
  /** Callback when error occurs */
  onError?: (error: MermaidError) => void;
  /** Callback when render succeeds */
  onSuccess?: (svg: string) => void;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  code,
  theme = 'default',
  className = '',
  onError,
  onSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<MermaidError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const uniqueId = useId().replace(/:/g, '-');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) {
        setSvg('');
        setError(null);
        return;
      }

      setIsLoading(true);

      try {
        // Update theme config
        mermaid.initialize({
          startOnLoad: false,
          theme,
          securityLevel: 'loose',
        });

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${uniqueId}`,
          code.trim()
        );

        setSvg(renderedSvg);
        setError(null);
        onSuccess?.(renderedSvg);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Parse error for line/column if available
        const lineMatch = errorMessage.match(/line (\d+)/i);
        const colMatch = errorMessage.match(/column (\d+)/i);

        const mermaidError: MermaidError = {
          message: errorMessage.replace(/\n/g, ' ').slice(0, 200),
          line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
          column: colMatch ? parseInt(colMatch[1], 10) : undefined,
        };

        setError(mermaidError);
        onError?.(mermaidError);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce rendering
    const timeoutId = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timeoutId);
  }, [code, theme, uniqueId, onError, onSuccess]);

  if (isLoading && !svg) {
    return (
      <div className={`mermaid-loading ${className}`}>
        <div className="mermaid-loading__spinner" />
        <span>Rendering...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mermaid-error ${className}`}>
        <div className="mermaid-error__header">
          <span className="mermaid-error__icon">&#9888;</span>
          <span className="mermaid-error__title">Mermaid Syntax Error</span>
        </div>
        <div className="mermaid-error__message">{error.message}</div>
        {error.line && (
          <div className="mermaid-error__location">
            Line: {error.line}
            {error.column && `, Column: ${error.column}`}
          </div>
        )}
      </div>
    );
  }

  if (!svg) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-container ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidRenderer;
