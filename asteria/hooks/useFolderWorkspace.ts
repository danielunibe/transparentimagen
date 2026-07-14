import { useCallback, useEffect, useState } from 'react';
import type { FolderSource, GalleryFolderItem, GalleryImageItem, GalleryVideoItem } from '@/types/asteria';
import {
  cleanupScanResult,
  scanNativeDirectory,
  selectNativeFolder,
  validateNativeDirectory,
} from '@/services/folderService';
import { workspaceRepository } from '@/services/repositories/workspaceRepository';
import { buildOrganizationMetadata } from '@/services/mediaOrganizationService';

interface NativeBreadcrumb {
  name: string;
  path: string;
}

function folderName(nativePath: string): string {
  const normalized = nativePath.replace(/[\\/]+$/, '');
  return normalized.split(/[\\/]/).pop() || normalized;
}

export function useFolderWorkspace() {
  const [folderSources, setFolderSources] = useState<FolderSource[]>([]);
  const [currentHandle, setCurrentHandle] = useState<string | null>(null);
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<NativeBreadcrumb[]>([]);
  const [folders, setFolders] = useState<GalleryFolderItem[]>([]);
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [videos, setVideos] = useState<GalleryVideoItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void workspaceRepository.getFolderSources().then(async (sources) => {
      const validated = await Promise.all(sources.map(async (source) => {
        if (!source.nativePath) return { ...source, status: 'unavailable' as const };
        const status = await validateNativeDirectory(source.nativePath);
        return { ...source, nativePath: status.normalizedPath || source.nativePath, status: status.readable ? 'connected' as const : 'reconnect_required' as const };
      }));
      setFolderSources(validated);
    });
  }, []);

  useEffect(() => () => cleanupScanResult({ folders, images, videos }), [folders, images, videos]);

  const persistSource = useCallback(async (source: FolderSource) => {
    await workspaceRepository.saveFolderSource(source);
    setFolderSources((previous) => {
      const index = previous.findIndex((item) => item.id === source.id);
      if (index < 0) return [source, ...previous];
      const next = [...previous];
      next[index] = source;
      return next;
    });
  }, []);

  const performScan = useCallback(async (nativePath: string) => {
    setIsScanning(true);
    try {
      const result = await scanNativeDirectory(nativePath);
      setFolders(result.folders);
      setImages(result.images);
      setVideos(result.videos);
      return result;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const openSavedFolderSource = useCallback(async (source: FolderSource) => {
    if (!source.nativePath) {
      setCurrentSourceId(source.id);
      setCurrentHandle(null);
      setNeedsReconnect(true);
      return;
    }
    setCurrentSourceId(source.id);
    setFolders([]);
    setImages([]);
    setVideos([]);
    const status = await validateNativeDirectory(source.nativePath);
    if (!status.readable) {
      setCurrentHandle(null);
      setBreadcrumb([]);
      setNeedsReconnect(true);
      await persistSource({ ...source, status: 'reconnect_required', updatedAt: new Date().toISOString() });
      return;
    }
    const nativePath = status.normalizedPath || source.nativePath;
    setCurrentHandle(nativePath);
    setNeedsReconnect(false);
    setBreadcrumb([{ name: source.name, path: nativePath }]);
    const result = await performScan(nativePath);
    await persistSource({
      ...source,
      nativePath,
      pathLabel: nativePath,
      status: 'connected',
      imageCount: result.images.length,
      videoCount: result.videos.length,
      folderCount: result.folders.length,
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    });
  }, [performScan, persistSource]);

  const addFolderSource = useCallback(async (isReconnect = false) => {
    const selectedPath = await selectNativeFolder();
    if (!selectedPath) return;
    const status = await validateNativeDirectory(selectedPath);
    if (!status.readable) {
      setNeedsReconnect(true);
      return;
    }
    const nativePath = status.normalizedPath || selectedPath;
    const name = folderName(nativePath);
    const sourceId = isReconnect && currentSourceId
      ? currentSourceId
      : `native_${crypto.randomUUID()}`;
    const existing = folderSources.find((source) => source.id === sourceId);
    setCurrentSourceId(sourceId);
    setCurrentHandle(nativePath);
    setNeedsReconnect(false);
    setBreadcrumb([{ name, path: nativePath }]);
    const result = await performScan(nativePath);
    await persistSource({
      id: sourceId,
      name,
      nativePath,
      pathLabel: nativePath,
      kind: 'native_path',
      status: 'connected',
      imageCount: result.images.length,
      videoCount: result.videos.length,
      folderCount: result.folders.length,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      canReconnect: true,
    });
  }, [currentSourceId, folderSources, performScan, persistSource]);

  const addDroppedFilesSource = useCallback((files: File[]) => {
    const sourceId = `dropped_${Date.now()}`;
    setCurrentSourceId(sourceId);
    setCurrentHandle('dropped-files');
    setNeedsReconnect(false);
    setBreadcrumb([]);
    const now = Date.now();
    const galleryImages: GalleryImageItem[] = files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => {
        const item: GalleryImageItem = {
          id: `dropped_${file.name}_${now}`,
          kind: 'image',
          mediaKind: 'image',
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          badges: ['Dropped'],
          objectUrl: URL.createObjectURL(file),
          file,
          lastModified: file.lastModified,
          metadata: {
            formattedSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            extension: file.name.split('.').pop()?.toLowerCase() || 'unk',
            mediaKind: 'image',
            fileName: file.name,
          },
        };
        item.metadata = { ...item.metadata, organization: buildOrganizationMetadata(item) };
        return item;
      });
    const galleryVideos: GalleryVideoItem[] = files
      .filter((file) => file.type.startsWith('video/'))
      .map((file) => ({
        id: `dropped_video_${file.name}_${now}`,
        kind: 'video',
        mediaKind: 'video',
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        badges: ['Dropped', 'VIDEO'],
        objectUrl: URL.createObjectURL(file),
        file,
        lastModified: file.lastModified,
        metadata: {
          formattedSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          extension: file.name.split('.').pop()?.toLowerCase() || 'unk',
          mediaKind: 'video',
          fileName: file.name,
        },
      }));
    setImages(galleryImages);
    setVideos(galleryVideos);
    setFolders([]);
  }, []);

  const openSubFolder = useCallback(async (folder: GalleryFolderItem) => {
    if (!folder.nativePath) return;
    setCurrentHandle(folder.nativePath);
    setBreadcrumb((previous) => [...previous, { name: folder.name, path: folder.nativePath! }]);
    await performScan(folder.nativePath);
  }, [performScan]);

  const navigateToBreadcrumb = useCallback(async (index: number) => {
    const target = breadcrumb[index];
    if (!target) return;
    setCurrentHandle(target.path);
    setBreadcrumb((previous) => previous.slice(0, index + 1));
    await performScan(target.path);
  }, [breadcrumb, performScan]);

  const rescanCurrent = useCallback(async () => {
    if (currentHandle && currentHandle !== 'dropped-files') {
      const status = await validateNativeDirectory(currentHandle);
      if (!status.readable) {
        setCurrentHandle(null);
        setNeedsReconnect(true);
        return;
      }
      await performScan(status.normalizedPath || currentHandle);
    } else if (needsReconnect) {
      await addFolderSource(true);
    }
  }, [addFolderSource, currentHandle, needsReconnect, performScan]);

  const query = searchQuery.toLowerCase();
  return {
    folderSources,
    currentHandle,
    currentSourceId,
    needsReconnect,
    breadcrumb,
    folders: folders.filter((item) => item.name.toLowerCase().includes(query)),
    images: images.filter((item) => item.name.toLowerCase().includes(query)),
    videos: videos.filter((item) => item.name.toLowerCase().includes(query)),
    isScanning,
    searchQuery,
    setSearchQuery,
    addFolderSource,
    addDroppedFilesSource,
    openSavedFolderSource,
    openSubFolder,
    navigateToBreadcrumb,
    rescanCurrent,
  };
}
