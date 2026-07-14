import { GalleryItem, AssetVariant, AiProcessingJob, ExportJob } from '@/types/asteria';
import { useEffect, useState } from 'react';
import { getFileExtension, getImageDimensions, formatDate, getAspectRatio, getVariantSummary, getAiSummary, getExportSummary } from '@/services/metadataService';

interface InspectorMetadataProps {
    item: GalleryItem;
    variants?: AssetVariant[];
    aiJobs?: AiProcessingJob[];
    exportJobs?: ExportJob[];
}

export function InspectorMetadata({ item, variants = [], aiJobs = [], exportJobs = [] }: InspectorMetadataProps) {
    const isImage = item.kind === 'image';
    const isVideo = item.kind === 'video';
    
    const [fetchedDimensions, setFetchedDimensions] = useState<{ id: string, width: number; height: number } | null>(null);

    const hasPrecomputed = isImage && item.metadata?.width && item.metadata?.height;
    let dimensions: { width: number; height: number } | null = null;
    
    if (hasPrecomputed) {
        dimensions = { width: item.metadata!.width!, height: item.metadata!.height! };
    } else if (fetchedDimensions?.id === item.id) {
        dimensions = { width: fetchedDimensions.width, height: fetchedDimensions.height };
    }

    const isLoadingDimensions = isImage && !hasPrecomputed && fetchedDimensions?.id !== item.id;

    useEffect(() => {
        let active = true;
        
        if (item.kind === 'image' && item.objectUrl && !hasPrecomputed) {
            getImageDimensions(item.objectUrl)
                .then(dim => {
                    if (active) {
                        setFetchedDimensions({ id: item.id, ...dim });
                    }
                })
                .catch(() => {
                    // Ignore errors, stay loading silently or add error logic.
                });
        }
        
        return () => {
            active = false;
        };
    }, [item, hasPrecomputed]);

    // Derived metadata
    const extension = item.kind !== 'folder' ? (item.metadata?.extension || getFileExtension(item.name)) : null;
    const formatLabel = item.kind === 'folder' ? 'Folder' : isVideo ? (extension?.toUpperCase() || 'VIDEO') : (extension || 'IMAGE');
    const modifiedLabel = item.kind !== 'folder' && item.lastModified ? formatDate(item.lastModified) : '—';
    const ratio = dimensions ? getAspectRatio(dimensions.width, dimensions.height) : '—';
    const dimensionsStr = dimensions ? `${dimensions.width} × ${dimensions.height}` : (isLoadingDimensions ? '...' : '—');
    const sourceLabel = item.kind === 'folder' ? item.pathLabel || item.name : (item as any).name;

    const metadataOnlyCount = variants.filter(v => v.metadataOnly).length;
    const sessionOutputsCount = variants.filter(v => v.sessionOnly).length;
    const smartFolder = item.kind === 'folder' ? item.smartFolder : item.metadata?.smartFolder;
    const material = item.kind === 'folder' ? item.material : (item.kind === 'image' ? item.metadata?.material : undefined);

    return (
        <div className="flex flex-col gap-3 mt-4 text-[12px]">
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span className="text-[#7f826f]">Format</span>
                <span className="text-[#f2f2ef] font-medium truncate max-w-[150px]">{formatLabel}</span>
            </div>
            
            {item.kind !== 'folder' ? (
                <>
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                        <span className="text-[#7f826f]">Size</span>
                        <span className="text-[#b8b59f] font-mono">{item.size || '—'}</span>
                    </div>
                    {isImage && (
                        <>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Dimensions</span>
                                <span className="text-[#b8b59f] font-mono">{dimensionsStr}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Ratio</span>
                                <span className="text-[#b8b59f] font-mono">{ratio}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                        <span className="text-[#7f826f]">Modified</span>
                        <span className="text-[#b8b59f] font-mono">{modifiedLabel}</span>
                    </div>
                    
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                        <span className="text-[#7f826f]">Variants</span>
                        <span className="text-[#b8b59f] font-mono">{getVariantSummary(variants)}</span>
                    </div>
                    
                    {(metadataOnlyCount > 0 || sessionOutputsCount > 0) && (
                        <div className="flex justify-between border-b border-white/[0.04] pb-2">
                            <span className="text-[#7f826f]">State</span>
                            <span className="text-[#b8b59f] font-mono text-right flex flex-col items-end">
                                {metadataOnlyCount > 0 && <span className="text-[#f59e0b]">{metadataOnlyCount} metadata only</span>}
                                {sessionOutputsCount > 0 && <span className="text-[#4de082]">{sessionOutputsCount} session buffer</span>}
                            </span>
                        </div>
                    )}

                    {aiJobs.length > 0 && (
                        <div className="flex justify-between border-b border-white/[0.04] pb-2">
                            <span className="text-[#7f826f]">AI status</span>
                            <span className="text-[#b8b59f] font-mono">{getAiSummary(aiJobs)}</span>
                        </div>
                    )}
                    
                    {exportJobs.length > 0 && (
                        <div className="flex justify-between border-b border-white/[0.04] pb-2">
                            <span className="text-[#7f826f]">Exports</span>
                            <span className="text-[#b8b59f] font-mono">{getExportSummary(exportJobs)}</span>
                        </div>
                    )}
                    {item.kind === 'image' && item.pbrMapType && item.pbrMapType !== 'unknown' && (
                        <>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">PBR Map Type</span>
                                <span className="text-[#b8b59f] font-mono">{item.pbrMapType}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Confidence</span>
                                <span className="text-[#b8b59f] font-mono">Detected by filename</span>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <>
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                        <span className="text-[#7f826f]">Images</span>
                        <span className="text-[#b8b59f] font-mono">{item.imageCount || 0}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                        <span className="text-[#7f826f]">Videos</span>
                        <span className="text-[#b8b59f] font-mono">{item.videoCount || 0}</span>
                    </div>
                    {item.nativePath ? (
                        <div className="flex justify-between border-b border-white/[0.04] pb-2">
                            <span className="text-[#7f826f]">Status</span>
                            <span className="text-[#10b981] font-mono">Native path</span>
                        </div>
                    ) : (
                         <div className="flex justify-between border-b border-white/[0.04] pb-2">
                            <span className="text-[#7f826f]">Status</span>
                            <span className="text-[#f59e0b] font-mono whitespace-nowrap">Reconnect needed</span>
                        </div>
                    )}
                    {smartFolder && (
                        <>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Smart Folder</span>
                                <span className="text-[#b8b59f] font-mono">{smartFolder.kind}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Smart Status</span>
                                <span className="text-[#b8b59f] font-mono">{smartFolder.status}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Confidence</span>
                                <span className="text-[#b8b59f] font-mono">{smartFolder.confidence}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Child count</span>
                                <span className="text-[#b8b59f] font-mono">{smartFolder.childAssetIds.length}</span>
                            </div>
                        </>
                    )}
                    {material && (
                        <>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Material Status</span>
                                <span className="text-[#b8b59f] font-mono">{material.status}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Maps detected</span>
                                <span className="text-[#b8b59f] font-mono">{material.maps.length}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Missing maps</span>
                                <span className="text-[#b8b59f] font-mono">{material.missingMaps.join(', ') || 'None'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Favorite</span>
                                <span className="text-[#b8b59f] font-mono">{material.isFavorite ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Completeness score</span>
                                <span className="text-[#b8b59f] font-mono">{material.completenessScore ?? 0}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Needs review</span>
                                <span className="text-[#b8b59f] font-mono">{material.needsReview ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/[0.04] pb-2">
                                <span className="text-[#7f826f]">Category</span>
                                <span className="text-[#b8b59f] font-mono">{material.category || '—'}</span>
                            </div>
                        </>
                    )}
                </>
            )}
            
            <div className="flex flex-col border-b border-white/[0.04] pb-2 pt-1 gap-1">
                <span className="text-[#7f826f]">Source</span>
                <span className="text-[#b8b59f] text-[11px] truncate font-mono" title={sourceLabel}>
                    {sourceLabel}
                </span>
            </div>
        </div>
    );
}
