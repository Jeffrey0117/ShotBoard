export type CameraShape = 'circle' | 'square' | 'rounded';

export interface BubbleConfig {
  x: number;
  y: number;
  diameter: number;
  shape: CameraShape;
  visible: boolean;
  borderRadius: number;
}

export interface TimerConfig {
  enabled: boolean;
  startTime: number;
}

export class Compositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;

  private getSourceCanvas: (() => HTMLCanvasElement | null) | null = null;
  private getBackgroundColor: (() => string) | null = null;
  private cameraVideo: HTMLVideoElement | null = null;
  private bubbleConfig: BubbleConfig | null = null;
  private timerConfig: TimerConfig | null = null;

  // Intermediate canvas for color space conversion
  private intermediateCanvas: HTMLCanvasElement | null = null;
  private intermediateCtx: CanvasRenderingContext2D | null = null;

  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 30; // 30fps

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    // Use default context settings - custom colorSpace/alpha may cause issues
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
  }

  // Set a function that returns the source canvas (for live updates)
  setSourceCanvasGetter(getter: () => HTMLCanvasElement | null): void {
    this.getSourceCanvas = getter;
  }

  // Set a function that returns the background color
  setBackgroundColorGetter(getter: () => string): void {
    this.getBackgroundColor = getter;
  }

  setCameraSource(video: HTMLVideoElement, config: BubbleConfig): void {
    this.cameraVideo = video;
    this.bubbleConfig = config;
  }

  updateBubbleConfig(config: BubbleConfig): void {
    this.bubbleConfig = config;
  }

  setTimerConfig(config: TimerConfig): void {
    this.timerConfig = config;
  }

  private createClipPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    shape: CameraShape,
    borderRadius: number = 16
  ): void {
    ctx.beginPath();

    switch (shape) {
      case 'circle': {
        const radius = size / 2;
        ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
        break;
      }
      case 'square':
        ctx.rect(x, y, size, size);
        break;
      case 'rounded': {
        const r = Math.min(borderRadius, size / 2);
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + size - r, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + r);
        ctx.lineTo(x + size, y + size - r);
        ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
        ctx.lineTo(x + r, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        break;
      }
    }

    ctx.closePath();
  }

  private drawTimer(): void {
    if (!this.timerConfig?.enabled) return;

    const elapsed = Date.now() - this.timerConfig.startTime;
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const padding = 15;
    const boxHeight = 32;
    const x = this.canvas.width - padding;
    const y = padding;

    this.ctx.save();
    this.ctx.font = 'bold 18px monospace';
    const textWidth = this.ctx.measureText(timeStr).width;
    const boxWidth = textWidth + 40;

    // Draw background
    this.ctx.fillStyle = 'rgba(229, 57, 53, 0.9)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - boxWidth, y, boxWidth, boxHeight, 6);
    this.ctx.fill();

    // Draw recording dot (blinking)
    const blink = Math.floor(elapsed / 500) % 2 === 0;
    if (blink) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x - boxWidth + 15, y + boxHeight / 2, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw time text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(timeStr, x - 10, y + boxHeight / 2);
    this.ctx.restore();
  }

  private drawFrame = (timestamp: number): void => {
    if (timestamp - this.lastFrameTime < this.frameInterval) {
      this.animationId = requestAnimationFrame(this.drawFrame);
      return;
    }
    this.lastFrameTime = timestamp;

    const { ctx, canvas } = this;

    // Get background color from Excalidraw (canvas is transparent, background is CSS)
    const bgColor = this.getBackgroundColor?.() || '#1a1a2e';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get source canvas from getter function
    const sourceCanvas = this.getSourceCanvas?.();

    // Draw source canvas (Excalidraw) with CSS filter compensation
    // Excalidraw uses "filter: invert(0.93) hue-rotate(180deg)" for dark mode
    // We need to apply this same filter to match what user sees on screen
    if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
      // Create intermediate canvas with CSS filter applied
      if (!this.intermediateCanvas ||
          this.intermediateCanvas.width !== sourceCanvas.width ||
          this.intermediateCanvas.height !== sourceCanvas.height) {
        this.intermediateCanvas = document.createElement('canvas');
        this.intermediateCanvas.width = sourceCanvas.width;
        this.intermediateCanvas.height = sourceCanvas.height;
        this.intermediateCtx = this.intermediateCanvas.getContext('2d');
      }

      if (this.intermediateCtx) {
        // Apply the same CSS filter that Excalidraw uses for dark mode
        this.intermediateCtx.filter = 'invert(0.93) hue-rotate(180deg)';
        this.intermediateCtx.drawImage(sourceCanvas, 0, 0);
        this.intermediateCtx.filter = 'none'; // Reset filter

        // Draw filtered result to main canvas
        ctx.drawImage(this.intermediateCanvas, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback: direct draw without filter
        ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      }
    }

    // Draw camera bubble (only if visible)
    if (this.cameraVideo && this.bubbleConfig && this.bubbleConfig.visible && this.cameraVideo.readyState >= 2) {
      const { x, y, diameter, shape, borderRadius } = this.bubbleConfig;
      const radius = diameter / 2;
      const centerX = x + radius;
      const centerY = y + radius;

      ctx.save();

      // Create clip path based on shape
      this.createClipPath(ctx, x, y, diameter, shape, borderRadius);
      ctx.clip();

      // Draw camera video with aspect ratio correction
      const videoAspect = this.cameraVideo.videoWidth / this.cameraVideo.videoHeight;
      let drawWidth = diameter, drawHeight = diameter, offsetX = x, offsetY = y;
      if (videoAspect > 1) {
        drawWidth = diameter * videoAspect;
        offsetX = x - (drawWidth - diameter) / 2;
      } else {
        drawHeight = diameter / videoAspect;
        offsetY = y - (drawHeight - diameter) / 2;
      }

      // Mirror the camera
      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(this.cameraVideo, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      // Draw border
      this.createClipPath(ctx, x, y, diameter, shape, borderRadius);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw timer
    this.drawTimer();

    this.animationId = requestAnimationFrame(this.drawFrame);
  };

  start(): void {
    if (this.animationId !== null) return;
    this.lastFrameTime = 0;
    this.animationId = requestAnimationFrame(this.drawFrame);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getStream(): MediaStream {
    return this.canvas.captureStream(30);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
