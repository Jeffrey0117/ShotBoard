import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { BubbleConfig } from '../../utils/compositor';

interface CameraBubbleProps {
  stream: MediaStream | null;
  onBubbleConfigChange?: (config: BubbleConfig) => void;
  recordingWidth?: number;
  recordingHeight?: number;
}

export const CameraBubble: React.FC<CameraBubbleProps> = ({
  stream,
  onBubbleConfigChange,
  recordingWidth = 1920,
  recordingHeight = 1080,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 140, y: window.innerHeight - 140 });
  const [size, setSize] = useState(120);
  const [isDragging, setIsDragging] = useState(false);
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
    };
  }, [recordingWidth, recordingHeight]);

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

  if (!stream) return null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid #fff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 99999,
        cursor: isDragging ? 'grabbing' : 'grab',
        backgroundColor: '#000',
        userSelect: 'none',
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
  );
};
