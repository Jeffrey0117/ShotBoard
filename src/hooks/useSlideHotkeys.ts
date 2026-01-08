/**
 * Slide Hotkeys Hook
 * @module hooks/useSlideHotkeys
 * @description Handles keyboard shortcuts for slide navigation
 */

import { useEffect, useCallback } from 'react';

export interface UseSlideHotkeysOptions {
  /** Go to next step (click or slide) */
  onNext: () => void;
  /** Go to previous step (click or slide) */
  onPrev: () => void;
  /** Go to specific slide */
  onGoToSlide?: (index: number) => void;
  /** Toggle fullscreen */
  onToggleFullscreen?: () => void;
  /** Exit presentation */
  onExit?: () => void;
  /** Total number of slides (for number key navigation) */
  totalSlides?: number;
  /** Whether hotkeys are enabled */
  enabled?: boolean;
}

export function useSlideHotkeys({
  onNext,
  onPrev,
  onGoToSlide,
  onToggleFullscreen,
  onExit,
  totalSlides = 0,
  enabled = true,
}: UseSlideHotkeysOptions): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle if disabled
    if (!enabled) return;

    // Don't handle if focus is on an input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (event.key) {
      // Next slide/step
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'Enter':
      case 'PageDown':
      case 'n':
      case 'j':
        event.preventDefault();
        onNext();
        break;

      // Previous slide/step
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'Backspace':
      case 'PageUp':
      case 'p':
      case 'k':
        event.preventDefault();
        onPrev();
        break;

      // Toggle fullscreen
      case 'f':
      case 'F11':
        event.preventDefault();
        onToggleFullscreen?.();
        break;

      // Exit presentation
      case 'Escape':
      case 'q':
        event.preventDefault();
        onExit?.();
        break;

      // Home - go to first slide
      case 'Home':
        event.preventDefault();
        onGoToSlide?.(0);
        break;

      // End - go to last slide
      case 'End':
        event.preventDefault();
        if (totalSlides > 0) {
          onGoToSlide?.(totalSlides - 1);
        }
        break;

      // Number keys 0-9 for quick navigation
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (onGoToSlide && totalSlides > 0) {
          event.preventDefault();
          const num = parseInt(event.key, 10);
          // 0 goes to slide 10, 1-9 go to slides 1-9 (0-indexed: 0-8)
          const targetIndex = num === 0 ? 9 : num - 1;
          if (targetIndex < totalSlides) {
            onGoToSlide(targetIndex);
          }
        }
        break;

      default:
        // No action for other keys
        break;
    }
  }, [enabled, onNext, onPrev, onGoToSlide, onToggleFullscreen, onExit, totalSlides]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

export default useSlideHotkeys;
