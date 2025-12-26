export interface BubbleConfig {
  x: number;
  y: number;
  diameter: number;
}

export interface TimerConfig {
  enabled: boolean;
  startTime: number;
}

export class Compositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;

  private sourceCanvas: HTMLCanvasElement | null = null;
  private getSourceCanvas: (() => HTMLCanvasElement | null) | null = null;
  private cameraVideo: HTMLVideoElement | null = null;
  private bubbleConfig: BubbleConfig | null = null;
  private timerConfig: TimerConfig | null = null;

  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 30; // 30fps

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
  }

  // Set a function that returns the source canvas (for live updates)
  setSourceCanvasGetter(getter: () => HTMLCanvasElement | null): void {
    this.getSourceCanvas = getter;
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

    // Clear and draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get source canvas from getter function
    const sourceCanvas = this.getSourceCanvas?.();

    // Draw source canvas (Excalidraw) - scale to fit recording dimensions
    if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
      // Draw the source canvas scaled to fill the recording canvas
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    }

    // Draw camera bubble
    if (this.cameraVideo && this.bubbleConfig && this.cameraVideo.readyState >= 2) {
      const { x, y, diameter } = this.bubbleConfig;
      const radius = diameter / 2;
      const centerX = x + radius;
      const centerY = y + radius;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
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
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
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
