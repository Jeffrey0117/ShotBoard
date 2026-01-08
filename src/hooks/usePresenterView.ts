/**
 * usePresenterView Hook
 * Manages presenter view window and state synchronization
 * @module hooks/usePresenterView
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Presentation } from '../types/slide';

export interface PresenterViewState {
  currentSlideIndex: number;
  currentClickIndex: number;
  isPlaying: boolean;
}

export interface UsePresenterViewOptions {
  /** Current presentation data */
  presentation: Presentation | null;
  /** Current slide index */
  currentSlideIndex: number;
  /** Current click/animation index */
  currentClickIndex: number;
  /** Whether presentation is playing */
  isPlaying: boolean;
  /** Callback when navigation occurs from presenter view */
  onNavigate?: (direction: 'next' | 'prev') => void;
  /** Callback when jumping to a specific slide */
  onGoTo?: (index: number) => void;
}

export interface UsePresenterViewReturn {
  /** Whether presenter mode is active */
  isPresenterMode: boolean;
  /** Reference to the presenter window */
  presenterWindow: Window | null;
  /** Open presenter view in new window */
  openPresenterView: () => void;
  /** Close presenter view */
  closePresenterView: () => void;
  /** Sync state to presenter window */
  syncState: () => void;
}

// Message types for cross-window communication
interface SyncMessage {
  type: 'PRESENTER_SYNC';
  payload: PresenterViewState;
}

interface NavigateMessage {
  type: 'PRESENTER_NAVIGATE';
  direction: 'next' | 'prev';
}

interface GoToMessage {
  type: 'PRESENTER_GOTO';
  index: number;
}

type PresenterMessage = SyncMessage | NavigateMessage | GoToMessage;

/**
 * Hook for managing presenter view window
 */
export function usePresenterView(options: UsePresenterViewOptions): UsePresenterViewReturn {
  const {
    presentation,
    currentSlideIndex,
    currentClickIndex,
    isPlaying,
    onNavigate,
    onGoTo,
  } = options;

  const [isPresenterMode, setIsPresenterMode] = useState(false);
  const presenterWindowRef = useRef<Window | null>(null);

  // Listen for messages from presenter window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our presenter window
      if (presenterWindowRef.current && event.source === presenterWindowRef.current) {
        const message = event.data as PresenterMessage;

        switch (message.type) {
          case 'PRESENTER_NAVIGATE':
            onNavigate?.(message.direction);
            break;
          case 'PRESENTER_GOTO':
            onGoTo?.(message.index);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate, onGoTo]);

  // Sync state to presenter window when state changes
  useEffect(() => {
    if (presenterWindowRef.current && !presenterWindowRef.current.closed) {
      const message: SyncMessage = {
        type: 'PRESENTER_SYNC',
        payload: {
          currentSlideIndex,
          currentClickIndex,
          isPlaying,
        },
      };
      presenterWindowRef.current.postMessage(message, '*');
    }
  }, [currentSlideIndex, currentClickIndex, isPlaying]);

  // Check if presenter window is still open
  useEffect(() => {
    const checkWindow = setInterval(() => {
      if (presenterWindowRef.current?.closed) {
        presenterWindowRef.current = null;
        setIsPresenterMode(false);
      }
    }, 1000);

    return () => clearInterval(checkWindow);
  }, []);

  const openPresenterView = useCallback(() => {
    if (!presentation) {
      console.warn('No presentation loaded');
      return;
    }

    // Close existing window if open
    if (presenterWindowRef.current && !presenterWindowRef.current.closed) {
      presenterWindowRef.current.focus();
      return;
    }

    // Calculate window size and position
    const width = 1200;
    const height = 800;
    const left = window.screenX + window.outerWidth;
    const top = window.screenY;

    // Open presenter view window
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'scrollbars=yes',
      'resizable=yes',
    ].join(',');

    const presenterWindow = window.open('', 'PresenterView', features);

    if (!presenterWindow) {
      console.error('Failed to open presenter view window. Check popup blocker settings.');
      return;
    }

    presenterWindowRef.current = presenterWindow;
    setIsPresenterMode(true);

    // Write presenter view HTML content
    const htmlContent = generatePresenterViewHTML(presentation, currentSlideIndex, currentClickIndex);
    presenterWindow.document.write(htmlContent);
    presenterWindow.document.close();

    // Setup message listener in presenter window
    presenterWindow.onload = () => {
      // Initial sync
      const message: SyncMessage = {
        type: 'PRESENTER_SYNC',
        payload: {
          currentSlideIndex,
          currentClickIndex,
          isPlaying,
        },
      };
      presenterWindow.postMessage(message, '*');
    };
  }, [presentation, currentSlideIndex, currentClickIndex, isPlaying]);

  const closePresenterView = useCallback(() => {
    if (presenterWindowRef.current && !presenterWindowRef.current.closed) {
      presenterWindowRef.current.close();
    }
    presenterWindowRef.current = null;
    setIsPresenterMode(false);
  }, []);

  const syncState = useCallback(() => {
    if (presenterWindowRef.current && !presenterWindowRef.current.closed) {
      const message: SyncMessage = {
        type: 'PRESENTER_SYNC',
        payload: {
          currentSlideIndex,
          currentClickIndex,
          isPlaying,
        },
      };
      presenterWindowRef.current.postMessage(message, '*');
    }
  }, [currentSlideIndex, currentClickIndex, isPlaying]);

  return {
    isPresenterMode,
    presenterWindow: presenterWindowRef.current,
    openPresenterView,
    closePresenterView,
    syncState,
  };
}

/**
 * Generate HTML content for presenter view window
 */
function generatePresenterViewHTML(
  presentation: Presentation,
  currentSlideIndex: number,
  currentClickIndex: number
): string {
  const slides = presentation.slides;
  const currentSlide = slides[currentSlideIndex];
  const nextSlide = slides[currentSlideIndex + 1];

  const getSlideTitle = (slide: typeof currentSlide): string => {
    if (!slide) return '';
    const titleMatch = slide.rawContent.match(/^#\s+(.+)$/m);
    if (titleMatch) return titleMatch[1].trim();
    const h2Match = slide.rawContent.match(/^##\s+(.+)$/m);
    if (h2Match) return h2Match[1].trim();
    return `Slide ${slide.index + 1}`;
  };

  const getSlideContent = (slide: typeof currentSlide): string => {
    if (!slide) return '';
    return slide.rawContent
      .replace(/^#{1,6}\s+.+$/gm, '')
      .replace(/```[\s\S]*?```/g, '[code block]')
      .replace(/\{v-click[^}]*\}/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\n+/g, '<br/>')
      .trim();
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presenter View - ${presentation.meta.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Inter, system-ui, sans-serif;
      background: #0f0f23;
      color: #ffffff;
      height: 100vh;
      overflow: hidden;
    }
    .presenter-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
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
      color: #e0e0e0;
    }
    .presenter-main {
      flex: 1;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      padding: 24px;
      min-height: 0;
    }
    .slide-preview {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .slide-preview.large { flex: 1; }
    .slide-label {
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
    }
    .slide-frame {
      flex: 1;
      background: #1a1a2e;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      overflow: auto;
    }
    .slide-preview.small .slide-frame {
      aspect-ratio: 16 / 9;
      flex: none;
    }
    .slide-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .slide-preview.small .slide-title {
      font-size: 14px;
      margin-bottom: 8px;
    }
    .slide-body {
      color: #b0b0b0;
      font-size: 16px;
      line-height: 1.6;
    }
    .slide-preview.small .slide-body {
      font-size: 12px;
    }
    .notes-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    }
    .notes-content {
      flex: 1;
      background: #1a1a2e;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      overflow: auto;
      color: #b0b0b0;
    }
    .presenter-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #1a1a2e;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .timer {
      font-family: 'Courier New', monospace;
      font-size: 28px;
      font-weight: 600;
    }
    .nav-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: #2a2a4e;
      color: #e0e0e0;
      font-size: 14px;
      cursor: pointer;
    }
    .nav-btn:hover { background: #3a3a5e; }
    .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .slide-count {
      font-family: 'Courier New', monospace;
      font-size: 18px;
    }
    .side-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  </style>
</head>
<body>
  <div class="presenter-container">
    <header class="presenter-header">
      <h1 class="presenter-title">${presentation.meta.title}</h1>
      <span>${presentation.meta.author || ''}</span>
    </header>

    <main class="presenter-main">
      <div class="slide-preview large">
        <div class="slide-label">Current Slide (${currentSlideIndex + 1}/${slides.length})</div>
        <div class="slide-frame" id="currentSlide">
          <h2 class="slide-title">${getSlideTitle(currentSlide)}</h2>
          <div class="slide-body">${getSlideContent(currentSlide)}</div>
        </div>
      </div>

      <div class="side-panel">
        <div class="slide-preview small">
          <div class="slide-label">Next</div>
          <div class="slide-frame" id="nextSlide">
            ${nextSlide ? `
              <h2 class="slide-title">${getSlideTitle(nextSlide)}</h2>
              <div class="slide-body">${getSlideContent(nextSlide)}</div>
            ` : '<div style="color: #666; display: flex; align-items: center; justify-content: center; height: 100%;">End of presentation</div>'}
          </div>
        </div>

        <div class="notes-section">
          <div class="slide-label">Speaker Notes</div>
          <div class="notes-content" id="notes">
            ${currentSlide?.meta.notes || '<span style="color: #555; font-style: italic;">No notes for this slide</span>'}
          </div>
        </div>
      </div>
    </main>

    <footer class="presenter-footer">
      <div class="timer" id="timer">00:00</div>
      <div class="nav-controls">
        <button class="nav-btn" id="prevBtn" ${currentSlideIndex === 0 ? 'disabled' : ''}>Previous</button>
        <span class="slide-count">
          <span id="currentIdx">${currentSlideIndex + 1}</span> / ${slides.length}
        </span>
        <button class="nav-btn" id="nextBtn" ${currentSlideIndex >= slides.length - 1 ? 'disabled' : ''}>Next</button>
      </div>
      <div style="color: #666; font-size: 12px;">
        <kbd style="padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px;">Space</kbd> /
        <kbd style="padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px;">Arrow</kbd> Navigate
      </div>
    </footer>
  </div>

  <script>
    // Timer
    let seconds = 0;
    let timerInterval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      document.getElementById('timer').textContent = mins + ':' + secs;
    }, 1000);

    // Navigation
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.addEventListener('click', () => {
      window.opener.postMessage({ type: 'PRESENTER_NAVIGATE', direction: 'prev' }, '*');
    });

    nextBtn.addEventListener('click', () => {
      window.opener.postMessage({ type: 'PRESENTER_NAVIGATE', direction: 'next' }, '*');
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        window.opener.postMessage({ type: 'PRESENTER_NAVIGATE', direction: 'next' }, '*');
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        window.opener.postMessage({ type: 'PRESENTER_NAVIGATE', direction: 'prev' }, '*');
      }
    });

    // Listen for sync messages from main window
    window.addEventListener('message', (event) => {
      if (event.data.type === 'PRESENTER_SYNC') {
        const { currentSlideIndex } = event.data.payload;
        document.getElementById('currentIdx').textContent = currentSlideIndex + 1;
        // Ideally we would update the slide content here, but for simplicity
        // we just update the counter. A full implementation would re-render slides.
      }
    });
  </script>
</body>
</html>`;
}

export default usePresenterView;
