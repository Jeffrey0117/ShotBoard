import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';

// Custom highlight style for Markdown
const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, class: 'cm-header cm-header-1' },
  { tag: tags.heading2, class: 'cm-header cm-header-2' },
  { tag: tags.heading3, class: 'cm-header cm-header-3' },
  { tag: tags.heading4, class: 'cm-header cm-header-4' },
  { tag: tags.heading5, class: 'cm-header cm-header-5' },
  { tag: tags.heading6, class: 'cm-header cm-header-6' },
  { tag: tags.strong, class: 'cm-strong' },
  { tag: tags.emphasis, class: 'cm-emphasis' },
  { tag: tags.strikethrough, class: 'cm-strikethrough' },
  { tag: tags.link, class: 'cm-link' },
  { tag: tags.url, class: 'cm-url' },
  { tag: tags.comment, class: 'cm-comment' },
  { tag: tags.meta, class: 'cm-meta' },
  { tag: tags.quote, class: 'cm-quote' },
  { tag: tags.list, class: 'cm-list' },
  { tag: tags.monospace, class: 'cm-monospace' },
  { tag: tags.processingInstruction, class: 'cm-codeBlock' },
]);

export interface MarkdownEditorRef {
  /** Get the current editor view */
  getEditorView: () => EditorView | null;
  /** Focus the editor */
  focus: () => void;
  /** Insert text at cursor position */
  insertText: (text: string) => void;
  /** Wrap selection with prefix and suffix */
  wrapSelection: (prefix: string, suffix: string) => void;
  /** Get current selection text */
  getSelection: () => string;
  /** Replace selection with new text */
  replaceSelection: (text: string) => void;
  /** Get cursor position */
  getCursorPosition: () => { line: number; column: number };
  /** Set cursor position */
  setCursorPosition: (line: number, column: number) => void;
}

export interface MarkdownEditorProps {
  /** Markdown content value */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
  /** Callback when cursor position changes */
  onCursorChange?: (position: { line: number; column: number }) => void;
  /** Callback when scroll position changes (for sync scrolling) */
  onScroll?: (scrollInfo: { top: number; height: number; clientHeight: number }) => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional CSS class */
  className?: string;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      value,
      onChange,
      readOnly = false,
      autoFocus = false,
      onCursorChange,
      onScroll,
      placeholder = 'Start writing...',
      className = '',
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const isInternalChange = useRef(false);

    // Create custom keymaps for markdown formatting
    const markdownKeymap = useMemo(
      () =>
        keymap.of([
          {
            key: 'Mod-b',
            run: (view) => {
              wrapSelectionWith(view, '**', '**');
              return true;
            },
          },
          {
            key: 'Mod-i',
            run: (view) => {
              wrapSelectionWith(view, '_', '_');
              return true;
            },
          },
          {
            key: 'Mod-k',
            run: (view) => {
              const selection = view.state.sliceDoc(
                view.state.selection.main.from,
                view.state.selection.main.to
              );
              if (selection) {
                insertAtCursor(view, `[${selection}](url)`);
              } else {
                insertAtCursor(view, '[link text](url)');
              }
              return true;
            },
          },
          {
            key: 'Mod-Shift-k',
            run: (view) => {
              insertAtCursor(view, '```\n\n```');
              // Move cursor to middle
              const pos = view.state.selection.main.from - 4;
              view.dispatch({
                selection: { anchor: pos },
              });
              return true;
            },
          },
          {
            key: 'Mod-Shift-x',
            run: (view) => {
              wrapSelectionWith(view, '~~', '~~');
              return true;
            },
          },
        ]),
      []
    );

    // Helper function to wrap selection
    const wrapSelectionWith = useCallback((view: EditorView, prefix: string, suffix: string) => {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);

      view.dispatch({
        changes: { from, to, insert: `${prefix}${selectedText}${suffix}` },
        selection: { anchor: from + prefix.length, head: to + prefix.length },
      });
    }, []);

    // Helper function to insert text at cursor
    const insertAtCursor = useCallback((view: EditorView, text: string) => {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
    }, []);

    // Create extensions
    const extensions = useMemo(() => {
      const exts = [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        highlightSelectionMatches(),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        syntaxHighlighting(markdownHighlightStyle),
        markdownKeymap,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...closeBracketsKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isInternalChange.current) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }

          if (update.selectionSet && onCursorChange) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            onCursorChange({
              line: line.number,
              column: pos - line.from + 1,
            });
          }
        }),
        EditorView.domEventHandlers({
          scroll: (_event, view) => {
            if (onScroll) {
              const scrollDOM = view.scrollDOM;
              onScroll({
                top: scrollDOM.scrollTop,
                height: scrollDOM.scrollHeight,
                clientHeight: scrollDOM.clientHeight,
              });
            }
            return false;
          },
        }),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        // Placeholder extension
        EditorView.contentAttributes.of({
          'aria-label': 'Markdown editor',
          role: 'textbox',
          'aria-multiline': 'true',
        }),
      ];

      return exts;
    }, [onChange, onCursorChange, onScroll, readOnly, markdownKeymap]);

    // Initialize editor
    useEffect(() => {
      if (!containerRef.current) return;

      const state = EditorState.create({
        doc: value,
        extensions,
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      editorViewRef.current = view;

      if (autoFocus) {
        view.focus();
      }

      return () => {
        view.destroy();
        editorViewRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update value from external changes
    useEffect(() => {
      const view = editorViewRef.current;
      if (!view) return;

      const currentValue = view.state.doc.toString();
      if (currentValue !== value) {
        isInternalChange.current = true;
        view.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
        isInternalChange.current = false;
      }
    }, [value]);

    // Note: readOnly state changes require re-creating the editor
    // This is handled by including readOnly in the extensions dependency

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        getEditorView: () => editorViewRef.current,
        focus: () => {
          editorViewRef.current?.focus();
        },
        insertText: (text: string) => {
          const view = editorViewRef.current;
          if (view) {
            insertAtCursor(view, text);
          }
        },
        wrapSelection: (prefix: string, suffix: string) => {
          const view = editorViewRef.current;
          if (view) {
            wrapSelectionWith(view, prefix, suffix);
          }
        },
        getSelection: () => {
          const view = editorViewRef.current;
          if (!view) return '';
          const { from, to } = view.state.selection.main;
          return view.state.sliceDoc(from, to);
        },
        replaceSelection: (text: string) => {
          const view = editorViewRef.current;
          if (!view) return;
          const { from, to } = view.state.selection.main;
          view.dispatch({
            changes: { from, to, insert: text },
          });
        },
        getCursorPosition: () => {
          const view = editorViewRef.current;
          if (!view) return { line: 1, column: 1 };
          const pos = view.state.selection.main.head;
          const line = view.state.doc.lineAt(pos);
          return {
            line: line.number,
            column: pos - line.from + 1,
          };
        },
        setCursorPosition: (line: number, column: number) => {
          const view = editorViewRef.current;
          if (!view) return;
          const lineInfo = view.state.doc.line(line);
          const pos = lineInfo.from + column - 1;
          view.dispatch({
            selection: { anchor: pos },
          });
        },
      }),
      [insertAtCursor, wrapSelectionWith]
    );

    return (
      <div
        ref={containerRef}
        className={`markdown-editor ${className}`}
        data-placeholder={placeholder}
        aria-label="Markdown editor"
      />
    );
  }
);

export default MarkdownEditor;
