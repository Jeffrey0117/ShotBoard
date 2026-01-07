import { BubbleConfig, CameraShape } from '../../utils/compositor';

export interface OverlayConfig {
  whiteboard: boolean;
  camera: boolean;
  timer: boolean;
}

export interface TimerConfig {
  enabled: boolean;
  startTime: number;
}

/**
 * ScreenCompositor - 專門用於螢幕錄影的合成器
 *
 * 功能：
 * - 螢幕畫面渲染
 * - 白板疊加層（透明繪圖）
 * - 攝像頭泡泡
 * - 錄製計時器
 */
export class ScreenCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;

  private screenVideo: HTMLVideoElement | null = null;
  private cameraVideo: HTMLVideoElement | null = null;
  private bubbleConfig: BubbleConfig | null = null;
  private timerConfig: TimerConfig | null = null;

  // 白板疊加層
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayEnabled: boolean = false;

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

  /**
   * 設置螢幕視訊源
   */
  setScreenSource(video: HTMLVideoElement): void {
    this.screenVideo = video;
  }

  /**
   * 設置攝像頭源
   */
  setCameraSource(video: HTMLVideoElement, config: BubbleConfig): void {
    this.cameraVideo = video;
    this.bubbleConfig = config;
  }

  /**
   * 更新攝像頭氣泡配置
   */
  updateBubbleConfig(config: BubbleConfig): void {
    this.bubbleConfig = config;
  }

  /**
   * 設置計時器配置
   */
  setTimerConfig(config: TimerConfig): void {
    this.timerConfig = config;
  }

  /**
   * 設置白板疊加層
   */
  setOverlayCanvas(canvas: HTMLCanvasElement | null): void {
    this.overlayCanvas = canvas;
  }

  /**
   * 啟用/禁用白板疊加層
   */
  setOverlayEnabled(enabled: boolean): void {
    this.overlayEnabled = enabled;
  }

  /**
   * 計算等比例縮放參數
   */
  private calculateFitDimensions(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number } {
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = targetWidth / targetHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (sourceAspect > targetAspect) {
      drawWidth = targetWidth;
      drawHeight = targetWidth / sourceAspect;
      offsetX = 0;
      offsetY = (targetHeight - drawHeight) / 2;
    } else {
      drawHeight = targetHeight;
      drawWidth = targetHeight * sourceAspect;
      offsetX = (targetWidth - drawWidth) / 2;
      offsetY = 0;
    }

    return {
      drawWidth: Math.round(drawWidth),
      drawHeight: Math.round(drawHeight),
      offsetX: Math.round(offsetX),
      offsetY: Math.round(offsetY),
    };
  }

  /**
   * 創建裁剪路徑
   */
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

  /**
   * 繪製計時器
   */
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

    // 背景
    this.ctx.fillStyle = 'rgba(229, 57, 53, 0.9)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - boxWidth, y, boxWidth, boxHeight, 6);
    this.ctx.fill();

    // 閃爍的錄製點
    const blink = Math.floor(elapsed / 500) % 2 === 0;
    if (blink) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x - boxWidth + 15, y + boxHeight / 2, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 時間文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(timeStr, x - 10, y + boxHeight / 2);
    this.ctx.restore();
  }

  /**
   * 繪製單幀
   */
  private drawFrame = (timestamp: number): void => {
    if (timestamp - this.lastFrameTime < this.frameInterval) {
      this.animationId = requestAnimationFrame(this.drawFrame);
      return;
    }
    this.lastFrameTime = timestamp;

    const { ctx, canvas } = this;

    // 清空畫布（黑色背景）
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製螢幕畫面
    if (this.screenVideo && this.screenVideo.readyState >= 2) {
      const fit = this.calculateFitDimensions(
        this.screenVideo.videoWidth,
        this.screenVideo.videoHeight,
        canvas.width,
        canvas.height
      );

      ctx.drawImage(
        this.screenVideo,
        fit.offsetX,
        fit.offsetY,
        fit.drawWidth,
        fit.drawHeight
      );
    }

    // 繪製白板疊加層
    if (this.overlayEnabled && this.overlayCanvas) {
      ctx.drawImage(this.overlayCanvas, 0, 0, canvas.width, canvas.height);
    }

    // 繪製攝像頭泡泡
    if (
      this.cameraVideo &&
      this.bubbleConfig &&
      this.bubbleConfig.visible &&
      this.cameraVideo.readyState >= 2
    ) {
      const { x, y, diameter, shape, borderRadius } = this.bubbleConfig;
      const radius = diameter / 2;
      const centerX = x + radius;
      const centerY = y + radius;

      ctx.save();

      // 創建裁剪路徑
      this.createClipPath(ctx, x, y, diameter, shape, borderRadius);
      ctx.clip();

      // 繪製攝像頭畫面（鏡像）
      const videoAspect = this.cameraVideo.videoWidth / this.cameraVideo.videoHeight;
      let drawWidth = diameter,
        drawHeight = diameter,
        offsetX = x,
        offsetY = y;
      if (videoAspect > 1) {
        drawWidth = diameter * videoAspect;
        offsetX = x - (drawWidth - diameter) / 2;
      } else {
        drawHeight = diameter / videoAspect;
        offsetY = y - (drawHeight - diameter) / 2;
      }

      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(this.cameraVideo, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      // 繪製邊框
      this.createClipPath(ctx, x, y, diameter, shape, borderRadius);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 繪製計時器
    this.drawTimer();

    this.animationId = requestAnimationFrame(this.drawFrame);
  };

  /**
   * 開始合成
   */
  start(): void {
    if (this.animationId !== null) return;
    this.lastFrameTime = 0;
    this.animationId = requestAnimationFrame(this.drawFrame);
  }

  /**
   * 停止合成
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 獲取輸出串流
   */
  getStream(): MediaStream {
    return this.canvas.captureStream(30);
  }

  /**
   * 獲取 Canvas 元素
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
