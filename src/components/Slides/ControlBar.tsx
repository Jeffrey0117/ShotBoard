/**
 * ControlBar Component
 * Bottom control bar for presentation playback
 * @module components/Slides/ControlBar
 */

import { motion } from 'framer-motion';
import type { FC } from 'react';

export interface ControlBarProps {
  currentSlide: number;
  totalSlides: number;
  isPlaying: boolean;
  isFullscreen: boolean;
  isAnnotationEnabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleFullscreen: () => void;
  onToggleAnnotation: () => void;
  onShowOverview: () => void;
  onOpenPresenterView: () => void;
}

// SVG Icons as components
const ChevronLeftIcon: FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon: FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const FullscreenIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const ExitFullscreenIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

const PenIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const GridIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const PresenterIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export const ControlBar: FC<ControlBarProps> = ({
  currentSlide,
  totalSlides,
  isPlaying,
  isFullscreen,
  isAnnotationEnabled,
  onPrev,
  onNext,
  onToggleFullscreen,
  onToggleAnnotation,
  onShowOverview,
  onOpenPresenterView,
}) => {
  const isFirstSlide = currentSlide <= 1;
  const isLastSlide = currentSlide >= totalSlides;

  return (
    <motion.div
      className="slides-control-bar"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="slides-control-bar-inner">
        {/* Navigation Group */}
        <div className="slides-control-group">
          <button
            className="slides-control-btn"
            onClick={onPrev}
            disabled={isFirstSlide}
            title="Previous slide (Left Arrow)"
            aria-label="Previous slide"
          >
            <ChevronLeftIcon />
          </button>

          <div className="slides-page-indicator">
            <span className="slides-current-page">{currentSlide}</span>
            <span className="slides-page-separator">/</span>
            <span className="slides-total-pages">{totalSlides}</span>
          </div>

          <button
            className="slides-control-btn"
            onClick={onNext}
            disabled={isLastSlide}
            title="Next slide (Right Arrow)"
            aria-label="Next slide"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Tools Group */}
        <div className="slides-control-group">
          <button
            className={`slides-control-btn ${isAnnotationEnabled ? 'active' : ''}`}
            onClick={onToggleAnnotation}
            title="Toggle annotation mode (A)"
            aria-label="Toggle annotation mode"
            aria-pressed={isAnnotationEnabled}
          >
            <PenIcon />
          </button>

          <button
            className="slides-control-btn"
            onClick={onShowOverview}
            title="Show slide overview (G)"
            aria-label="Show slide overview"
          >
            <GridIcon />
          </button>

          <button
            className="slides-control-btn"
            onClick={onOpenPresenterView}
            title="Open presenter view (P)"
            aria-label="Open presenter view"
          >
            <PresenterIcon />
          </button>

          <button
            className={`slides-control-btn ${isFullscreen ? 'active' : ''}`}
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>

      <style>{`
        .slides-control-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          pointer-events: auto;
        }

        .slides-control-bar-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 16px;
          background: rgba(26, 26, 46, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }

        .slides-control-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .slides-control-group:not(:last-child) {
          padding-right: 12px;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }

        .slides-control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #b0b0b0;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .slides-control-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .slides-control-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .slides-control-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .slides-control-btn.active {
          background: rgba(92, 107, 192, 0.3);
          color: #7986cb;
        }

        .slides-control-btn.active:hover {
          background: rgba(92, 107, 192, 0.4);
        }

        .slides-page-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          min-width: 70px;
          justify-content: center;
        }

        .slides-current-page {
          color: #ffffff;
          font-weight: 600;
        }

        .slides-page-separator {
          color: #666;
        }

        .slides-total-pages {
          color: #888;
        }
      `}</style>
    </motion.div>
  );
};

export default ControlBar;
