import type { GalleryFolderItem, GalleryImageItem, GalleryVideoItem } from '@/types/asteria';
import { formatBytes, formatDate, getAspectRatio, getImageDimensions } from './metadataService';
import { buildOrganizationMetadata } from './mediaOrganizationService';
import { detectMediaKind, getMediaFormat, isImageFile, isVideoFile } from './mediaDetectionService';
import { detectSmartFolder } from './smartFolderDetectionService';
import { detectMaterialFolder, detectPbrMapType } from './pbrDetectionService';
import { invokeNative, selectDirectory } from './tauriBridge';

export const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg', 'heic', 'avif'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi'];

interface NativeFileEntry {
  name: string;
  path: string;
  size: number;
  modifiedAt?: number;
}

interface NativeFolderEntry {
  name: string;
  path: string;
  imageCount: number;
  videoCount: number;
  folderCount: number;
  childFiles: NativeFileEntry[];
}

interface NativeScanPayload {
  normalizedPath: string;
  folders: NativeFolderEntry[];
  files: NativeFileEntry[];
}

export interface NativeDirectoryStatus {
  normalizedPath: string;
  exists: boolean;
  readable: boolean;
  error?: string;
}

export interface ScanResult {
  folders: GalleryFolderItem[];
  images: GalleryImageItem[];
  videos: GalleryVideoItem[];
}

export function isSupportedImageFile(filename: string): boolean {
  return isImageFile(filename);
}

export function isSupportedVideoFile(filename: string): boolean {
  return isVideoFile(filename);
}

function createStableId(kind: 'folder' | 'image' | 'video', nativePath: string): string {
  return `${kind}:${nativePath.replace(/\\/g, '/').toLowerCase()}`;
}

function mimeTypeFor(filename: string, mediaKind: 'image' | 'video'): string {
  const extension = getMediaFormat(filename);
  if (mediaKind === 'image') {
    if (extension === 'jpg') return 'image/jpeg';
    if (extension === 'svg') return 'image/svg+xml';
    return `image/${extension || 'unknown'}`;
  }
  if (extension === 'mov') return 'video/quicktime';
  return `video/${extension || 'unknown'}`;
}

function createFile(entry: NativeFileEntry, bytes: Uint8Array, mediaKind: 'image' | 'video'): File {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy.buffer], entry.name, {
    type: mimeTypeFor(entry.name, mediaKind),
    lastModified: entry.modifiedAt ?? Date.now(),
  });
}

async function createImageItem(entry: NativeFileEntry): Promise<GalleryImageItem> {
  const raw = await invokeNative('read_native_media_file', { path: entry.path }) as number[] | Uint8Array;
  const file = createFile(entry, new Uint8Array(raw), 'image');
  const objectUrl = URL.createObjectURL(file);
  const extension = getMediaFormat(entry.name);
  const item: GalleryImageItem = {
    id: createStableId('image', entry.path),
    kind: 'image',
    mediaKind: 'image',
    name: entry.name,
    type: file.type,
    size: formatBytes(entry.size),
    badges: [extension.toUpperCase(), 'PHOTO'],
    objectUrl,
    file,
    lastModified: entry.modifiedAt,
    nativePath: entry.path,
    pbrMapType: detectPbrMapType(entry.name),
    metadata: {
      formattedSize: formatBytes(entry.size),
      extension,
      modifiedLabel: formatDate(entry.modifiedAt ?? Date.now()),
      fileName: entry.name,
      mediaKind: 'image',
    },
  };
  try {
    const { width, height } = await getImageDimensions(objectUrl);
    item.metadata = { ...item.metadata, width, height, aspectRatio: getAspectRatio(width, height) };
  } catch {
    // Unsupported metadata does not invalidate the file.
  }
  item.metadata = { ...item.metadata, organization: buildOrganizationMetadata(item) };
  return item;
}

async function createVideoItem(entry: NativeFileEntry): Promise<GalleryVideoItem> {
  const raw = await invokeNative('read_native_media_file', { path: entry.path }) as number[] | Uint8Array;
  const file = createFile(entry, new Uint8Array(raw), 'video');
  return {
    id: createStableId('video', entry.path),
    kind: 'video',
    mediaKind: 'video',
    name: entry.name,
    type: file.type,
    size: formatBytes(entry.size),
    badges: [getMediaFormat(entry.name).toUpperCase(), 'VIDEO'],
    objectUrl: URL.createObjectURL(file),
    file,
    lastModified: entry.modifiedAt,
    nativePath: entry.path,
    metadata: {
      formattedSize: formatBytes(entry.size),
      extension: getMediaFormat(entry.name),
      modifiedLabel: formatDate(entry.modifiedAt ?? Date.now()),
      fileName: entry.name,
      mediaKind: 'video',
    },
  };
}

function createDetectionAsset(entry: NativeFileEntry): GalleryImageItem | GalleryVideoItem | null {
  const mediaKind = detectMediaKind(entry.name);
  const common = {
    name: entry.name,
    size: formatBytes(entry.size),
    badges: [] as string[],
    lastModified: entry.modifiedAt,
    nativePath: entry.path,
  };
  if (mediaKind === 'image') {
    return {
      ...common,
      id: createStableId('image', entry.path),
      kind: 'image',
      mediaKind: 'image',
      type: mimeTypeFor(entry.name, 'image'),
      objectUrl: '',
      pbrMapType: detectPbrMapType(entry.name),
      metadata: { extension: getMediaFormat(entry.name), fileName: entry.name, mediaKind: 'image' },
    };
  }
  if (mediaKind === 'video') {
    return {
      ...common,
      id: createStableId('video', entry.path),
      kind: 'video',
      mediaKind: 'video',
      type: mimeTypeFor(entry.name, 'video'),
      metadata: { extension: getMediaFormat(entry.name), fileName: entry.name, mediaKind: 'video' },
    };
  }
  return null;
}

export async function selectNativeFolder(): Promise<string | null> {
  return selectDirectory({ title: 'Seleccionar carpeta para Asteria' });
}

export async function validateNativeDirectory(nativePath: string): Promise<NativeDirectoryStatus> {
  return invokeNative('validate_native_directory', { path: nativePath });
}

export async function scanNativeDirectory(nativePath: string): Promise<ScanResult> {
  const payload = await invokeNative('scan_native_directory', { path: nativePath }) as NativeScanPayload;
  const images: GalleryImageItem[] = [];
  const videos: GalleryVideoItem[] = [];
  for (const entry of payload.files) {
    const mediaKind = detectMediaKind(entry.name);
    if (mediaKind === 'image') images.push(await createImageItem(entry));
    if (mediaKind === 'video') videos.push(await createVideoItem(entry));
  }

  const folders = payload.folders.map((entry): GalleryFolderItem => {
    const childAssets = entry.childFiles
      .map(createDetectionAsset)
      .filter((asset): asset is GalleryImageItem | GalleryVideoItem => Boolean(asset));
    const base: GalleryFolderItem = {
      id: createStableId('folder', entry.path),
      kind: 'folder',
      mediaKind: 'folder',
      name: entry.name,
      pathLabel: entry.path,
      nativePath: entry.path,
      imageCount: entry.imageCount,
      videoCount: entry.videoCount,
      previewUrls: [],
      childAssetIds: childAssets.map((asset) => asset.id),
    };
    const smartFolder = detectSmartFolder(base, childAssets);
    const material = detectMaterialFolder(base, childAssets);
    return {
      ...base,
      isSmartFolder: smartFolder.kind !== 'unknown_folder',
      smartFolderKind: smartFolder.kind,
      smartFolder,
      isMaterialFolder: Boolean(material),
      material,
    };
  });
  return { folders, images, videos };
}

export function cleanupScanResult(result: ScanResult): void {
  [...result.images, ...result.videos].forEach((item) => {
    if (item.objectUrl?.startsWith('blob:')) URL.revokeObjectURL(item.objectUrl);
  });
}
