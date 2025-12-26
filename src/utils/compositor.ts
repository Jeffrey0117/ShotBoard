export interface BubbleConfig {
  x: number;
  y: number;
  diameter: number;
}

export class Compositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private mainVideo: HTMLVideoElement | null = null;
  private cameraVideo: HTMLVideoElement | null = null;
  private bubbleConfig: BubbleConfig | null = null;
  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 30;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
  }

  setMainSource(video: HTMLVideoElement): void {
    this.mainVideo = video;
  }

  setCameraSource(video: HTMLVideoElement, config: BubbleConfig): void {
    this.cameraVideo = video;
    this.bubbleConfig = config;
  }

  updateBubblePosition(x: number, y: number): void {
    if (this.bubbleConfig) {
      this.bubbleConfig.x = x;
      this.bubbleConfig.y = y;
    }
  }

  private drawFrame = (timestamp: number): void => {
    if (timestamp - this.lastFrameTime < this.frameInterval) {
      this.animationId = requestAnimationFrame(this.drawFrame);
      return;
    }
    this.lastFrameTime = timestamp;
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.mainVideo && this.mainVideo.readyState >= 2) {
      ctx.drawImage(this.mainVideo, 0, 0, canvas.width, canvas.height);
    }
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
      const videoAspect = this.cameraVideo.videoWidth / this.cameraVideo.videoHeight;
      let drawWidth = diameter, drawHeight = diameter, offsetX = x, offsetY = y;
      if (videoAspect > 1) {
        drawWidth = diameter * videoAspect;
        offsetX = x - (drawWidth - diameter) / 2;
      } else {
        drawHeight = diameter / videoAspect;
        offsetY = y - (drawHeight - diameter) / 2;
      }
      ctx.drawImage(this.cameraVideo, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
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
