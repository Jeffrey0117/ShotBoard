import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ScreenshotOverlay: React.FC = () => {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 計算選取框的 bounds
  const getSelectionBounds = useCallback((): SelectionBounds | null => {
    if (!startPoint || !endPoint) return null;

    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    return { x, y, width, height };
  }, [startPoint, endPoint]);

  // 接收背景截圖
  useEffect(() => {
    const handleBackground = (_event: unknown, dataURL: string) => {
      setBackgroundImage(dataURL);
    };

    window.electronAPI?.onScreenshotBackground(handleBackground);

    return () => {
      window.electronAPI?.removeScreenshotBackgroundListener();
    };
  }, []);

  // ESC 取消
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI?.cancelScreenshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 滑鼠按下 - 開始選取
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setEndPoint({ x: e.clientX, y: e.clientY });
  };

  // 滑鼠移動 - 更新選取框
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    setEndPoint({ x: e.clientX, y: e.clientY });
  };

  // 滑鼠放開 - 確認選取
  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const bounds = getSelectionBounds();
    if (bounds && bounds.width > 10 && bounds.height > 10) {
      window.electronAPI?.confirmScreenshotRegion(bounds);
    }
  };

  const bounds = getSelectionBounds();

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        cursor: 'crosshair',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 背景截圖 */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 半透明遮罩 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none',
        }}
      />

      {/* 選取框 - 透明區域 */}
      {bounds && bounds.width > 0 && bounds.height > 0 && (
        <>
          {/* 選取區域（顯示原始畫面） */}
          <div
            style={{
              position: 'absolute',
              left: bounds.x,
              top: bounds.y,
              width: bounds.width,
              height: bounds.height,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {backgroundImage && (
              <img
                src={backgroundImage}
                alt=""
                style={{
                  position: 'absolute',
                  top: -bounds.y,
                  left: -bounds.x,
                  width: '100vw',
                  height: '100vh',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>

          {/* 選取框邊框 */}
          <div
            style={{
              position: 'absolute',
              left: bounds.x,
              top: bounds.y,
              width: bounds.width,
              height: bounds.height,
              border: '2px dashed #fff',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none',
            }}
          />

          {/* 尺寸標籤 */}
          <div
            style={{
              position: 'absolute',
              left: bounds.x,
              top: bounds.y - 28,
              padding: '4px 8px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'monospace',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          >
            {Math.round(bounds.width)} x {Math.round(bounds.height)}
          </div>
        </>
      )}

      {/* 提示文字 */}
      {!isSelecting && !bounds && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            fontSize: '18px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        >
          Drag to select area, press ESC to cancel
        </div>
      )}
    </div>
  );
};

export default ScreenshotOverlay;
