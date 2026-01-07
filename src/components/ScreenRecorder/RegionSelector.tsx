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

/**
 * RegionSelector - 用於螢幕錄影的區域選擇器
 *
 * 功能：
 * - 全螢幕顯示背景截圖
 * - 拖曳選取錄製區域
 * - 顯示選取區域尺寸
 * - ESC 取消選取
 */
const RegionSelector: React.FC = () => {
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

    window.electronAPI?.onRegionSelectorBackground(handleBackground);

    return () => {
      window.electronAPI?.removeRegionSelectorBackgroundListener();
    };
  }, []);

  // ESC 取消
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI?.cancelRecordingRegion();
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
    if (bounds && bounds.width > 50 && bounds.height > 50) {
      window.electronAPI?.confirmRecordingRegion(bounds);
    }
  };

  const bounds = getSelectionBounds();

  // 計算建議的解析度（常見比例）
  const getSuggestedResolution = (width: number, height: number): string => {
    const aspect = width / height;
    if (Math.abs(aspect - 16 / 9) < 0.1) return '16:9';
    if (Math.abs(aspect - 4 / 3) < 0.1) return '4:3';
    if (Math.abs(aspect - 21 / 9) < 0.1) return '21:9';
    return `${(aspect).toFixed(2)}:1`;
  };

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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          pointerEvents: 'none',
        }}
      />

      {/* 選取框 */}
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
              border: '2px solid #6366f1',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)',
              pointerEvents: 'none',
            }}
          />

          {/* 角落調整手柄 */}
          {['nw', 'ne', 'sw', 'se'].map((pos) => {
            const style: React.CSSProperties = {
              position: 'absolute',
              width: 10,
              height: 10,
              background: '#6366f1',
              border: '2px solid #fff',
              borderRadius: 2,
              pointerEvents: 'none',
            };

            if (pos.includes('n')) style.top = bounds.y - 5;
            if (pos.includes('s')) style.top = bounds.y + bounds.height - 5;
            if (pos.includes('w')) style.left = bounds.x - 5;
            if (pos.includes('e')) style.left = bounds.x + bounds.width - 5;

            return <div key={pos} style={style} />;
          })}

          {/* 尺寸標籤 */}
          <div
            style={{
              position: 'absolute',
              left: bounds.x + bounds.width / 2,
              top: bounds.y - 40,
              transform: 'translateX(-50%)',
              padding: '6px 12px',
              backgroundColor: 'rgba(99, 102, 241, 0.95)',
              color: '#fff',
              fontSize: '13px',
              fontFamily: "'SF Mono', Monaco, monospace",
              fontWeight: 500,
              borderRadius: '6px',
              pointerEvents: 'none',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span>
              {Math.round(bounds.width)} x {Math.round(bounds.height)}
            </span>
            <span
              style={{
                opacity: 0.7,
                fontSize: '11px',
              }}
            >
              {getSuggestedResolution(bounds.width, bounds.height)}
            </span>
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
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: '20px',
              fontWeight: 500,
              marginBottom: '12px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            拖曳選取錄製區域
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
            }}
          >
            按 ESC 取消
          </div>
        </div>
      )}

      {/* 快捷鍵提示 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '24px',
          padding: '10px 20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: '#aaa', fontSize: '13px' }}>
          <kbd
            style={{
              padding: '2px 6px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              marginRight: '6px',
            }}
          >
            ESC
          </kbd>
          取消
        </span>
      </div>
    </div>
  );
};

export default RegionSelector;
