/**
 * ProgressBar Component
 * Displays presentation progress with clickable navigation
 * @module components/Slides/ProgressBar
 */

import { motion } from 'framer-motion';
import { useMemo, useCallback, type FC, type MouseEvent } from 'react';

export interface ProgressBarProps {
  current: number;
  total: number;
  onClick?: (index: number) => void;
  position?: 'top' | 'bottom';
  showSegments?: boolean;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  current,
  total,
  onClick,
  position = 'top',
  showSegments = true,
}) => {
  const progress = useMemo(() => {
    if (total <= 0) return 0;
    return ((current - 1) / Math.max(total - 1, 1)) * 100;
  }, [current, total]);

  const segments = useMemo(() => {
    if (!showSegments || total <= 1) return [];
    return Array.from({ length: total }, (_, i) => i);
  }, [total, showSegments]);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!onClick || total <= 1) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const index = Math.round(percentage * (total - 1));
      const clampedIndex = Math.max(0, Math.min(total - 1, index));

      onClick(clampedIndex);
    },
    [onClick, total]
  );

  const handleSegmentClick = useCallback(
    (index: number) => {
      if (onClick) {
        onClick(index);
      }
    },
    [onClick]
  );

  return (
    <div
      className={`slides-progress-bar slides-progress-bar--${position}`}
      onClick={handleClick}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Slide ${current} of ${total}`}
    >
      {/* Continuous Progress Bar */}
      <div className="slides-progress-track">
        <motion.div
          className="slides-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Segment Indicators */}
      {showSegments && segments.length > 1 && (
        <div className="slides-progress-segments">
          {segments.map((index) => (
            <button
              key={index}
              className={`slides-progress-segment ${index < current ? 'visited' : ''} ${index === current - 1 ? 'current' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSegmentClick(index);
              }}
              title={`Go to slide ${index + 1}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        .slides-progress-bar {
          position: fixed;
          left: 0;
          right: 0;
          height: 24px;
          padding: 8px 24px;
          cursor: pointer;
          z-index: 999;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
        }

        .slides-progress-bar--top {
          top: 0;
        }

        .slides-progress-bar--bottom {
          bottom: 80px;
        }

        .slides-progress-track {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .slides-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #5c6bc0, #7986cb);
          border-radius: 2px;
        }

        .slides-progress-segments {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          padding: 0 24px;
          pointer-events: none;
        }

        .slides-progress-segment {
          width: 8px;
          height: 8px;
          padding: 0;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          pointer-events: auto;
          transition: all 0.15s ease;
          position: relative;
        }

        .slides-progress-segment::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
        }

        .slides-progress-segment:hover {
          transform: scale(1.3);
          background: rgba(255, 255, 255, 0.4);
        }

        .slides-progress-segment.visited {
          background: rgba(92, 107, 192, 0.6);
        }

        .slides-progress-segment.current {
          background: #7986cb;
          transform: scale(1.4);
          box-shadow: 0 0 8px rgba(121, 134, 203, 0.6);
        }

        .slides-progress-segment.current:hover {
          transform: scale(1.5);
        }

        /* Hide segments when there are too many */
        .slides-progress-segments:has(.slides-progress-segment:nth-child(31)) {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
