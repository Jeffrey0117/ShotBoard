import { useRef, useEffect, useCallback, useState } from 'react';
import { Whiteboard, WhiteboardAPI } from './components/Whiteboard';
import { Toolbar } from './components/Toolbar';
import { PagePanel } from './components/PagePanel';
import { NotesPanel } from './components/NotesPanel';
import { CameraBubble } from './components/Recorder/CameraBubble';
import { useRecorder } from './components/Recorder/useRecorder';
import { ScreenRecorder } from './components/ScreenRecorder';
import { ScreenMonitor } from './components/ScreenMonitor';
import { ThemeToggle } from './components/ThemeToggle';
import { useProjectStore } from './stores/projectStore';
import { useThemeStore } from './stores/themeStore';
import { usePageStore } from './stores/pageStore';
import { SlidePlayer } from './components/Slides';
import { useSlideStore } from './stores/slideStore';
import './App.css';

// Default markdown template
const DEFAULT_MARKDOWN = `---
title: 我的簡報
author:
theme: default
---

# 第一頁標題

在這裡寫內容

---

# 第二頁

- 重點一
- 重點二
- 重點三

---

# 結束

謝謝觀看！
`;

function App() {
  const whiteboardRef = useRef<WhiteboardAPI>(null);
  const isDirty = useProjectStore((state) => state.isDirty);
  const theme = useThemeStore((state) => state.theme);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Slide mode state
  const [isSlideMode, setIsSlideMode] = useState(false);
  const [isSlideEditorOpen, setIsSlideEditorOpen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState(DEFAULT_MARKDOWN);

  // Screen recording state
  const [isScreenRecorderOpen, setIsScreenRecorderOpen] = useState(false);
  const [isScreenMonitorOpen, setIsScreenMonitorOpen] = useState(false);
  const presentation = useSlideStore((state) => state.presentation);
  const theme = useSlideStore((state) => state.theme);
  const parseFromMarkdown = useSlideStore((state) => state.parseFromMarkdown);

  // Page store - must be before handlers that use them
  const currentPageId = usePageStore((state) => state.currentPageId);
  const saveCurrentPageState = usePageStore((state) => state.saveCurrentPageState);
  const updateThumbnail = usePageStore((state) => state.updateThumbnail);
  const getPageById = usePageStore((state) => state.getPageById);
  const pages = usePageStore((state) => state.pages);
  const importSlidesAsPages = usePageStore((state) => state.importSlidesAsPages);
  const getCurrentPage = usePageStore((state) => state.getCurrentPage);

  // Get current page's slide background
  const currentPage = getCurrentPage();
  const slideBackground = currentPage?.slideBackground;

  // Open slide editor
  const handleOpenSlides = useCallback(() => {
    setIsSlideEditorOpen(true);
  }, []);

  // Start presentation from editor (fullscreen mode)
  const handleStartPresentation = useCallback(() => {
    parseFromMarkdown(markdownContent);
    setIsSlideEditorOpen(false);
    setIsSlideMode(true);
  }, [parseFromMarkdown, markdownContent]);

  // Import slides as whiteboard pages (integrated mode)
  const handleImportAsPages = useCallback(() => {
    importSlidesAsPages(markdownContent, 'default');
    setIsSlideEditorOpen(false);
    // Load the first page after import
    setTimeout(() => {
      const newPage = usePageStore.getState().getCurrentPage();
      if (newPage && whiteboardRef.current) {
        whiteboardRef.current.loadPageState(newPage);
      }
    }, 0);
  }, [importSlidesAsPages, markdownContent]);

  // Close slides handler
  const handleCloseSlides = useCallback(() => {
    setIsSlideMode(false);
  }, []);

  // Provide getCanvas, getBackgroundColor, and getZoom functions to useRecorder
  const getCanvas = useCallback(() => {
    return whiteboardRef.current?.getCanvas() ?? null;
  }, []);

  const getBackgroundColor = useCallback(() => {
    return whiteboardRef.current?.getBackgroundColor() ?? '#1a1a2e';
  }, []);

  const getZoom = useCallback(() => {
    return whiteboardRef.current?.getZoom() ?? 1;
  }, []);

  const {
    isRecording,
    isPreviewing,
    cameraStream,
    recordingStartTime,
    cameraSettings,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
    updateBubbleConfig,
    setCameraSettings,
  } = useRecorder({ getCanvas, getBackgroundColor, getZoom });

  // Listen for screenshot captures
  useEffect(() => {
    const handleScreenshot = (dataUrl: string) => {
      whiteboardRef.current?.insertImage(dataUrl);
    };
    window.electronAPI?.onScreenshotCaptured(handleScreenshot);
  }, []);

  // 保存當前頁面狀態並生成縮圖
  const handleBeforePageSwitch = useCallback(async () => {
    const state = whiteboardRef.current?.saveCurrentState();
    if (state) {
      saveCurrentPageState(state.elements, state.files, state.appState);

      // 生成縮圖
      const thumbnail = await whiteboardRef.current?.generateThumbnail();
      if (thumbnail) {
        updateThumbnail(currentPageId, thumbnail);
      }
    }
  }, [currentPageId, saveCurrentPageState, updateThumbnail]);

  // 切換頁面後載入新頁面狀態
  const handlePageSwitch = useCallback((pageId: string) => {
    const page = getPageById(pageId);
    if (page) {
      whiteboardRef.current?.loadPageState(page);
    }
  }, [getPageById]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略輸入框內的按鍵
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+N: 新增頁面
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleBeforePageSwitch();
        const newId = usePageStore.getState().addPage();
        usePageStore.getState().switchPage(newId);
        handlePageSwitch(newId);
      }

      // PageUp / PageDown: 切換頁面
      if (e.key === 'PageUp') {
        e.preventDefault();
        handleBeforePageSwitch();
        usePageStore.getState().prevPage();
        const newPageId = usePageStore.getState().currentPageId;
        handlePageSwitch(newPageId);
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        handleBeforePageSwitch();
        usePageStore.getState().nextPage();
        const newPageId = usePageStore.getState().currentPageId;
        handlePageSwitch(newPageId);
      }

      // 數字鍵 1-9: 快速跳到第 N 頁
      if (!e.ctrlKey && !e.altKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
        const pageIndex = parseInt(e.key, 10) - 1;
        const pages = usePageStore.getState().pages;
        if (pageIndex < pages.length) {
          e.preventDefault();
          handleBeforePageSwitch();
          usePageStore.getState().goToPageByIndex(pageIndex);
          const newPageId = usePageStore.getState().currentPageId;
          handlePageSwitch(newPageId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBeforePageSwitch, handlePageSwitch]);

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ShotBoard</h1>
        <div className="app-header-actions">
          <button className="header-btn header-btn--slides" onClick={handleOpenSlides}>
            📊 簡報
          </button>
          <button
            className="header-btn header-btn--screen-record"
            onClick={() => setIsScreenRecorderOpen(true)}
          >
            🎬 螢幕錄影
          </button>
          <button
            className="header-btn header-btn--screen-monitor"
            onClick={() => setIsScreenMonitorOpen(true)}
          >
            📷 螢幕監控
          </button>
          <ThemeToggle />
        </div>
        <div className="app-status">
          <span className="page-indicator">
            {usePageStore.getState().getCurrentPageIndex() + 1} / {pages.length}
          </span>
          <div className={`dirty-indicator ${isDirty ? '' : 'saved'}`} />
          <span>{isDirty ? 'Unsaved' : 'Saved'}</span>
        </div>
      </header>

      <main className="app-main">
        <PagePanel
          onBeforePageSwitch={handleBeforePageSwitch}
          onPageSwitch={handlePageSwitch}
        />

        <div className="content-area">
          <div className="whiteboard-wrapper">
            <Whiteboard
              ref={whiteboardRef}
              className="whiteboard-container"
              slideBackground={slideBackground}
            />
          </div>

          <NotesPanel />
        </div>

        <Toolbar
          isPreviewing={isPreviewing}
          isRecording={isRecording}
          recordingStartTime={recordingStartTime}
          onStartPreview={startPreview}
          onStopPreview={stopPreview}
          onStartRecording={startRecording}
          onStopRecording={handleStopRecording}
        />

        {isPreviewing && cameraStream && (
          <CameraBubble
            stream={cameraStream}
            onBubbleConfigChange={updateBubbleConfig}
            settings={cameraSettings}
            onSettingsChange={setCameraSettings}
          />
        )}
      </main>

      {/* Markdown Editor Dialog */}
      {isSlideEditorOpen && (
        <div className="slide-editor-overlay">
          <div className="slide-editor-dialog">
            <div className="slide-editor-header">
              <h2>Markdown 簡報編輯器</h2>
              <p className="slide-editor-hint">用 <code>---</code> 分隔每一頁</p>
            </div>
            <textarea
              className="slide-editor-textarea"
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              placeholder="輸入 Markdown 內容..."
              spellCheck={false}
            />
            <div className="slide-editor-footer">
              <button
                className="slide-editor-btn slide-editor-btn--cancel"
                onClick={() => setIsSlideEditorOpen(false)}
              >
                取消
              </button>
              <button
                className="slide-editor-btn slide-editor-btn--import"
                onClick={handleImportAsPages}
              >
                📄 匯入為頁面
              </button>
              <button
                className="slide-editor-btn slide-editor-btn--start"
                onClick={handleStartPresentation}
              >
                ▶ 全屏播放
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide Player */}
      {isSlideMode && presentation && (
        <div className="slide-mode-container">
          <SlidePlayer
            presentation={presentation}
            theme={theme}
            showControls={true}
            onExit={handleCloseSlides}
          />
        </div>
      )}

      {/* Screen Recorder */}
      {isScreenRecorderOpen && (
        <div className="screen-recorder-overlay">
          <div className="screen-recorder-close-btn" onClick={() => setIsScreenRecorderOpen(false)}>
            ✕
          </div>
          <ScreenRecorder
            onRecordingComplete={(blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `screen-recording-${Date.now()}.webm`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              setIsScreenRecorderOpen(false);
            }}
          />
        </div>
      )}

      {/* Screen Monitor */}
      {isScreenMonitorOpen && (
        <ScreenMonitor onClose={() => setIsScreenMonitorOpen(false)} />
      )}
    </div>
  );
}

export default App;
