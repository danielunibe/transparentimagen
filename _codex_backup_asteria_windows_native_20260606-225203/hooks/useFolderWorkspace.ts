import { useState, useCallback, useEffect } from 'react';
import { 
    FolderSource, 
    GalleryFolderItem, 
    GalleryImageItem,
    GalleryVideoItem
} from '@/types/asteria';
import { 
    selectFolderDirectoryPicker, 
    scanDirectoryHandle, 
    cleanupScanResult
} from '@/services/folderService';
import { safeGetJson, safeSetJson } from '@/services/storageService';
import { 
    saveDirectoryHandle, 
    loadDirectoryHandle, 
    verifyDirectoryPermission, 
    requestDirectoryPermission 
} from '@/services/fileHandleService';
import { buildOrganizationMetadata } from '@/services/mediaOrganizationService';

const VARIANTS_FOLDER_SOURCES_KEY = 'asteria_folder_sources_v2';

export function useFolderWorkspace() {
    const [folderSources, setFolderSources] = useState<FolderSource[]>(() => {
        const loaded = safeGetJson<FolderSource[]>(VARIANTS_FOLDER_SOURCES_KEY, []);
        return loaded.filter(s => s.status !== 'temporary');
    });

    const [currentHandle, setCurrentHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
    const [needsReconnect, setNeedsReconnect] = useState(false);
    const [breadcrumb, setBreadcrumb] = useState<{name: string, handle: FileSystemDirectoryHandle}[]>([]);
    
    const [folders, setFolders] = useState<GalleryFolderItem[]>([]);
    const [images, setImages] = useState<GalleryImageItem[]>([]);
    const [videos, setVideos] = useState<GalleryVideoItem[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    useEffect(() => {
        return () => {
            cleanupScanResult({ folders, images, videos });
        };
    }, [folders, images, videos]);

    useEffect(() => {
        safeSetJson(VARIANTS_FOLDER_SOURCES_KEY, folderSources);
    }, [folderSources]);

    const performScan = useCallback(async (handle: FileSystemDirectoryHandle, pathLabel: string) => {
        setIsScanning(true);
        try {
            const result = await scanDirectoryHandle(handle, pathLabel);
            setFolders(result.folders);
            setImages(result.images);
            setVideos(result.videos);
        } catch (err) {
            console.error("Scan error", err);
        } finally {
            setIsScanning(false);
        }
    }, []);

    const openSavedFolderSource = useCallback(async (source: FolderSource) => {
        // Prevent unnecessary loads
        if (currentHandle && currentSourceId === source.id && breadcrumb.length === 1 && currentHandle.name === source.name) {
            return;
        }

        setCurrentSourceId(source.id);
        setBreadcrumb([]);
        setFolders([]);
        setImages([]);
        setVideos([]);
        
        // Attempt rehydrate
        if (source.hasPersistentHandle) {
            const handle = await loadDirectoryHandle(source.id);
            if (handle) {
                const permissionGranted = await verifyDirectoryPermission(handle, 'read');
                if (permissionGranted) {
                    setCurrentHandle(handle);
                    setNeedsReconnect(false);
                    setBreadcrumb([{ name: handle.name, handle }]);
                    
                    setFolderSources(prev => prev.map(p => 
                        p.id === source.id ? { ...p, status: 'connected', lastOpenedAt: new Date().toISOString() } : p
                    ));
                    
                    await performScan(handle, handle.name);
                    return;
                } else {
                    // Requires user action to request
                    setCurrentHandle(handle); // Kept tentatively
                    setNeedsReconnect(true);
                    
                    setFolderSources(prev => prev.map(p => 
                        p.id === source.id ? { ...p, status: 'reconnect_required', lastOpenedAt: new Date().toISOString() } : p
                    ));
                    return;
                }
            }
        }
        
        // No handle or failed to load
        setCurrentHandle(null);
        setNeedsReconnect(true);
        setFolderSources(prev => prev.map(p => 
            p.id === source.id ? { ...p, status: 'reconnect_required', lastOpenedAt: new Date().toISOString() } : p
        ));
    }, [currentHandle, currentSourceId, breadcrumb, performScan]);

    const addFolderSource = useCallback(async (isReconnect: boolean = false) => {
        if (isReconnect && currentHandle && currentSourceId) {
            // Attempt native request first
            const granted = await requestDirectoryPermission(currentHandle, 'read');
            if (granted) {
                setNeedsReconnect(false);
                setBreadcrumb([{ name: currentHandle.name, handle: currentHandle }]);
                
                setFolderSources(prev => prev.map(p => 
                    p.id === currentSourceId ? { ...p, status: 'connected', lastOpenedAt: new Date().toISOString() } : p
                ));
                
                await performScan(currentHandle, currentHandle.name);
                return;
            }
        }
        
        const handle = await selectFolderDirectoryPicker();
        if (handle) {
            setCurrentHandle(handle);
            setNeedsReconnect(false);
            setBreadcrumb([{ name: handle.name, handle }]);
            setIsScanning(true);
            try {
                const result = await scanDirectoryHandle(handle, handle.name);
                setFolders(result.folders);
                setImages(result.images);
                setVideos(result.videos);
                
                let sourceId = currentSourceId;
                
                if (!isReconnect || !sourceId) {
                     sourceId = handle.name + '_' + Date.now();
                     setCurrentSourceId(sourceId);
                }
                
                const persisted = await saveDirectoryHandle(sourceId, handle);
                
                setFolderSources(prev => {
                    const existingIdx = prev.findIndex(p => p.id === sourceId);
                    const newSource: FolderSource = {
                        id: sourceId!,
                        name: handle.name,
                        pathLabel: handle.name,
                        kind: persisted ? 'persistent_handle' : 'metadata_only',
                        status: 'connected',
                        imageCount: result.images.length,
                        videoCount: result.videos.length,
                        folderCount: result.folders.length,
                        createdAt: prev[existingIdx]?.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        lastOpenedAt: new Date().toISOString(),
                        canReconnect: true,
                        hasPersistentHandle: persisted
                    };
                    
                    if (existingIdx >= 0) {
                        const next = [...prev];
                        next[existingIdx] = newSource;
                        return next;
                    }
                    return [...prev, newSource];
                });
            } catch(e) {
                console.error(e);
            } finally {
                setIsScanning(false);
            }
        } else if (!isReconnect) {
            // Fallback for directory picker not supported or cancelled - webkitdirectory
            const input = document.createElement('input');
            input.type = 'file';
            // @ts-ignore
            input.webkitdirectory = true;
            input.multiple = true;
            input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                    console.warn("WebKitDirectory fallback triggered.");
                    // For now, this is just a dummy fallback. In the future this might scan the File[].
                    const fallbackId = 'fallback_' + Date.now();
                    const pathName = files[0].webkitRelativePath?.split('/')[0] || 'Fallback Folder';
                    
                    setFolderSources(prev => [...prev, {
                        id: fallbackId,
                        name: pathName,
                        pathLabel: pathName,
                        kind: 'webkit_fallback',
                        status: 'temporary',
                        imageCount: 0,
                        videoCount: 0,
                        folderCount: 0,
                        createdAt: new Date().toISOString(),
                        lastOpenedAt: new Date().toISOString(),
                        canReconnect: false,
                        hasPersistentHandle: false
                    }]);
                }
            };
            input.click();
        }
    }, [currentHandle, currentSourceId, performScan]);

    const addDroppedFilesSource = useCallback((files: File[]) => {
        const sourceId = 'dropped_' + Date.now();
        setCurrentSourceId(sourceId);
        setCurrentHandle(null);
        setNeedsReconnect(false);
        setBreadcrumb([]);
        
        const validImages = files.filter(f => f.type.startsWith('image/'));
        const validVideos = files.filter(f => f.type.startsWith('video/'));

        const galleryImages: GalleryImageItem[] = validImages.map(file => ({
            id: 'dropped_' + file.name + '_' + Date.now(),
            kind: 'image' as const,
            mediaKind: 'image',
            name: file.name,
            type: file.type,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            badges: ['Dropped'],
            objectUrl: URL.createObjectURL(file), // temporary URL
            file: file, // keep reference for processing
            lastModified: file.lastModified,
            metadata: {
                formattedSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                extension: file.name.split('.').pop()?.toLowerCase() || 'unk',
                mediaKind: 'image',
                fileName: file.name
            }
        }));

        galleryImages.forEach(item => {
            item.metadata = {
                ...item.metadata,
                organization: buildOrganizationMetadata(item)
            };
        });

        const galleryVideos: GalleryVideoItem[] = validVideos.map(file => ({
            id: 'dropped_video_' + file.name + '_' + Date.now(),
            kind: 'video' as const,
            mediaKind: 'video' as const,
            name: file.name,
            type: file.type,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            badges: ['Dropped', 'VIDEO'],
            file,
            lastModified: file.lastModified,
            metadata: {
                formattedSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                extension: file.name.split('.').pop()?.toLowerCase() || 'unk',
                mediaKind: 'video',
                fileName: file.name
            }
        }));

        galleryVideos.forEach(item => {
            item.metadata = {
                ...item.metadata,
                organization: buildOrganizationMetadata(item)
            };
        });
        
        setImages(galleryImages);
        setVideos(galleryVideos);
        setFolders([]);
        
        setFolderSources(prev => [...prev, {
            id: sourceId,
            name: 'Dropped files',
            pathLabel: 'Temporary',
            kind: 'dropped_files',
            status: 'temporary',
            imageCount: galleryImages.length,
            videoCount: galleryVideos.length,
            folderCount: 0,
            createdAt: new Date().toISOString(),
            lastOpenedAt: new Date().toISOString(),
            canReconnect: false,
            hasPersistentHandle: false
        }]);
    }, []);

    const openSubFolder = useCallback(async (folderItem: GalleryFolderItem) => {
        if (!folderItem.handle) return;
        const newHandle = folderItem.handle;
        setCurrentHandle(newHandle);
        setBreadcrumb(prev => [...prev, { name: folderItem.name, handle: newHandle }]);
        await performScan(newHandle, folderItem.name);
    }, [performScan]);

    const navigateToBreadcrumb = useCallback(async (index: number) => {
        if (index < 0 || index >= breadcrumb.length) return;
        const target = breadcrumb[index];
        setCurrentHandle(target.handle);
        setBreadcrumb(prev => prev.slice(0, index + 1));
        await performScan(target.handle, target.name);
    }, [breadcrumb, performScan]);

    const rescanCurrent = useCallback(async () => {
        if (currentHandle) {
            await performScan(currentHandle, breadcrumb[breadcrumb.length - 1]?.name || "");
        } else if (needsReconnect) {
            await addFolderSource(true);
        } else {
            console.error("No active folder to rescan.");
        }
    }, [currentHandle, breadcrumb, needsReconnect, addFolderSource, performScan]);

    const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredImages = images.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredVideos = videos.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return {
        folderSources,
        currentHandle,
        currentSourceId,
        needsReconnect,
        breadcrumb,
        folders: filteredFolders,
        images: filteredImages,
        videos: filteredVideos,
        isScanning,
        searchQuery,
        setSearchQuery,
        addFolderSource,
        addDroppedFilesSource,
        openSavedFolderSource,
        openSubFolder,
        navigateToBreadcrumb,
        rescanCurrent
    };
}
