import React, { useRef, useEffect } from 'react';

interface CameraBubbleProps {
  stream: MediaStream | null;
  size?: number;
  position?: { bottom: number; right: number };
}

export const CameraBubble: React.FC<CameraBubbleProps> = ({
  stream,
  size = 120,
  position = { bottom: 20, right: 20 },
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: position.bottom,
        right: position.right,
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid #fff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
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
          transform: 'scaleX(-1)', // Mirror effect
        }}
      />
    </div>
  );
};
