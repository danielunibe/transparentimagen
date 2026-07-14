import { memo, useEffect } from 'react';
import { MemoizedFolderTile as FolderTile } from './FolderTile';
import { MemoizedMediaTile as MediaTile } from './MediaTile';
import { ViewDensity, GalleryFolderItem, GalleryImageItem, GalleryVideoItem } from '@/types/asteria';
import { FolderOpen, ImageIcon, Play } from 'lucide-react';
import { useThumbnailCache } from '@/hooks/useThumbnailCache';
import { getCollectionSizeTier, shouldShowLargeCollectionWarning, summarizePerformanceRisk } from '@/services/performanceService';

interface GalleryGridProps {
    viewDensity: ViewDensity;
    folders: GalleryFolderItem[];
    items: Array<GalleryImageItem | GalleryVideoItem>;
    selectedAssetId?: string | null;
    selectedIds?: Set<string>;
    onSelectAsset: (id: string, url?: string) => void;
    onSelectAssetEvent?: (e: React.MouseEvent, id: string, url?: string) => void;
    onOpenFolder: (folder: GalleryFolderItem) => void;
    onOpenMedia: (item: GalleryImageItem | GalleryVideoItem) => void;
}

export function GalleryGrid({
    viewDensity,
    folders,
    items,
    selectedAssetId,
    selectedIds,
    onSelectAsset,
    onSelectAssetEvent,
    onOpenFolder,
    onOpenMedia
}: GalleryGridProps) {
    const { thumbnailsByAssetId, loadingThumbnailIds, getOrCreateThumbnail } = useThumbnailCache();
    const totalCount = folders.length + items.length;
    const sizeTier = getCollectionSizeTier(totalCount);
    const thumbnailBudget = sizeTier === 'huge' ? 24 : sizeTier === 'large' ? 40 : 60;

    // Progressively load thumbnails for a bounded set so large folders do not flood the queue.
    useEffect(() => {
        let mounted = true;
        
        async function loadThumbnails() {
            const limit = Math.min(items.length, thumbnailBudget);
            for (let i = 0; i < limit; i++) {
                if (!mounted) break;
                if (items[i].kind === 'image') {
                    await getOrCreateThumbnail(items[i]);
                }
            }
        }
        
        loadThumbnails();
        return () => { mounted = false; };
    }, [items, getOrCreateThumbnail, thumbnailBudget]);

    if (viewDensity === 'list') {
        return (
            <div className="max-w-[1800px] mx-auto w-full pb-20 flex flex-col gap-1.5 px-2">
                {shouldShowLargeCollectionWarning(totalCount) && (
                    <div className="mb-2 rounded-xl border border-[#fde400]/20 bg-[#fde400]/8 px-3 py-2 text-[11px] text-[#fde400]">
                        {summarizePerformanceRisk(totalCount)}
                    </div>
                )}
                {/* List Header */}
                <div className="flex items-center px-4 py-2 border-b border-white/[0.04] mb-2 text-[#7f826f] text-[11px] font-semibold tracking-wide">
                    <div className="w-[40px]"></div>
                    <div className="flex-1">Name</div>
                    <div className="hidden md:block w-[120px]">Type</div>
                    <div className="hidden lg:block w-[120px]">Size</div>
                    <div className="hidden xl:block w-[140px]">Modified</div>
                </div>

                {folders.map(folder => {
                    const isSelected = selectedIds ? selectedIds.has(folder.id) : selectedAssetId === folder.id;
                    return (
                        <div 
                            key={folder.id} 
                            onClick={(e) => onSelectAssetEvent ? onSelectAssetEvent(e, folder.id) : onSelectAsset(folder.id)}
                            onDoubleClick={() => onOpenFolder(folder)}
                            className={`flex items-center px-4 py-2.5 rounded-xl cursor-pointer transition-colors group ${isSelected ? 'bg-[#151818] ring-1 ring-white/[0.1] shadow-lg' : 'hover:bg-white/[0.02] ring-1 ring-transparent'}`}
                        >
                            <div className="w-[40px] flex justify-center">
                                <FolderOpen className={`w-5 h-5 ${isSelected ? 'text-[#fde400]' : 'text-[#7f826f] group-hover:text-white'}`} />
                            </div>
                            <div className="flex-1 text-[#f2f2ef] font-medium text-[13px]">{folder.name}</div>
                            <div className="hidden md:block w-[120px] text-[#7f826f] text-[12px] capitalize">Folder</div>
                            <div className="hidden lg:block w-[120px] text-[#7f826f] text-[12px]">{folder.imageCount} items</div>
                            <div className="hidden xl:block w-[140px] text-[#7f826f] text-[12px]">-</div>
                        </div>
                    );
                })}

                {items.map(item => {
                    const isSelected = selectedIds ? selectedIds.has(item.id) : selectedAssetId === item.id;
                    const thumbUrl = thumbnailsByAssetId[item.id];
                    
                    return (
                        <div 
                            key={item.id} 
                            onClick={(e) => onSelectAssetEvent ? onSelectAssetEvent(e, item.id, item.objectUrl) : onSelectAsset(item.id, item.objectUrl)}
                            onDoubleClick={() => onOpenMedia(item)}
                            className={`flex items-center px-4 py-2 rounded-xl cursor-pointer transition-colors group ${isSelected ? 'bg-[#151818] ring-1 ring-white/[0.1] shadow-lg' : 'hover:bg-white/[0.02] ring-1 ring-transparent'}`}
                        >
                            <div className="w-[40px] flex justify-center">
                                <div className="w-8 h-8 rounded-lg bg-[#202020] overflow-hidden flex items-center justify-center shrink-0">
                                   {item.kind === 'image' && (thumbUrl || item.objectUrl) ? (
                                       <img src={thumbUrl || item.objectUrl} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                   ) : item.kind === 'video' ? (
                                       <Play className="w-4 h-4 text-[#fde400]" />
                                   ) : (
                                       <ImageIcon className="w-4 h-4 text-[#7f826f]" />
                                   )}
                                </div>
                            </div>
                            <div className="flex-1 text-[#f2f2ef] font-medium text-[13px]">{item.name}</div>
                            <div className="hidden md:block w-[120px] text-[#7f826f] text-[12px] uppercase">{item.metadata?.extension || item.type.split('/')[1] || item.type}</div>
                            <div className="hidden lg:block w-[120px] text-[#7f826f] text-[12px]">{item.size}</div>
                            <div className="hidden xl:block w-[140px] text-[#7f826f] text-[12px]">{item.metadata?.modifiedLabel || '-'}</div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const gridClass = viewDensity === 'compact' 
        ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 gap-y-3' 
        : viewDensity === 'large' 
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5' 
        : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-4';

    return (
        <div className="max-w-[1800px] mx-auto w-full pb-20">
            {shouldShowLargeCollectionWarning(totalCount) && (
                <div className="mb-3 rounded-xl border border-[#fde400]/20 bg-[#fde400]/8 px-3 py-2 text-[11px] text-[#fde400]">
                    {summarizePerformanceRisk(totalCount)}
                </div>
            )}
            <div className={`grid ${gridClass}`}>
                {folders.map((folder) => {
                    const isSelected = selectedIds ? selectedIds.has(folder.id) : selectedAssetId === folder.id;
                    return (
                        <FolderTile 
                            key={folder.id} 
                            folder={folder} 
                            isSelected={isSelected}
                            onSelect={(e) => onSelectAssetEvent ? onSelectAssetEvent(e as any, folder.id) : onSelectAsset(folder.id)}
                            onOpen={() => onOpenFolder(folder)} 
                        />
                    );
                })}
                
                {items.map((item) => {
                    const isSelected = selectedIds ? selectedIds.has(item.id) : selectedAssetId === item.id;
                    return (
                        <MediaTile 
                            key={item.id}
                            item={item}
                            isSelected={isSelected}
                            onSelect={(e) => onSelectAssetEvent ? onSelectAssetEvent(e as any, item.id, item.kind === 'image' ? item.objectUrl : undefined) : onSelectAsset(item.id, item.kind === 'image' ? item.objectUrl : undefined)}
                            onOpen={() => onOpenMedia(item)}
                            thumbnailUrl={item.kind === 'image' ? thumbnailsByAssetId[item.id] : undefined}
                            isThumbnailLoading={item.kind === 'image' ? loadingThumbnailIds.has(item.id) : false}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export const MemoizedGalleryGrid = memo(GalleryGrid);
