import { GalleryFolderItem, GalleryImageItem, FolderSource } from '@/types/asteria';

export const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

export function isSupportedImageFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return SUPPORTED_IMAGE_EXTENSIONS.includes(ext) || ext === 'svg';
}

export interface ScanResult {
    folders: GalleryFolderItem[];
    images: GalleryImageItem[];
}

function formatBytes(bytes: number, decimals = 1) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getExtension(filename: string) {
    return filename.split('.').pop()?.toLowerCase() || '';
}

export async function selectFolderDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
    try {
        if ('showDirectoryPicker' in window) {
            // @ts-ignore
            const handle = await window.showDirectoryPicker() as FileSystemDirectoryHandle;
            return handle;
        }
        return null;
    } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
            console.error(err);
        }
        return null;
    }
}

export async function scanDirectoryHandle(dirHandle: FileSystemDirectoryHandle, pathLabel: string): Promise<ScanResult> {
    const folders: GalleryFolderItem[] = [];
    const images: GalleryImageItem[] = [];

    // @ts-ignore
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
            const handle = entry as FileSystemDirectoryHandle;
            // peek inside to get image count and previews... this might be slow for real large folders. We'll do a shallow peek.
            const { previewUrls, imageCount } = await peekDirectory(handle);
            
            folders.push({
                id: handle.name + '_' + Date.now(),
                kind: 'folder',
                name: handle.name,
                pathLabel: pathLabel ? `${pathLabel}/${handle.name}` : handle.name,
                imageCount,
                previewUrls,
                handle
            });
        } else if (entry.kind === 'file') {
            const handle = entry as FileSystemFileHandle;
            if (isSupportedImageFile(handle.name)) {
                const ext = getExtension(handle.name);
                const file = await handle.getFile();
                const objectUrl = URL.createObjectURL(file);
                const badges = [ext.toUpperCase()];
                if (ext === 'svg') {
                    badges.push('SVG');
                }
                
                images.push({
                    id: handle.name + '_' + Date.now(),
                    kind: 'image',
                    name: handle.name,
                    type: file.type,
                    size: formatBytes(file.size),
                    badges,
                    objectUrl,
                    file,
                    lastModified: file.lastModified
                });
            }
        }
    }

    images.sort((a, b) => a.name.localeCompare(b.name));
    folders.sort((a, b) => a.name.localeCompare(b.name));

    return { folders, images };
}

async function peekDirectory(dirHandle: FileSystemDirectoryHandle) {
    const previewUrls: string[] = [];
    let imageCount = 0;
    try {
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                if (isSupportedImageFile(entry.name)) {
                    imageCount++;
                    if (previewUrls.length < 4) {
                        const file = await (entry as FileSystemFileHandle).getFile();
                        previewUrls.push(URL.createObjectURL(file));
                    }
                }
            }
        }
    } catch(err) {
        // Handle might not be readable or permission issue
    }
    return { previewUrls, imageCount };
}

export function cleanupScanResult(result: ScanResult) {
    result.images.forEach(img => {
        if (img.objectUrl) {
            URL.revokeObjectURL(img.objectUrl);
        }
    });
    result.folders.forEach(fd => {
        fd.previewUrls.forEach(url => URL.revokeObjectURL(url));
    });
}
