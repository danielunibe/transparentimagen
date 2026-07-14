import { GalleryImageItem, GalleryItem, GalleryVideoItem, MediaKind } from '@/types/asteria';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'heic', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi'];

export function getMediaFormat(fileOrName: File | string): string {
    const name = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
    return name.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(fileOrName: File | string): boolean {
    return IMAGE_EXTENSIONS.includes(getMediaFormat(fileOrName));
}

export function isVideoFile(fileOrName: File | string): boolean {
    return VIDEO_EXTENSIONS.includes(getMediaFormat(fileOrName));
}

export function detectMediaKind(fileOrName: File | string): MediaKind {
    if (isImageFile(fileOrName)) return 'image';
    if (isVideoFile(fileOrName)) return 'video';
    return 'unknown';
}

export function detectScreenshotByName(fileName: string): boolean {
    const normalized = fileName.toLowerCase();
    return ['screenshot', 'screen shot', 'captura de pantalla', 'captura', 'scrn', 'img_'].some(token => normalized.includes(token));
}

export function detectLikelyCameraMedia(fileName: string): boolean {
    const normalized = fileName.toLowerCase();
    return /^(img|dsc|pxl|mvimg|vid|dji|oppo|img-|pic)/.test(normalized);
}

export function extractBasicMediaHints(asset: GalleryItem): {
    mediaKind: MediaKind;
    isScreenshot: boolean;
    isVideo: boolean;
    visualTags: string[];
    qualityFlags: string[];
    organizationNotes: string[];
} {
    const fileName = asset.name || (asset.kind !== 'folder' ? asset.metadata?.fileName : '') || '';
    const mediaKind = asset.kind === 'folder'
        ? 'folder'
        : asset.kind === 'video'
            ? 'video'
            : 'image';
    const isScreenshot = detectScreenshotByName(fileName);
    const visualTags: string[] = [];
    const qualityFlags: string[] = [];
    const organizationNotes: string[] = [];

    if (isScreenshot) {
        visualTags.push('screenshot');
        organizationNotes.push('Detected by filename pattern.');
    }
    if (detectLikelyCameraMedia(fileName)) {
        visualTags.push('camera_media');
    }
    if (mediaKind === 'video') {
        visualTags.push('video');
        organizationNotes.push('Video detection is filename/format-based in this phase.');
    }

    return {
        mediaKind,
        isScreenshot,
        isVideo: mediaKind === 'video',
        visualTags,
        qualityFlags,
        organizationNotes,
    };
}

export function getMediaBadgeLabel(item: GalleryImageItem | GalleryVideoItem): string {
    return item.kind === 'video' ? 'VIDEO' : 'IMAGE';
}
