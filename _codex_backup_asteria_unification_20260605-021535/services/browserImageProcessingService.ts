import { ProcessedImageResult, ImageAdjustmentSettings } from '@/types/asteria'; // We'll add this type to types/asteria.ts

export async function loadImageFromUrl(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // helpful if remote
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

export function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(image, 0, 0);
  }
  return canvas;
}

export async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas to blob failed'));
      }
    }, mimeType, 0.95); // quality param 0.95 mostly for jpeg/webp but safe here
  });
}

// Helpers for specific presets
export async function applyEnhancePreset(imageUrl: string): Promise<ProcessedImageResult> {
    const img = await loadImageFromUrl(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get 2d context');
    
    // Apply preset
    ctx.filter = 'brightness(1.05) contrast(1.1) saturate(1.08)';
    ctx.drawImage(img, 0, 0);
    
    const blob = await canvasToBlob(canvas, 'image/png');
    const objectUrl = URL.createObjectURL(blob);
    
    return {
        blob,
        objectUrl,
        width: img.width,
        height: img.height,
        mimeType: 'image/png',
        filenameSuffix: '_enhanced'
    };
}

export async function applyPortraitPreset(imageUrl: string): Promise<ProcessedImageResult> {
    const img = await loadImageFromUrl(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get 2d context');
    
    ctx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
    ctx.drawImage(img, 0, 0);
    
    // VERY subtle blur simulation if needed, but filter blur over whole image is bad.
    // Instead we just keep it simple cinematic colors.
    
    const blob = await canvasToBlob(canvas, 'image/png');
    const objectUrl = URL.createObjectURL(blob);
    
    return {
        blob,
        objectUrl,
        width: img.width,
        height: img.height,
        mimeType: 'image/png',
        filenameSuffix: '_portrait'
    };
}

export async function applyUe5PreviewPreset(imageUrl: string): Promise<ProcessedImageResult> {
    const img = await loadImageFromUrl(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get 2d context');
    
    ctx.filter = 'brightness(1.02) contrast(1.18) saturate(0.95)';
    ctx.drawImage(img, 0, 0);
    
    const blob = await canvasToBlob(canvas, 'image/png');
    const objectUrl = URL.createObjectURL(blob);
    
    return {
        blob,
        objectUrl,
        width: img.width,
        height: img.height,
        mimeType: 'image/png',
        filenameSuffix: '_ue5_prep'
    };
}

export async function applyPromptPreset(imageUrl: string, prompt: string): Promise<ProcessedImageResult> {
    const img = await loadImageFromUrl(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get 2d context');
    
    const p = prompt.toLowerCase();
    
    let filter = 'none';
    if (p.includes('brighter') || p.includes('bright')) {
        filter = 'brightness(1.2)';
    } else if (p.includes('darker')) {
        filter = 'brightness(0.8)';
    } else if (p.includes('contrast')) {
        filter = 'contrast(1.3)';
    } else if (p.includes('warm')) {
        filter = 'sepia(0.3) saturate(1.2)';
    } else if (p.includes('cool')) {
        filter = 'hue-rotate(-15deg) saturate(1.1)';
    } else if (p.includes('vivid') || p.includes('colorful')) {
         filter = 'saturate(1.5)';
    } else {
        throw new Error('Prompt editing requires a configured AI model.');
    }
    
    ctx.filter = filter;
    ctx.drawImage(img, 0, 0);
    
    const blob = await canvasToBlob(canvas, 'image/png');
    const objectUrl = URL.createObjectURL(blob);
    
    return {
        blob,
        objectUrl,
        width: img.width,
        height: img.height,
        mimeType: 'image/png',
        filenameSuffix: '_prompt'
    };
}

export async function applyAdjustmentSettings(
    imageUrl: string,
    settings: ImageAdjustmentSettings
): Promise<ProcessedImageResult> {
    const img = await loadImageFromUrl(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get 2d context');
    
    // Map settings to filters
    // brightness: -50 to 50 -> 0.5 to 1.5
    const brightnessVal = 1 + (settings.brightness / 100);
    
    // contrast: -50 to 50 -> 0.5 to 1.5
    const contrastVal = 1 + (settings.contrast / 100);
    
    // saturation: -50 to 50 -> 0.5 to 1.5
    const saturateVal = 1 + (settings.saturation / 100);
    
    // warmth: -50 to +50
    // positive warmth -> sepia
    // negative warmth -> hue-rotate (cool)
    let warmthFilter = '';
    if (settings.warmth > 0) {
        warmthFilter = `sepia(${settings.warmth / 100})`;
    } else if (settings.warmth < 0) {
        warmthFilter = `hue-rotate(${settings.warmth / 2}deg)`;
    }
    
    // sharpness: 0 to +50 -> slight contrast boost
    const sharpContrastVal = 1 + (settings.sharpness / 200);

    const finalContrast = contrastVal * sharpContrastVal;

    ctx.filter = `brightness(${brightnessVal}) contrast(${finalContrast}) saturate(${saturateVal}) ${warmthFilter}`;
    ctx.drawImage(img, 0, 0);
    
    const blob = await canvasToBlob(canvas, 'image/png');
    const objectUrl = URL.createObjectURL(blob);
    
    return {
        blob,
        objectUrl,
        width: img.width,
        height: img.height,
        mimeType: 'image/png',
        filenameSuffix: '_adjusted'
    };
}
