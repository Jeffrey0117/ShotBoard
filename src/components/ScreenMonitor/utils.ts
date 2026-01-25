/**
 * 比對兩張圖片的差異百分比
 * 使用像素取樣比對，效能較好
 */
export async function compareImages(
  dataUrl1: string,
  dataUrl2: string,
  sampleSize: number = 100
): Promise<number> {
  return new Promise((resolve) => {
    const img1 = new Image();
    const img2 = new Image();
    let loaded = 0;

    const checkBoth = () => {
      loaded++;
      if (loaded < 2) return;

      // 創建 canvas 進行比對
      const canvas1 = document.createElement('canvas');
      const canvas2 = document.createElement('canvas');
      const ctx1 = canvas1.getContext('2d')!;
      const ctx2 = canvas2.getContext('2d')!;

      // 縮小到取樣尺寸（提升效能）
      canvas1.width = canvas2.width = sampleSize;
      canvas1.height = canvas2.height = sampleSize;

      ctx1.drawImage(img1, 0, 0, sampleSize, sampleSize);
      ctx2.drawImage(img2, 0, 0, sampleSize, sampleSize);

      const data1 = ctx1.getImageData(0, 0, sampleSize, sampleSize).data;
      const data2 = ctx2.getImageData(0, 0, sampleSize, sampleSize).data;

      let diffPixels = 0;
      const totalPixels = sampleSize * sampleSize;
      const threshold = 30; // 每個像素的容差

      for (let i = 0; i < data1.length; i += 4) {
        const rDiff = Math.abs(data1[i] - data2[i]);
        const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
        const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);

        if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
          diffPixels++;
        }
      }

      const changePercent = (diffPixels / totalPixels) * 100;
      resolve(changePercent);
    };

    img1.onload = checkBoth;
    img2.onload = checkBoth;
    img1.onerror = () => resolve(100);
    img2.onerror = () => resolve(100);

    img1.src = dataUrl1;
    img2.src = dataUrl2;
  });
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化時間（秒 -> MM:SS）
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 在圖片上加時間戳浮水印
 */
export async function addTimestampToImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // 繪製原圖
      ctx.drawImage(img, 0, 0);

      // 設定浮水印樣式
      const timestamp = new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const fontSize = Math.max(16, Math.floor(img.height / 40));
      ctx.font = `${fontSize}px "Microsoft JhengHei", sans-serif`;

      const text = timestamp;
      const metrics = ctx.measureText(text);
      const padding = 10;
      const x = img.width - metrics.width - padding - 10;
      const y = img.height - padding - 10;

      // 繪製背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(
        x - padding,
        y - fontSize - padding / 2,
        metrics.width + padding * 2,
        fontSize + padding
      );

      // 繪製文字
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x, y);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * 將多張圖片合成為 GIF（簡易版，使用 canvas 動畫）
 */
export async function createAnimatedPreview(
  frames: { dataUrl: string }[],
  fps: number = 2
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;

  let currentFrame = 0;
  const images: HTMLImageElement[] = [];

  // 預載所有圖片
  for (const frame of frames) {
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = frame.dataUrl;
    });
    images.push(img);
  }

  // 動畫循環
  const animate = () => {
    if (images.length > 0) {
      ctx.drawImage(images[currentFrame], 0, 0, 320, 180);
      currentFrame = (currentFrame + 1) % images.length;
    }
    setTimeout(() => requestAnimationFrame(animate), 1000 / fps);
  };

  animate();
  return canvas;
}
