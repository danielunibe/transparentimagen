import { CutoutRefinementSettings, ProcessedImageResult } from '@/types/asteria';

export function getDefaultCutoutSettings(): CutoutRefinementSettings {
    return {
        trimTransparentPixels: false,
        padding: 0,
        shadowPreview: false,
        shadowOpacity: 0.35,
        shadowBlur: 28
    };
}

export async function hasAlphaChannel(imageUrl: string): Promise<boolean> {
    const { canvas, context } = await loadImageToCanvas(imageUrl);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 255) return true;
    }
    return false;
}

export async function trimTransparentPixels(imageUrl: string): Promise<ProcessedImageResult> {
    const { canvas, context } = await loadImageToCanvas(imageUrl);
    const bounds = getAlphaBounds(context, canvas.width, canvas.height);
    if (!bounds) return canvasToProcessedResult(canvas, '_trimmed');

    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = bounds.width;
    nextCanvas.height = bounds.height;
    const nextContext = get2dContext(nextCanvas);
    nextContext.drawImage(
        canvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height
    );
    return canvasToProcessedResult(nextCanvas, '_trimmed');
}

export async function addTransparentPadding(imageUrl: string, padding: number): Promise<ProcessedImageResult> {
    const safePadding = Math.max(0, Math.min(200, Math.round(padding)));
    const { canvas } = await loadImageToCanvas(imageUrl);
    if (safePadding === 0) return canvasToProcessedResult(canvas, '_padded');

    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = canvas.width + safePadding * 2;
    nextCanvas.height = canvas.height + safePadding * 2;
    const nextContext = get2dContext(nextCanvas);
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextContext.drawImage(canvas, safePadding, safePadding);
    return canvasToProcessedResult(nextCanvas, '_padded');
}

export async function createCutoutRefinementVariant(
    imageUrl: string,
    settings: CutoutRefinementSettings
): Promise<ProcessedImageResult> {
    let currentUrl = imageUrl;
    const temporaryUrls: string[] = [];

    try {
        if (settings.trimTransparentPixels) {
            const trimmed = await trimTransparentPixels(currentUrl);
            currentUrl = trimmed.objectUrl;
            temporaryUrls.push(trimmed.objectUrl);
        }

        if (settings.padding > 0) {
            const padded = await addTransparentPadding(currentUrl, settings.padding);
            currentUrl = padded.objectUrl;
            temporaryUrls.push(padded.objectUrl);
        }

        const { canvas } = await loadImageToCanvas(currentUrl);
        return await canvasToProcessedResult(canvas, '_refined_cutout');
    } finally {
        for (const url of temporaryUrls) {
            if (url !== currentUrl) URL.revokeObjectURL(url);
        }
    }
}

async function loadImageToCanvas(imageUrl: string): Promise<{ canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }> {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = get2dContext(canvas);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return { canvas, context };
}

function loadImage(imageUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load cutout image.'));
        image.src = imageUrl;
    });
}

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D context is not available.');
    return context;
}

function getAlphaBounds(context: CanvasRenderingContext2D, width: number, height: number) {
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = pixels[(y * width + x) * 4 + 3];
            if (alpha > 5) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) return null;
    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}

function canvasToProcessedResult(canvas: HTMLCanvasElement, suffix: string): Promise<ProcessedImageResult> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to create PNG cutout blob.'));
                return;
            }
            resolve({
                blob,
                objectUrl: URL.createObjectURL(blob),
                width: canvas.width,
                height: canvas.height,
                mimeType: 'image/png',
                filenameSuffix: suffix
            });
        }, 'image/png');
    });
}
