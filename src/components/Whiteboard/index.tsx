import { useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { useProjectStore } from '../../stores/projectStore';
import type { WhiteboardPage } from '../../stores/pageStore';

export interface WhiteboardAPI {
  insertImage: (dataUrl: string) => Promise<void>;
  getSceneData: () => any;
  getExcalidrawAPI: () => ExcalidrawImperativeAPI | null;
  getCanvas: () => HTMLCanvasElement | null;
  getBackgroundColor: () => string;
  getZoom: () => number;
  // 分頁相關
  saveCurrentState: () => { elements: readonly ExcalidrawElement[]; files: BinaryFiles; appState: any } | null;
  loadPageState: (page: WhiteboardPage) => void;
  generateThumbnail: () => Promise<string | null>;
}

interface WhiteboardProps {
  className?: string;
}

// 基準筆畫粗細（zoom=1 時的粗細）
const BASE_STROKE_WIDTH = 2;

export const Whiteboard = forwardRef<WhiteboardAPI, WhiteboardProps>(
  function Whiteboard({ className }, ref) {
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const setDirty = useProjectStore((state) => state.setDirty);
    const updateCanvas = useProjectStore((state) => state.updateCanvas);
    const insertImageToStore = useProjectStore((state) => state.insertImage);

    // 追蹤上一次的 zoom 值，用於檢測 zoom 變化
    const lastZoomRef = useRef<number>(1);
    // 基準筆畫粗細（使用者在 zoom=1 時想要的粗細）
    const baseStrokeWidthRef = useRef<number>(BASE_STROKE_WIDTH);
    // 標記是否正在程式化更新，避免無限迴圈
    const isUpdatingRef = useRef<boolean>(false);

    const insertImage = useCallback(async (dataUrl: string) => {
      const api = excalidrawAPIRef.current;
      if (!api) return;

      insertImageToStore(dataUrl);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const width = Math.min(img.width, 800);
      const height = (img.height / img.width) * width;
      const imageId = `img_${Date.now()}`;

      const appState = api.getAppState();
      const x = -appState.scrollX + 100;
      const y = -appState.scrollY + 100;

      await api.addFiles([{
        id: imageId as any,
        dataURL: dataUrl as any,
        mimeType: 'image/png',
        created: Date.now(),
      }]);

      const currentElements = api.getSceneElements();
      api.updateScene({
        elements: [...currentElements, {
          id: imageId,
          type: 'image',
          x,
          y,
          width,
          height,
          fileId: imageId,
          strokeColor: 'transparent',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          roughness: 0,
          opacity: 100,
          angle: 0,
          groupIds: [],
          boundElements: null,
          locked: false,
          isDeleted: false,
          version: 1,
          versionNonce: Date.now(),
          seed: Math.random() * 1000000,
        } as any],
      });
    }, [insertImageToStore]);

    const getSceneData = useCallback(() => {
      const api = excalidrawAPIRef.current;
      if (!api) return null;
      return {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
      };
    }, []);

    const getExcalidrawAPI = useCallback(() => {
      return excalidrawAPIRef.current;
    }, []);

    const getCanvas = useCallback(() => {
      // Get the actual canvas element from Excalidraw's DOM
      if (!containerRef.current) return null;
      const canvas = containerRef.current.querySelector('.excalidraw__canvas') as HTMLCanvasElement;
      return canvas || containerRef.current.querySelector('canvas') as HTMLCanvasElement;
    }, []);

    const getBackgroundColor = useCallback(() => {
      const api = excalidrawAPIRef.current;
      if (!api) return '#1a1a2e';
      const appState = api.getAppState();
      return appState.viewBackgroundColor || '#1a1a2e';
    }, []);

    const getZoom = useCallback(() => {
      const api = excalidrawAPIRef.current;
      if (!api) return 1;
      return api.getAppState().zoom.value;
    }, []);

    const saveCurrentState = useCallback(() => {
      const api = excalidrawAPIRef.current;
      if (!api) return null;
      return {
        elements: api.getSceneElements(),
        files: api.getFiles(),
        appState: api.getAppState(),
      };
    }, []);

    const loadPageState = useCallback((page: WhiteboardPage) => {
      const api = excalidrawAPIRef.current;
      if (!api) return;

      // 載入頁面狀態
      api.updateScene({
        elements: page.elements as any,
        appState: {
          viewBackgroundColor: page.viewBackgroundColor,
          scrollX: page.scrollX,
          scrollY: page.scrollY,
          zoom: { value: page.zoom },
        },
      });

      // 載入檔案（圖片等）
      if (Object.keys(page.files).length > 0) {
        api.addFiles(Object.values(page.files));
      }
    }, []);

    const generateThumbnail = useCallback(async (): Promise<string | null> => {
      const api = excalidrawAPIRef.current;
      if (!api) return null;

      try {
        const elements = api.getSceneElements();
        const files = api.getFiles();
        const appState = api.getAppState();

        const blob = await exportToBlob({
          elements: elements as any,
          files,
          appState: {
            ...appState,
            exportBackground: true,
            viewBackgroundColor: appState.viewBackgroundColor,
          } as any,
          maxWidthOrHeight: 300,
        });

        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        return null;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      insertImage,
      getSceneData,
      getExcalidrawAPI,
      getCanvas,
      getBackgroundColor,
      getZoom,
      saveCurrentState,
      loadPageState,
      generateThumbnail,
    }), [insertImage, getSceneData, getExcalidrawAPI, getCanvas, getBackgroundColor, getZoom, saveCurrentState, loadPageState, generateThumbnail]);

    const handleChange = useCallback((_elements: any, appState: any) => {
      // Skip updates when editing text to prevent re-render issues
      if (appState.editingElement?.type === 'text') {
        return;
      }

      // Skip if we're currently updating programmatically
      if (isUpdatingRef.current) {
        return;
      }

      const api = excalidrawAPIRef.current;
      const currentZoom = appState.zoom.value;
      const lastZoom = lastZoomRef.current;
      const currentStrokeWidth = appState.currentItemStrokeWidth;

      // 檢測 zoom 變化
      if (Math.abs(currentZoom - lastZoom) > 0.001) {
        // Zoom 變化，調整筆畫粗細以保持視覺一致性
        // 公式：adjustedStrokeWidth = baseStrokeWidth / zoom
        const adjustedStrokeWidth = Math.max(0.5, baseStrokeWidthRef.current / currentZoom);

        // 只有當 stroke width 與預期不符時才更新
        if (api && Math.abs(currentStrokeWidth - adjustedStrokeWidth) > 0.01) {
          isUpdatingRef.current = true;
          api.updateScene({
            appState: {
              currentItemStrokeWidth: adjustedStrokeWidth,
            },
          });
          // 使用 setTimeout 確保 flag 在下一個 event loop 才重置
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 0);
        }

        lastZoomRef.current = currentZoom;
      } else {
        // Zoom 沒變，檢查使用者是否手動改變了筆畫粗細
        const expectedStrokeWidth = baseStrokeWidthRef.current / currentZoom;

        // 如果當前粗細與預期差異較大，代表使用者手動改變
        if (Math.abs(currentStrokeWidth - expectedStrokeWidth) > 0.1) {
          // 更新基準粗細：baseStrokeWidth = currentStrokeWidth * currentZoom
          baseStrokeWidthRef.current = currentStrokeWidth * currentZoom;
        }
      }

      setDirty(true);
      updateCanvas({
        viewportX: appState.scrollX,
        viewportY: appState.scrollY,
        zoom: appState.zoom.value,
      });
    }, [setDirty, updateCanvas]);

    return (
      <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Excalidraw
          excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
          onChange={handleChange}
          initialData={{
            appState: {
              viewBackgroundColor: '#1a1a2e',
              gridSize: null,
              currentItemStrokeColor: '#ffffff',
              currentItemBackgroundColor: '#3d5a80',
              currentItemFillStyle: 'solid',
              currentItemStrokeWidth: BASE_STROKE_WIDTH,
              currentItemFontFamily: 1,
              currentItemFontSize: 20,
            },
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              saveAsImage: false,
            },
          }}
          theme="dark"
        />
      </div>
    );
  }
);

export default Whiteboard;
