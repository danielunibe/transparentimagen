import { PerformanceSnapshot, GalleryItem } from '@/types/asteria';

export function createPerformanceSnapshot(items: GalleryItem[], thumbnails?: Record<string, string>): PerformanceSnapshot {
    let images = 0;
    let folders = 0;
    
    for (const item of items) {
        if (item.kind === 'image') images++;
        if (item.kind === 'folder') folders++;
    }

    const thumbCount = thumbnails ? Object.keys(thumbnails).length : undefined;
    
    // Naive estimate: Original objects urls might take roughly 5MB per image in JS heap/browser memory
    // Thumbnails take maybe 100KB
    const estimatedMemoryBytes = (images * 5 * 1024 * 1024); // Worst case if all full blobs loaded

    return {
        imageCount: images,
        folderCount: folders,
        objectUrlCount: images, // Assuming 1:1 if no cleanup implemented
        thumbnailCount: thumbCount,
        estimatedMemoryLabel: formatEstimatedMemory(estimatedMemoryBytes)
    };
}

export function formatEstimatedMemory(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function estimateImageMemory(width?: number, height?: number): number {
    if (!width || !height) return 5 * 1024 * 1024; // 5MB default guess
    // Raw RGBA pixels in memory
    return width * height * 4;
}
