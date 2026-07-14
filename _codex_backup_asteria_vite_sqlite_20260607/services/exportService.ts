export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getFileBaseName(filename: string): string {
    const parts = filename.split('.');
    if (parts.length > 1) {
        parts.pop();
        return parts.join('.');
    }
    return filename;
}

export async function canvasToPngBlob(imageUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // might help with CORS if it's an external url, harmless for blob urls
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Failed to get canvas context'));
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert canvas to blob'));
                }
            }, 'image/png');
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for canvas conversion'));
        };
        img.src = imageUrl;
    });
}

import { GalleryImageItem } from '@/types/asteria';

export interface ExportResult {
  filename: string;
  mimeType: string;
  size?: number;
  blob?: Blob; // Added for future native save pass-through (do NOT persist)
}

export async function createPngExportResult(item: GalleryImageItem): Promise<ExportResult> {
    const baseName = getFileBaseName(item.name);
    const filename = `${baseName}.png`;

    let finalBlob: Blob;
    
    if (item.file && item.file.type === 'image/png') {
        finalBlob = item.file;
    } else {
        let urlToConvert = item.objectUrl;
        if (!urlToConvert && item.file) {
            urlToConvert = URL.createObjectURL(item.file);
        }

        if (!urlToConvert) {
            throw new Error('No image source available to convert');
        }
        finalBlob = await canvasToPngBlob(urlToConvert);
    }
    return { filename, mimeType: 'image/png', size: finalBlob.size, blob: finalBlob };
}

export async function saveImageAsPng(item: GalleryImageItem): Promise<ExportResult> {
    try {
        const result = await createPngExportResult(item);
        const { saveFileNatively } = await import('@/services/nativeActionsService');
        const nativeResult = await saveFileNatively({ blob: result.blob, filename: result.filename });
        
        if (nativeResult.status === 'unsupported' || nativeResult.status === 'error') {
            if (result.blob) downloadBlob(result.blob, result.filename);
        }
        return result;
    } catch (e) {
        console.error('Error saving image as PNG:', e);
        throw e;
    }
}

export async function createSvgContainer(item: GalleryImageItem): Promise<Blob> {
    let urlToLoad = item.objectUrl;
    if (!urlToLoad && item.file) {
        urlToLoad = URL.createObjectURL(item.file);
    }

    if (!urlToLoad) {
        throw new Error('No image source available to convert to SVG container');
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Failed to get canvas context'));
            }
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL(item.file?.type || 'image/png'); // fallback to png
            
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.naturalWidth}" height="${img.naturalHeight}" viewBox="0 0 ${img.naturalWidth} ${img.naturalHeight}">
  <image href="${dataUrl}" width="${img.naturalWidth}" height="${img.naturalHeight}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
            
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            resolve(blob);
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for SVG generation'));
        };
        img.src = urlToLoad;
    });
}

export async function createSvgExportResult(item: GalleryImageItem): Promise<ExportResult> {
    const baseName = getFileBaseName(item.name);
    const filename = `${baseName}.svg`;

    const blob = await createSvgContainer(item);
    return { filename, mimeType: 'image/svg+xml', size: blob.size, blob };
}

export async function exportImageAsSvgContainer(item: GalleryImageItem): Promise<ExportResult> {
    try {
        const result = await createSvgExportResult(item);
        
        const { saveFileNatively } = await import('@/services/nativeActionsService');
        const nativeResult = await saveFileNatively({ blob: result.blob, filename: result.filename });
        
        if (nativeResult.status === 'unsupported' || nativeResult.status === 'error') {
            if (result.blob) downloadBlob(result.blob, result.filename);
        }

        return result;
    } catch (e) {
        console.error('Error exporting image as SVG container:', e);
        throw e;
    }
}
