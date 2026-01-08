/**
 * usePresentationTimer Hook
 * Timer management for presentation mode
 * @module hooks/usePresentationTimer
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UsePresentationTimerReturn {
  /** Elapsed time in seconds */
  elapsedTime: number;
  /** Formatted time string (HH:MM:SS or MM:SS) */
  formattedTime: string;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Reset the timer to 0 */
  reset: () => void;
  /** Toggle between running and paused */
  toggle: () => void;
}

/**
 * Format seconds into a readable time string
 */
const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Hook for managing presentation timer
 * @param autoStart - Whether to start the timer immediately (default: false)
 * @returns Timer state and control functions
 */
export function usePresentationTimer(autoStart = false): UsePresentationTimerReturn {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle timer tick
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

      intervalRef.current = window.setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 100); // Update more frequently for smoother display
    } else {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    pausedTimeRef.current = elapsedTime;
    setIsRunning(false);
  }, [elapsedTime]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedTime(0);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    isRunning,
    start,
    pause,
    reset,
    toggle,
  };
}

export default usePresentationTimer;
