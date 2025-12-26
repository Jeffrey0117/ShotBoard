import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { BubbleConfig, CameraShape } from '../../utils/compositor';

export interface CameraSettings {
  shape: CameraShape;
  visible: boolean;
  borderRadius: number;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  shape: 'circle',
  visible: true,
  borderRadius: 16,
};

interface CameraBubbleProps {
  stream: MediaStream | null;
  onBubbleConfigChange?: (config: BubbleConfig) => void;
  recordingWidth?: number;
  recordingHeight?: number;
  settings: CameraSettings;
  onSettingsChange: (settings: CameraSettings) => void;
}

export const CameraBubble: React.FC<CameraBubbleProps> = ({
  stream,
  onBubbleConfigChange,
  recordingWidth = 1920,
  recordingHeight = 1080,
  settings,
  onSettingsChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 140, y: window.innerHeight - 140 });
  const [size, setSize] = useState(120);
  const [isDragging, setIsDragging] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Convert screen coordinates to recording canvas coordinates
  const toRecordingCoords = useCallback((screenX: number, screenY: number, screenSize: number): BubbleConfig => {
    const scaleX = recordingWidth / window.innerWidth;
    const scaleY = recordingHeight / window.innerHeight;
    const scale = Math.min(scaleX, scaleY);
    return {
      x: screenX * scaleX,
      y: screenY * scaleY,
      diameter: screenSize * scale,
      shape: settings.shape,
      visible: settings.visible,
      borderRadius: settings.borderRadius,
    };
  }, [recordingWidth, recordingHeight, settings]);

  // Report position changes to parent
  useEffect(() => {
    if (onBubbleConfigChange) {
      const config = toRecordingCoords(position.x, position.y, size);
      onBubbleConfigChange(config);
    }
  }, [position, size, onBubbleConfigChange, toRecordingCoords]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'h':
          onSettingsChange({ ...settings, visible: !settings.visible });
          break;
        case '1':
          onSettingsChange({ ...settings, shape: 'circle' });
          break;
        case '2':
          onSettingsChange({ ...settings, shape: 'square' });
          break;
        case '3':
          onSettingsChange({ ...settings, shape: 'rounded' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings, onSettingsChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - size, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - size, e.clientY - dragOffset.current.y)),
    });
  }, [isDragging, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setSize((prev) => Math.max(80, Math.min(300, prev + delta)));
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleShapeChange = (shape: CameraShape) => {
    onSettingsChange({ ...settings, shape });
  };

  const handleVisibilityToggle = () => {
    onSettingsChange({ ...settings, visible: !settings.visible });
  };

  const getBorderRadius = (): string => {
    switch (settings.shape) {
      case 'circle':
        return '50%';
      case 'square':
        return '0';
      case 'rounded':
        return `${settings.borderRadius}px`;
      default:
        return '50%';
    }
  };

  if (!stream) return null;

  // Show minimal button when camera is hidden
  if (!settings.visible) {
    return (
      <button
        onClick={handleVisibilityToggle}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 99999,
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 8,
          color: '#fff',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
        }}
      >
        <span style={{ opacity: 0.7 }}>CAM</span>
        <span>Show</span>
      </button>
    );
  }

  return (
    <div
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => !isDragging && setShowToolbar(false)}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y - (showToolbar ? 48 : 0),
        zIndex: 99999,
      }}
    >
      {/* Control toolbar */}
      {showToolbar && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '4px 8px',
            marginBottom: 4,
            background: 'rgba(0, 0, 0, 0.75)',
            borderRadius: 8,
            backdropFilter: 'blur(8px)',
            width: 'fit-content',
          }}
        >
          <ShapeButton
            active={settings.shape === 'circle'}
            onClick={() => handleShapeChange('circle')}
            title="Circle (1)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </ShapeButton>
          <ShapeButton
            active={settings.shape === 'square'}
            onClick={() => handleShapeChange('square')}
            title="Square (2)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </ShapeButton>
          <ShapeButton
            active={settings.shape === 'rounded'}
            onClick={() => handleShapeChange('rounded')}
            title="Rounded (3)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </ShapeButton>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.3)', margin: '4px 4px' }} />
          <ShapeButton
            active={false}
            onClick={handleVisibilityToggle}
            title="Hide (H)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3C4.5 3 1.5 6 0 8c1.5 2 4.5 5 8 5s6.5-3 8-5c-1.5-2-4.5-5-8-5zm0 8a3 3 0 110-6 3 3 0 010 6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </ShapeButton>
        </div>
      )}

      {/* Camera preview */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{
          width: size,
          height: size,
          borderRadius: getBorderRadius(),
          overflow: 'hidden',
          border: '3px solid #fff',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundColor: '#000',
          userSelect: 'none',
          transition: 'border-radius 0.2s ease',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

// Shape button component
const ShapeButton: React.FC<{
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ active, onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 28,
      height: 28,
      border: 'none',
      background: active ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
      color: '#fff',
      cursor: 'pointer',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: active ? 1 : 0.6,
      transition: 'opacity 0.2s, background 0.2s',
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.opacity = '1';
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.opacity = '0.6';
      e.currentTarget.style.background = active ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
    }}
  >
    {children}
  </button>
);
