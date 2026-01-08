/**
 * Slide Navigation Hook
 * @module hooks/useSlideNavigation
 * @description Handles slide navigation logic including click animations
 */

import { useState, useCallback, useMemo } from 'react';
import type { Presentation, Slide } from '../types/slide';

export interface UseSlideNavigationOptions {
  presentation: Presentation;
  initialSlide?: number;
  onSlideChange?: (index: number) => void;
  onEnd?: () => void;
}

export interface UseSlideNavigationReturn {
  /** Current slide index (0-based) */
  currentSlideIndex: number;
  /** Current click index for animations */
  currentClickIndex: number;
  /** Current slide object */
  currentSlide: Slide | null;
  /** Total number of slides */
  totalSlides: number;
  /** Maximum click index for current slide */
  maxClickIndex: number;
  /** Whether on first slide */
  isFirst: boolean;
  /** Whether on last slide (and last click) */
  isLast: boolean;
  /** Go to next step (click or slide) */
  next: () => void;
  /** Go to previous step (click or slide) */
  prev: () => void;
  /** Go to specific slide */
  goToSlide: (index: number) => void;
  /** Go to specific click on current slide */
  goToClick: (clickIndex: number) => void;
  /** Reset to first slide */
  reset: () => void;
}

export function useSlideNavigation({
  presentation,
  initialSlide = 0,
  onSlideChange,
  onEnd,
}: UseSlideNavigationOptions): UseSlideNavigationReturn {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(
    Math.max(0, Math.min(initialSlide, presentation.slides.length - 1))
  );
  const [currentClickIndex, setCurrentClickIndex] = useState(0);

  const totalSlides = presentation.slides.length;
  const currentSlide = useMemo(
    () => presentation.slides[currentSlideIndex] ?? null,
    [presentation.slides, currentSlideIndex]
  );

  // Calculate max click index from slide metadata or animated elements
  const maxClickIndex = useMemo(() => {
    if (!currentSlide) return 0;

    // Use clicks from meta if defined
    if (currentSlide.meta.clicks !== undefined && currentSlide.meta.clicks > 0) {
      return currentSlide.meta.clicks;
    }

    // Otherwise calculate from animated elements
    if (currentSlide.animatedElements.length > 0) {
      return Math.max(...currentSlide.animatedElements.map(el => el.clickIndex));
    }

    return 0;
  }, [currentSlide]);

  const isFirst = currentSlideIndex === 0 && currentClickIndex === 0;
  const isLast = currentSlideIndex === totalSlides - 1 && currentClickIndex >= maxClickIndex;

  const goToSlide = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, totalSlides - 1));
    if (clampedIndex !== currentSlideIndex) {
      setCurrentSlideIndex(clampedIndex);
      setCurrentClickIndex(0);
      onSlideChange?.(clampedIndex);
    }
  }, [currentSlideIndex, totalSlides, onSlideChange]);

  const goToClick = useCallback((clickIndex: number) => {
    const clampedClick = Math.max(0, Math.min(clickIndex, maxClickIndex));
    setCurrentClickIndex(clampedClick);
  }, [maxClickIndex]);

  const next = useCallback(() => {
    // If there are more clicks on current slide
    if (currentClickIndex < maxClickIndex) {
      setCurrentClickIndex(prev => prev + 1);
      return;
    }

    // Move to next slide
    if (currentSlideIndex < totalSlides - 1) {
      const nextIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIndex);
      setCurrentClickIndex(0);
      onSlideChange?.(nextIndex);
    } else {
      // At the end
      onEnd?.();
    }
  }, [currentClickIndex, maxClickIndex, currentSlideIndex, totalSlides, onSlideChange, onEnd]);

  const prev = useCallback(() => {
    // If there are previous clicks on current slide
    if (currentClickIndex > 0) {
      setCurrentClickIndex(prev => prev - 1);
      return;
    }

    // Move to previous slide
    if (currentSlideIndex > 0) {
      const prevIndex = currentSlideIndex - 1;
      const prevSlide = presentation.slides[prevIndex];

      // Calculate max click for previous slide
      let prevMaxClick = 0;
      if (prevSlide) {
        if (prevSlide.meta.clicks !== undefined && prevSlide.meta.clicks > 0) {
          prevMaxClick = prevSlide.meta.clicks;
        } else if (prevSlide.animatedElements.length > 0) {
          prevMaxClick = Math.max(...prevSlide.animatedElements.map(el => el.clickIndex));
        }
      }

      setCurrentSlideIndex(prevIndex);
      setCurrentClickIndex(prevMaxClick);
      onSlideChange?.(prevIndex);
    }
  }, [currentClickIndex, currentSlideIndex, presentation.slides, onSlideChange]);

  const reset = useCallback(() => {
    setCurrentSlideIndex(0);
    setCurrentClickIndex(0);
    onSlideChange?.(0);
  }, [onSlideChange]);

  return {
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
    goToClick,
    reset,
  };
}

export default useSlideNavigation;
