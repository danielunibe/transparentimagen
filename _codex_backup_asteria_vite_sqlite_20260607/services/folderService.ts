import { GalleryFolderItem, GalleryImageItem, GalleryVideoItem } from '@/types/asteria';
import { formatBytes, formatDate, getAspectRatio, getImageDimensions } from './metadataService';
import { buildOrganizationMetadata } from './mediaOrganizationService';
import { detectMediaKind, getMediaFormat, isImageFile, isVideoFile } from './mediaDetectionService';
import { detectSmartFolder } from './smartFolderDetectionService';
import { detectMaterialFolder, detectPbrMapType } from './pbrDetectionService';

export const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg', 'heic', 'avif'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi'];

export function isSupportedImageFile(filename: string): boolean {
    return isImageFile(filename);
}

export function isSupportedVideoFile(filename: string): boolean {
    return isVideoFile(filename);
}

export interface ScanResult {
    folders: GalleryFolderItem[];
    images: GalleryImageItem[];
    videos: GalleryVideoItem[];
}

function createStableId(kind: 'folder' | 'image' | 'video', pathLabel: string): string {
    return `${kind}:${pathLabel.replace(/\\/g, '/').toLowerCase()}`;
}

function buildAssetPathLabel(basePath: string, name: string): string {
    return basePath ? `${basePath}/${name}` : name;
}

async function enrichImageMetadata(item: GalleryImageItem): Promise<GalleryImageItem> {
    try {
        const { width, height } = await getImageDimensions(item.objectUrl);
        item.metadata = {
            ...item.metadata,
            width,
            height,
            aspectRatio: getAspectRatio(width, height),
        };
    } catch {
        // Ignore image metadata failures for unsupported formats.
    }

    item.metadata = {
        ...item.metadata,
        organization: buildOrganizationMetadata(item),
    };
    item.pbrMapType = detectPbrMapType(item.name);
    return item;
}

function createBaseMetadata(file: File, filename: string) {
    return {
        formattedSize: formatBytes(file.size),
        extension: getMediaFormat(filename),
        modifiedLabel: formatDate(file.lastModified),
        fileName: filename,
    };
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
    const videos: GalleryVideoItem[] = [];

    // @ts-ignore
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
            const handle = entry as FileSystemDirectoryHandle;
            const childPathLabel = buildAssetPathLabel(pathLabel, handle.name);
            const { previewUrls, imageCount, videoCount, childAssets } = await peekDirectory(handle, childPathLabel);
            const smartFolder = detectSmartFolder({
                id: createStableId('folder', childPathLabel),
                kind: 'folder',
                mediaKind: 'folder',
                name: handle.name,
                pathLabel: childPathLabel,
                imageCount,
                videoCount,
                previewUrls,
                handle
            }, childAssets);
            const material = detectMaterialFolder({
                id: createStableId('folder', childPathLabel),
                kind: 'folder',
                mediaKind: 'folder',
                name: handle.name,
                pathLabel: childPathLabel,
                imageCount,
                videoCount,
                previewUrls,
                handle
            }, childAssets);

            folders.push({
                id: createStableId('folder', childPathLabel),
                kind: 'folder',
                mediaKind: 'folder',
                name: handle.name,
                pathLabel: childPathLabel,
                imageCount,
                videoCount,
                previewUrls,
                handle,
                childAssetIds: childAssets.map((asset) => asset.id),
                isSmartFolder: smartFolder.kind !== 'unknown_folder',
                smartFolderKind: smartFolder.kind,
                smartFolder,
                isMaterialFolder: Boolean(material),
                material
            });
        } else if (entry.kind === 'file') {
            const handle = entry as FileSystemFileHandle;
            const file = await handle.getFile();
            const mediaKind = detectMediaKind(handle.name);
            const fullPath = buildAssetPathLabel(pathLabel, handle.name);

            if (mediaKind === 'image') {
                const objectUrl = URL.createObjectURL(file);
                const extension = getMediaFormat(handle.name);
                const item: GalleryImageItem = {
                    id: createStableId('image', fullPath),
                    kind: 'image',
                    mediaKind: 'image',
                    name: handle.name,
                    type: file.type || `image/${extension}`,
                    size: formatBytes(file.size),
                    badges: [extension.toUpperCase(), 'PHOTO'],
                    objectUrl,
                    file,
                    lastModified: file.lastModified,
                    metadata: {
                        ...createBaseMetadata(file, handle.name),
                        mediaKind: 'image',
                    }
                };
                images.push(await enrichImageMetadata(item));
            } else if (mediaKind === 'video') {
                const extension = getMediaFormat(handle.name);
                const item: GalleryVideoItem = {
                    id: createStableId('video', fullPath),
                    kind: 'video',
                    mediaKind: 'video',
                    name: handle.name,
                    type: file.type || `video/${extension}`,
                    size: formatBytes(file.size),
                    badges: [extension.toUpperCase(), 'VIDEO'],
                    file,
                    lastModified: file.lastModified,
                    metadata: {
                        ...createBaseMetadata(file, handle.name),
                        mediaKind: 'video',
                    }
                };
                item.metadata = {
                    ...item.metadata,
                    organization: buildOrganizationMetadata(item),
                };
                videos.push(item);
            }
        }
    }

    images.sort((a, b) => a.name.localeCompare(b.name));
    videos.sort((a, b) => a.name.localeCompare(b.name));
    folders.sort((a, b) => a.name.localeCompare(b.name));

    return { folders, images, videos };
}

async function peekDirectory(dirHandle: FileSystemDirectoryHandle, pathLabel: string) {
    const previewUrls: string[] = [];
    let imageCount = 0;
    let videoCount = 0;
    const childAssets: Array<GalleryImageItem | GalleryVideoItem> = [];
    try {
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                if (isSupportedImageFile(entry.name)) {
                    imageCount++;
                    const file = await (entry as FileSystemFileHandle).getFile();
                    const extension = getMediaFormat(entry.name);
                    const childAsset: GalleryImageItem = {
                        id: createStableId('image', buildAssetPathLabel(pathLabel, entry.name)),
                        kind: 'image',
                        mediaKind: 'image',
                        name: entry.name,
                        type: file.type || `image/${extension}`,
                        size: formatBytes(file.size),
                        badges: [extension.toUpperCase(), 'TEXTURE'],
                        objectUrl: '',
                        lastModified: file.lastModified,
                        pbrMapType: detectPbrMapType(entry.name),
                        metadata: {
                            ...createBaseMetadata(file, entry.name),
                            mediaKind: 'image',
                        }
                    };
                    childAsset.metadata = {
                        ...childAsset.metadata,
                        organization: buildOrganizationMetadata(childAsset),
                    };
                    childAssets.push(childAsset);
                    if (previewUrls.length < 4) {
                        previewUrls.push(URL.createObjectURL(file));
                    }
                } else if (isSupportedVideoFile(entry.name)) {
                    videoCount++;
                    const file = await (entry as FileSystemFileHandle).getFile();
                    const extension = getMediaFormat(entry.name);
                    const childAsset: GalleryVideoItem = {
                        id: createStableId('video', buildAssetPathLabel(pathLabel, entry.name)),
                        kind: 'video',
                        mediaKind: 'video',
                        name: entry.name,
                        type: file.type || `video/${extension}`,
                        size: formatBytes(file.size),
                        badges: [extension.toUpperCase(), 'VIDEO'],
                        lastModified: file.lastModified,
                        metadata: {
                            ...createBaseMetadata(file, entry.name),
                            mediaKind: 'video',
                            organization: buildOrganizationMetadata({
                                id: createStableId('video', buildAssetPathLabel(pathLabel, entry.name)),
                                kind: 'video',
                                mediaKind: 'video',
                                name: entry.name,
                                type: file.type || `video/${extension}`,
                                size: formatBytes(file.size),
                                badges: [extension.toUpperCase(), 'VIDEO'],
                                file,
                                lastModified: file.lastModified,
                                metadata: {
                                    ...createBaseMetadata(file, entry.name),
                                    mediaKind: 'video',
                                }
                            }),
                        }
                    };
                    childAssets.push(childAsset);
                }
            }
        }
    } catch {
        // Ignore permission failures in shallow peek.
    }
    return { previewUrls, imageCount, videoCount, childAssets };
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
