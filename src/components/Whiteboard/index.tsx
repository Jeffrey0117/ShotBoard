import { useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { useProjectStore } from '../../stores/projectStore';

export interface WhiteboardAPI {
  insertImage: (dataUrl: string) => Promise<void>;
  getSceneData: () => any;
}

interface WhiteboardProps {
  className?: string;
}

export const Whiteboard = forwardRef<WhiteboardAPI, WhiteboardProps>(
  function Whiteboard({ className }, ref) {
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
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

    useImperativeHandle(ref, () => ({ insertImage, getSceneData }), [insertImage, getSceneData]);

    const handleChange = useCallback((elements: any, appState: any) => {
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
      <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Excalidraw
          excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
          onChange={handleChange}
          initialData={{
            appState: {
              viewBackgroundColor: '#1a1a2e',
              gridSize: null,
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
