/**
 * PresenterView Component
 * Presenter view with current slide, next slide preview, notes, and timer
 * @module components/Slides/PresenterView
 */

import { useCallback, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import type { Presentation, Slide } from '../../types/slide';
import { usePresentationTimer } from '../../hooks/usePresentationTimer';

export interface PresenterViewProps {
  presentation: Presentation;
  currentSlideIndex: number;
  currentClickIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
  onGoTo: (index: number) => void;
}

// SVG Icons
const ChevronLeftIcon: FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon: FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PlayIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const ResetIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

// Slide Preview Component
const SlidePreview: FC<{
  slide: Slide | null;
  label: string;
  size: 'large' | 'small';
  clickIndex?: number;
}> = ({ slide, label, size, clickIndex }) => {
  const getSlideTitle = (s: Slide): string => {
    const titleMatch = s.rawContent.match(/^#\s+(.+)$/m);
    if (titleMatch) return titleMatch[1].trim();
    const h2Match = s.rawContent.match(/^##\s+(.+)$/m);
    if (h2Match) return h2Match[1].trim();
    return `Slide ${s.index + 1}`;
  };

  const getSlideContent = (s: Slide): string => {
    return s.rawContent
      .replace(/^#{1,6}\s+.+$/gm, '')
      .replace(/```[\s\S]*?```/g, '[code block]')
      .replace(/\{v-click[^}]*\}/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\n+/g, '\n')
      .trim();
  };

  return (
    <div className={`presenter-slide-preview presenter-slide-preview--${size}`}>
      <div className="presenter-slide-label">{label}</div>
      <div className="presenter-slide-frame">
        {slide ? (
          <div className="presenter-slide-content">
            <h3 className="presenter-slide-title">{getSlideTitle(slide)}</h3>
            <div className="presenter-slide-body">
              {getSlideContent(slide).split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {size === 'large' && clickIndex !== undefined && slide.meta.clicks && slide.meta.clicks > 0 && (
              <div className="presenter-slide-clicks">
                Click: {clickIndex} / {slide.meta.clicks}
              </div>
            )}
          </div>
        ) : (
          <div className="presenter-slide-empty">
            End of presentation
          </div>
        )}
      </div>
    </div>
  );
};

export const PresenterView: FC<PresenterViewProps> = ({
  presentation,
  currentSlideIndex,
  currentClickIndex,
  onNavigate,
  onGoTo,
}) => {
  const { formattedTime, isRunning, start, pause, reset } = usePresentationTimer();

  const currentSlide = presentation.slides[currentSlideIndex] || null;
  const nextSlide = presentation.slides[currentSlideIndex + 1] || null;
  const totalSlides = presentation.slides.length;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          onNavigate('next');
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          onNavigate('prev');
          break;
        case 'Home':
          e.preventDefault();
          onGoTo(0);
          break;
        case 'End':
          e.preventDefault();
          onGoTo(totalSlides - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onGoTo, totalSlides]);

  // Auto-start timer
  useEffect(() => {
    if (!isRunning) {
      start();
    }
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, start, pause]);

  return (
    <div className="presenter-view">
      {/* Header */}
      <header className="presenter-header">
        <h1 className="presenter-title">{presentation.meta.title}</h1>
        <div className="presenter-info">
          <span className="presenter-author">{presentation.meta.author}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="presenter-main">
        {/* Left: Current Slide */}
        <div className="presenter-current">
          <SlidePreview
            slide={currentSlide}
            label={`Current Slide (${currentSlideIndex + 1}/${totalSlides})`}
            size="large"
            clickIndex={currentClickIndex}
          />
        </div>

        {/* Right Side Panel */}
        <div className="presenter-side">
          {/* Next Slide Preview */}
          <SlidePreview
            slide={nextSlide}
            label="Next"
            size="small"
          />

          {/* Speaker Notes */}
          <div className="presenter-notes">
            <div className="presenter-notes-label">Speaker Notes</div>
            <div className="presenter-notes-content">
              {currentSlide?.meta.notes ? (
                <p>{currentSlide.meta.notes}</p>
              ) : (
                <p className="presenter-notes-empty">No notes for this slide</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="presenter-footer">
        {/* Timer */}
        <div className="presenter-timer">
          <motion.span
            className="presenter-time"
            animate={{ opacity: isRunning ? 1 : [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: isRunning ? 0 : Infinity }}
          >
            {formattedTime}
          </motion.span>
          <button
            className="presenter-timer-btn"
            onClick={toggleTimer}
            title={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            className="presenter-timer-btn"
            onClick={reset}
            title="Reset timer"
          >
            <ResetIcon />
          </button>
        </div>

        {/* Navigation */}
        <div className="presenter-nav">
          <button
            className="presenter-nav-btn"
            onClick={() => onNavigate('prev')}
            disabled={currentSlideIndex === 0 && currentClickIndex === 0}
            title="Previous (Left Arrow)"
          >
            <ChevronLeftIcon />
            <span>Previous</span>
          </button>

          <div className="presenter-slide-count">
            <span className="presenter-slide-current">{currentSlideIndex + 1}</span>
            <span className="presenter-slide-sep">/</span>
            <span className="presenter-slide-total">{totalSlides}</span>
          </div>

          <button
            className="presenter-nav-btn"
            onClick={() => onNavigate('next')}
            disabled={currentSlideIndex >= totalSlides - 1}
            title="Next (Right Arrow)"
          >
            <span>Next</span>
            <ChevronRightIcon />
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="presenter-shortcuts">
          <kbd>Space</kbd> / <kbd>Arrow</kbd> Navigate
        </div>
      </footer>

      <style>{`
        .presenter-view {
          width: 100%;
          height: 100vh;
          background: #0f0f23;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          font-family: Inter, system-ui, sans-serif;
        }

        /* Header */
        .presenter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: #1a1a2e;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .presenter-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: #e0e0e0;
        }

        .presenter-info {
          font-size: 13px;
          color: #888;
        }

        /* Main Content */
        .presenter-main {
          flex: 1;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          padding: 24px;
          min-height: 0;
        }

        .presenter-current {
          display: flex;
          flex-direction: column;
        }

        .presenter-side {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Slide Preview */
        .presenter-slide-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .presenter-slide-preview--large {
          flex: 1;
        }

        .presenter-slide-preview--small {
          flex: 0 0 auto;
        }

        .presenter-slide-label {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .presenter-slide-frame {
          flex: 1;
          background: #1a1a2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          min-height: 0;
        }

        .presenter-slide-preview--small .presenter-slide-frame {
          aspect-ratio: 16 / 9;
        }

        .presenter-slide-content {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: auto;
        }

        .presenter-slide-title {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 16px 0;
        }

        .presenter-slide-preview--small .presenter-slide-title {
          font-size: 14px;
          margin-bottom: 8px;
        }

        .presenter-slide-body {
          flex: 1;
          color: #b0b0b0;
          font-size: 16px;
          line-height: 1.6;
          overflow: auto;
        }

        .presenter-slide-preview--small .presenter-slide-body {
          font-size: 12px;
          line-height: 1.4;
        }

        .presenter-slide-body p {
          margin: 0 0 8px 0;
        }

        .presenter-slide-clicks {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(92, 107, 192, 0.2);
          border-radius: 6px;
          font-size: 13px;
          color: #7986cb;
        }

        .presenter-slide-empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 14px;
        }

        /* Speaker Notes */
        .presenter-notes {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
        }

        .presenter-notes-label {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .presenter-notes-content {
          flex: 1;
          padding: 16px;
          background: #1a1a2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: auto;
          font-size: 14px;
          line-height: 1.6;
          color: #b0b0b0;
        }

        .presenter-notes-content p {
          margin: 0;
        }

        .presenter-notes-empty {
          color: #555;
          font-style: italic;
        }

        /* Footer */
        .presenter-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #1a1a2e;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Timer */
        .presenter-timer {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .presenter-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 600;
          color: #ffffff;
          min-width: 120px;
        }

        .presenter-timer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: #b0b0b0;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .presenter-timer-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        /* Navigation */
        .presenter-nav {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .presenter-nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background: #2a2a4e;
          color: #e0e0e0;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .presenter-nav-btn:hover:not(:disabled) {
          background: #3a3a5e;
        }

        .presenter-nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .presenter-slide-count {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 18px;
        }

        .presenter-slide-current {
          color: #ffffff;
          font-weight: 600;
        }

        .presenter-slide-sep {
          color: #555;
        }

        .presenter-slide-total {
          color: #888;
        }

        /* Shortcuts */
        .presenter-shortcuts {
          font-size: 12px;
          color: #666;
        }

        .presenter-shortcuts kbd {
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-family: inherit;
          margin: 0 2px;
        }

        /* Scrollbars */
        .presenter-notes-content::-webkit-scrollbar,
        .presenter-slide-body::-webkit-scrollbar {
          width: 6px;
        }

        .presenter-notes-content::-webkit-scrollbar-track,
        .presenter-slide-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .presenter-notes-content::-webkit-scrollbar-thumb,
        .presenter-slide-body::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default PresenterView;
