import { useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { useProjectStore } from '../../stores/projectStore';

export interface WhiteboardAPI {
  insertImage: (dataUrl: string) => Promise<void>;
  getSceneData: () => any;
  getExcalidrawAPI: () => ExcalidrawImperativeAPI | null;
  getCanvas: () => HTMLCanvasElement | null;
  getBackgroundColor: () => string;
}

interface WhiteboardProps {
  className?: string;
}

export const Whiteboard = forwardRef<WhiteboardAPI, WhiteboardProps>(
  function Whiteboard({ className }, ref) {
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const setDirty = useProjectStore((state) => state.setDirty);
    const updateCanvas = useProjectStore((state) => state.updateCanvas);
    const insertImageToStore = useProjectStore((state) => state.insertImage);

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

    useImperativeHandle(ref, () => ({ insertImage, getSceneData, getExcalidrawAPI, getCanvas, getBackgroundColor }), [insertImage, getSceneData, getExcalidrawAPI, getCanvas, getBackgroundColor]);

    const handleChange = useCallback((_elements: any, appState: any) => {
      // Skip updates when editing text to prevent re-render issues
      if (appState.editingElement?.type === 'text') {
        return;
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
