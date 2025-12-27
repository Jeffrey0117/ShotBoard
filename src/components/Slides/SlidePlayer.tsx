/**
 * Slide Player Component
 * @module components/Slides/SlidePlayer
 * @description Main presentation player with navigation, fullscreen, and animations
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Presentation, SlideTheme, TransitionType } from '../../types/slide';
import { useSlideNavigation } from '../../hooks/useSlideNavigation';
import { useSlideHotkeys } from '../../hooks/useSlideHotkeys';
import { SlideRenderer } from './SlideRenderer';
import { DEFAULT_TRANSITION_DURATION } from '../../types/slide';
import './Slides.css';

export interface SlidePlayerProps {
  /** Presentation data */
  presentation: Presentation;
  /** Theme configuration */
  theme: SlideTheme;
  /** Initial slide index */
  initialSlide?: number;
  /** Auto-play mode */
  autoPlay?: boolean;
  /** Show navigation controls */
  showControls?: boolean;
  /** Enable annotation overlay */
  enableAnnotation?: boolean;
  /** Callback when slide changes */
  onSlideChange?: (index: number) => void;
  /** Callback when presentation ends */
  onEnd?: () => void;
  /** Callback to exit player */
  onExit?: () => void;
  /** Additional CSS class */
  className?: string;
}

// Transition variants for framer-motion
const getTransitionVariants = (transition: TransitionType, direction: number) => {
  switch (transition) {
    case 'slide':
      return {
        initial: { x: direction > 0 ? '100%' : '-100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: direction > 0 ? '-100%' : '100%', opacity: 0 },
      };
    case 'slide-up':
      return {
        initial: { y: direction > 0 ? '100%' : '-100%', opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: direction > 0 ? '-100%' : '100%', opacity: 0 },
      };
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    case 'zoom':
      return {
        initial: { scale: direction > 0 ? 0.8 : 1.2, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: direction > 0 ? 1.2 : 0.8, opacity: 0 },
      };
    case 'flip':
      return {
        initial: { rotateY: direction > 0 ? 90 : -90, opacity: 0 },
        animate: { rotateY: 0, opacity: 1 },
        exit: { rotateY: direction > 0 ? -90 : 90, opacity: 0 },
      };
    case 'none':
    default:
      return {
        initial: {},
        animate: {},
        exit: {},
      };
  }
};

export const SlidePlayer: React.FC<SlidePlayerProps> = ({
  presentation,
  theme,
  initialSlide = 0,
  autoPlay = false,
  showControls = true,
  enableAnnotation = false,
  onSlideChange,
  onEnd,
  onExit,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Navigation hook
  const {
    currentSlideIndex,
    currentClickIndex,
    currentSlide,
    totalSlides,
    maxClickIndex,
    isFirst,
    isLast,
    next,
    prev,
    goToSlide,
    reset,
  } = useSlideNavigation({
    presentation,
    initialSlide,
    onSlideChange,
    onEnd,
  });

  // Track direction for transitions
  const handleNext = useCallback(() => {
    setDirection(1);
    next();
  }, [next]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    prev();
  }, [prev]);

  const handleGoToSlide = useCallback((index: number) => {
    setDirection(index > currentSlideIndex ? 1 : -1);
    goToSlide(index);
  }, [currentSlideIndex, goToSlide]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Exit handler
  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    onExit?.();
  }, [onExit]);

  // Hotkeys hook
  useSlideHotkeys({
    onNext: handleNext,
    onPrev: handlePrev,
    onGoToSlide: handleGoToSlide,
    onToggleFullscreen: toggleFullscreen,
    onExit: handleExit,
    totalSlides,
    enabled: true,
  });

  // Mouse click navigation (left half = prev, right half = next)
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Ignore clicks on controls
    if ((e.target as HTMLElement).closest('.slide-controls')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (clickX < halfWidth) {
      handlePrev();
    } else {
      handleNext();
    }
  }, [handleNext, handlePrev]);

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControlsOverlay(true);

    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    hideControlsTimeout.current = setTimeout(() => {
      setShowControlsOverlay(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Get current transition type
  const currentTransition = useMemo(() => {
    return currentSlide?.meta.transition || presentation.meta.transition || 'slide';
  }, [currentSlide, presentation.meta.transition]);

  const transitionVariants = useMemo(
    () => getTransitionVariants(currentTransition, direction),
    [currentTransition, direction]
  );

  const transitionDuration = DEFAULT_TRANSITION_DURATION / 1000;

  if (!currentSlide) {
    return (
      <div className={`slide-player slide-player--empty ${className}`}>
        <p>No slides to display</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`slide-player ${isFullscreen ? 'slide-player--fullscreen' : ''} ${className}`}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme.colors.background,
        cursor: 'none',
      }}
    >
      {/* Slide content with transitions */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`slide-${currentSlideIndex}`}
          initial={transitionVariants.initial}
          animate={transitionVariants.animate}
          exit={transitionVariants.exit}
          transition={{
            duration: transitionDuration,
            ease: 'easeInOut',
          }}
          className="slide-player__slide"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <SlideRenderer
            slide={currentSlide}
            theme={theme}
            clickIndex={currentClickIndex}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation controls */}
      {showControls && (
        <motion.div
          className="slide-controls"
          initial={{ opacity: 0 }}
          animate={{ opacity: showControlsOverlay ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px 30px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'default',
          }}
        >
          {/* Progress bar */}
          <div
            className="slide-controls__progress"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <motion.div
              className="slide-controls__progress-bar"
              initial={false}
              animate={{
                width: `${((currentSlideIndex + 1) / totalSlides) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
              style={{
                height: '100%',
                backgroundColor: theme.colors.primary,
              }}
            />
          </div>

          {/* Left controls */}
          <div className="slide-controls__left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="slide-btn slide-btn--icon"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              disabled={isFirst}
              title="Previous (Left Arrow)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className="slide-btn slide-btn--icon"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              disabled={isLast}
              title="Next (Right Arrow / Space)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Center - slide indicator */}
          <div
            className="slide-controls__center"
            style={{
              color: 'white',
              fontSize: '14px',
              fontFamily: theme.typography.fontFamily.body,
            }}
          >
            {currentSlideIndex + 1} / {totalSlides}
            {maxClickIndex > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>
                ({currentClickIndex}/{maxClickIndex})
              </span>
            )}
          </div>

          {/* Right controls */}
          <div className="slide-controls__right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="slide-btn slide-btn--icon"
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
            {onExit && (
              <button
                className="slide-btn slide-btn--icon"
                onClick={(e) => { e.stopPropagation(); handleExit(); }}
                title="Exit (Escape)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Slide thumbnails navigation (dots) */}
      {showControls && totalSlides <= 20 && (
        <motion.div
          className="slide-dots"
          initial={{ opacity: 0 }}
          animate={{ opacity: showControlsOverlay ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '20px',
            cursor: 'default',
          }}
        >
          {presentation.slides.map((_, index) => (
            <button
              key={index}
              className={`slide-dot ${index === currentSlideIndex ? 'slide-dot--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleGoToSlide(index); }}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentSlideIndex ? theme.colors.primary : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'background-color 0.2s, transform 0.2s',
                transform: index === currentSlideIndex ? 'scale(1.2)' : 'scale(1)',
              }}
              title={`Go to slide ${index + 1}`}
            />
          ))}
        </motion.div>
      )}

      {/* Annotation layer placeholder */}
      {enableAnnotation && (
        <div
          className="slide-annotation-layer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* Annotation canvas would go here */}
        </div>
      )}
    </div>
  );
};

export default SlidePlayer;
