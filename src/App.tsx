import { useRef, useEffect, useCallback } from 'react';
import { Whiteboard, WhiteboardAPI } from './components/Whiteboard';
import { Toolbar } from './components/Toolbar';
import { PagePanel } from './components/PagePanel';
import { CameraBubble } from './components/Recorder/CameraBubble';
import { useRecorder } from './components/Recorder/useRecorder';
import { useProjectStore } from './stores/projectStore';
import { usePageStore } from './stores/pageStore';
import './App.css';

function App() {
  const whiteboardRef = useRef<WhiteboardAPI>(null);
  const isDirty = useProjectStore((state) => state.isDirty);

  // Page store
  const currentPageId = usePageStore((state) => state.currentPageId);
  const saveCurrentPageState = usePageStore((state) => state.saveCurrentPageState);
  const updateThumbnail = usePageStore((state) => state.updateThumbnail);
  const getPageById = usePageStore((state) => state.getPageById);
  const pages = usePageStore((state) => state.pages);

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

        <div className="whiteboard-wrapper">
          <Whiteboard ref={whiteboardRef} className="whiteboard-container" />
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
    </div>
  );
}

export default App;
