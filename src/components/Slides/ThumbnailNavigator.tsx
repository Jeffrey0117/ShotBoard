/**
 * ThumbnailNavigator Component
 * Grid view of all slides with thumbnails for quick navigation
 * @module components/Slides/ThumbnailNavigator
 */

import { useCallback, useEffect, useRef, type FC, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide } from '../../types/slide';

export interface ThumbnailNavigatorProps {
  slides: Slide[];
  currentIndex: number;
  onSelect: (index: number) => void;
  visible: boolean;
  onClose: () => void;
}

// Backdrop animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Container animation variants
const containerVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
      staggerChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};

// Thumbnail animation variants
const thumbnailVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
    },
  },
};

const CloseIcon: FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ThumbnailNavigator: FC<ThumbnailNavigatorProps> = ({
  slides,
  currentIndex,
  onSelect,
  visible,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentThumbnailRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return;

      const cols = Math.floor((window.innerWidth - 100) / 240);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(currentIndex);
          onClose();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < slides.length - 1) {
            onSelect(currentIndex + 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            onSelect(currentIndex - 1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex + cols < slides.length) {
            onSelect(currentIndex + cols);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex - cols >= 0) {
            onSelect(currentIndex - cols);
          }
          break;
        case 'Home':
          e.preventDefault();
          onSelect(0);
          break;
        case 'End':
          e.preventDefault();
          onSelect(slides.length - 1);
          break;
      }
    },
    [visible, currentIndex, slides.length, onSelect, onClose]
  );

  // Focus current thumbnail when visible
  useEffect(() => {
    if (visible && currentThumbnailRef.current) {
      currentThumbnailRef.current.focus();
    }
  }, [visible, currentIndex]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Extract title from slide content
  const getSlideTitle = (slide: Slide): string => {
    const titleMatch = slide.rawContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    const h2Match = slide.rawContent.match(/^##\s+(.+)$/m);
    if (h2Match) {
      return h2Match[1].trim();
    }
    return `Slide ${slide.index + 1}`;
  };

  // Generate preview text
  const getPreviewText = (slide: Slide): string => {
    const content = slide.rawContent
      .replace(/^#{1,6}\s+.+$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\{v-click[^}]*\}/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    return content.length > 100 ? content.slice(0, 100) + '...' : content;
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="thumbnail-navigator-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={containerRef}
            className="thumbnail-navigator-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="thumbnail-navigator-header">
              <h2 className="thumbnail-navigator-title">Slide Overview</h2>
              <span className="thumbnail-navigator-count">{slides.length} slides</span>
              <button
                className="thumbnail-navigator-close"
                onClick={onClose}
                title="Close (ESC)"
                aria-label="Close overview"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Thumbnail Grid */}
            <div className="thumbnail-navigator-grid">
              {slides.map((slide, index) => (
                <motion.button
                  key={slide.id}
                  ref={index === currentIndex ? currentThumbnailRef : undefined}
                  className={`thumbnail-item ${index === currentIndex ? 'current' : ''}`}
                  variants={thumbnailVariants}
                  onClick={() => {
                    onSelect(index);
                    onClose();
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  tabIndex={0}
                  aria-label={`Go to slide ${index + 1}: ${getSlideTitle(slide)}`}
                  aria-current={index === currentIndex ? 'true' : undefined}
                >
                  {/* Slide Number Badge */}
                  <div className="thumbnail-number">{index + 1}</div>

                  {/* Thumbnail Preview */}
                  <div className="thumbnail-preview">
                    <div className="thumbnail-content">
                      <h3 className="thumbnail-title">{getSlideTitle(slide)}</h3>
                      <p className="thumbnail-text">{getPreviewText(slide)}</p>
                    </div>
                  </div>

                  {/* Current Indicator */}
                  {index === currentIndex && (
                    <motion.div
                      className="thumbnail-current-indicator"
                      layoutId="currentIndicator"
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Footer with keyboard shortcuts */}
            <div className="thumbnail-navigator-footer">
              <span className="thumbnail-shortcut"><kbd>Arrow</kbd> Navigate</span>
              <span className="thumbnail-shortcut"><kbd>Enter</kbd> Select</span>
              <span className="thumbnail-shortcut"><kbd>ESC</kbd> Close</span>
            </div>
          </motion.div>

          <style>{`
            .thumbnail-navigator-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              z-index: 2000;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 40px;
            }

            .thumbnail-navigator-container {
              width: 100%;
              max-width: 1200px;
              max-height: 100%;
              background: #1a1a2e;
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }

            .thumbnail-navigator-header {
              display: flex;
              align-items: center;
              padding: 16px 24px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              gap: 12px;
            }

            .thumbnail-navigator-title {
              font-size: 18px;
              font-weight: 600;
              color: #ffffff;
              margin: 0;
            }

            .thumbnail-navigator-count {
              font-size: 13px;
              color: #888;
              margin-left: 8px;
            }

            .thumbnail-navigator-close {
              margin-left: auto;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              padding: 0;
              border: none;
              border-radius: 8px;
              background: transparent;
              color: #888;
              cursor: pointer;
              transition: all 0.15s ease;
            }

            .thumbnail-navigator-close:hover {
              background: rgba(255, 255, 255, 0.1);
              color: #ffffff;
            }

            .thumbnail-navigator-grid {
              flex: 1;
              overflow-y: auto;
              padding: 24px;
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              gap: 16px;
            }

            .thumbnail-item {
              position: relative;
              aspect-ratio: 16 / 9;
              background: #252535;
              border: 2px solid transparent;
              border-radius: 12px;
              cursor: pointer;
              overflow: hidden;
              transition: all 0.15s ease;
              padding: 0;
              text-align: left;
            }

            .thumbnail-item:hover {
              border-color: rgba(92, 107, 192, 0.5);
            }

            .thumbnail-item:focus {
              outline: none;
              border-color: #5c6bc0;
              box-shadow: 0 0 0 3px rgba(92, 107, 192, 0.3);
            }

            .thumbnail-item.current {
              border-color: #5c6bc0;
            }

            .thumbnail-number {
              position: absolute;
              top: 8px;
              left: 8px;
              padding: 2px 8px;
              background: rgba(0, 0, 0, 0.6);
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              color: #ffffff;
              z-index: 1;
            }

            .thumbnail-preview {
              width: 100%;
              height: 100%;
              padding: 32px 12px 12px;
              display: flex;
              flex-direction: column;
            }

            .thumbnail-content {
              flex: 1;
              overflow: hidden;
            }

            .thumbnail-title {
              font-size: 13px;
              font-weight: 600;
              color: #e0e0e0;
              margin: 0 0 6px 0;
              line-height: 1.3;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }

            .thumbnail-text {
              font-size: 11px;
              color: #888;
              margin: 0;
              line-height: 1.4;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }

            .thumbnail-current-indicator {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, #5c6bc0, #7986cb);
            }

            .thumbnail-navigator-footer {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 24px;
              padding: 12px 24px;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(0, 0, 0, 0.2);
            }

            .thumbnail-shortcut {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              color: #666;
            }

            .thumbnail-shortcut kbd {
              padding: 2px 6px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 4px;
              font-family: inherit;
              font-size: 11px;
              color: #888;
            }

            /* Scrollbar */
            .thumbnail-navigator-grid::-webkit-scrollbar {
              width: 8px;
            }

            .thumbnail-navigator-grid::-webkit-scrollbar-track {
              background: transparent;
            }

            .thumbnail-navigator-grid::-webkit-scrollbar-thumb {
              background: #444;
              border-radius: 4px;
            }

            .thumbnail-navigator-grid::-webkit-scrollbar-thumb:hover {
              background: #555;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThumbnailNavigator;
