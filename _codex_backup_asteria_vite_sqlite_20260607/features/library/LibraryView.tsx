import { useState, useEffect, useMemo } from 'react';
import { LibraryHeader } from './LibraryHeader';
import { MemoizedGalleryGrid as GalleryGrid } from './GalleryGrid';
import { shouldShowLargeCollectionWarning, summarizePerformanceRisk } from '@/services/performanceService';
import { EmptyLibraryState } from './EmptyLibraryState';
import { SelectionActionBar } from './SelectionActionBar';
import { ScanningState } from './ScanningState';
import { EmptyFolderState } from './EmptyFolderState';
import { SearchEmptyState } from './SearchEmptyState';
import { ReconnectFolderState } from './ReconnectFolderState';
import { ViewDensity, GalleryItem, AssetVariant, AssetSortMode, AssetFilterMode, GalleryFolderItem } from '@/types/asteria';
import { AssetInspector } from '@/features/inspector/AssetInspector';
import { useAssetActions } from '@/hooks/useAssetActions';
import { useExplorerControls } from '@/hooks/useExplorerControls';

export interface LibraryViewProps {
    viewDensity: ViewDensity;
    cycleViewDensity: () => void;
    sortMode: AssetSortMode;
    setSortMode: (mode: AssetSortMode) => void;
    filterMode: AssetFilterMode;
    setFilterMode: (mode: AssetFilterMode) => void;
    selectedAssetId: string | null;
    selectedItemIds: Set<string>;
    onSelectAsset: (id: string, url?: string) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    selectRange: (ids: string[]) => void;
    onOpenEditor: () => void;
    workspace: any;
    variants: AssetVariant[];
    activeVariant: AssetVariant | null;
    setActiveVariantId: (id: string) => void;
    registerVariant: (variant: AssetVariant) => void;
    runPlaceholderJob?: (asset: GalleryItem, mode: any, prompt?: string) => void;
    jobs?: any[];
    exportJobs?: any[];
    queueExportJob?: any;
    runBatchExport?: any;
    queueBatchJob?: any;
    runPackageExport?: any;
    activeCollection?: any;
    clearActiveCollection?: () => void;
    saveCurrentView?: (label: string, criteria: any) => void;
    preFilteredItems?: GalleryItem[];
    searchContext?: any;
}

export function LibraryView({
    viewDensity,
    cycleViewDensity,
    sortMode,
    setSortMode,
    filterMode,
    setFilterMode,
    selectedAssetId,
    selectedItemIds,
    onSelectAsset,
    toggleSelection,
    clearSelection,
    selectRange,
    onOpenEditor,
    workspace,
    variants,
    activeVariant,
    setActiveVariantId,
    registerVariant,
    runPlaceholderJob,
    jobs = [],
    exportJobs = [],
    queueExportJob,
    runBatchExport,
    queueBatchJob,
    runPackageExport,
    activeCollection,
    clearActiveCollection,
    saveCurrentView,
    preFilteredItems,
    searchContext
}: LibraryViewProps) {
    const hasItems = workspace.folders.length > 0 || workspace.images.length > 0 || workspace.videos.length > 0;
    const totalCount = workspace.folders.length + workspace.images.length + workspace.videos.length;
    
    // Combine raw items or use preFiltered if a collection is active
    const rawItems: GalleryItem[] = useMemo(() => {
        if (preFilteredItems) return preFilteredItems;
        return [
            ...workspace.folders,
            ...workspace.images,
            ...workspace.videos
        ];
    }, [preFilteredItems, workspace.folders, workspace.images, workspace.videos]);

    const { visibleItems, selectedItems } = useExplorerControls(
         rawItems, 
         workspace.searchQuery || '', 
         activeCollection?.criteria?.sortMode || sortMode, 
         activeCollection?.criteria?.filterMode || filterMode, 
         selectedItemIds,
         searchContext
    );

    const visibleFolders = useMemo(() => visibleItems.filter(i => i.kind === 'folder') as GalleryFolderItem[], [visibleItems]);
    const visibleMedia = useMemo(() => visibleItems.filter(i => i.kind === 'image' || i.kind === 'video') as any[], [visibleItems]);
    const isFilterEmpty = hasItems && visibleItems.length === 0;

    const selectedItem = selectedItems.length > 0 ? selectedItems[0] : null;

    const [showOverlay, setShowOverlay] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Reset overlay when selection changes linearly
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowOverlay(false);
    }, [selectedAssetId]);

    const {
        actionFeedback,
        showFeedback,
        editSelectedAsset,
        openSelectedFolder,
        rescanSelectedFolder,
        locateSelectedAsset,
        enhanceSelectedAsset,
        removeBgSelectedAsset,
        upscaleSelectedAsset,
        portraitSelectedAsset,
        ue5SelectedAsset,
        saveSelectedAsPng,
        exportSelectedAsSvg
    } = useAssetActions({
        selectedItem,
        activeVariant,
        onOpenEditor,
        onOpenFolder: workspace.openSubFolder,
        onRescanFolder: workspace.rescanCurrent,
        registerVariant,
        runPlaceholderJob,
        queueExportJob
    });

    const handleItemClick = (e: React.MouseEvent, id: string, url?: string) => {
        if (e.ctrlKey || e.metaKey) {
            toggleSelection(id);
        } else if (e.shiftKey) {
            // Simplified shift select: just select range if possible or add to selection
            toggleSelection(id);
        } else {
            onSelectAsset(id, url);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging && e.dataTransfer.types.some(t => t === 'Files' || t === 'application/x-moz-file')) {
            setIsDragging(true);
        }
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (!items || items.length === 0) return;

        let hasFolder = false;
        const potentialImages: File[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
                if (entry && entry.isDirectory) {
                    hasFolder = true;
                } else {
                    const file = item.getAsFile();
                    if (file && file.type.startsWith('image/')) {
                        potentialImages.push(file);
                    }
                }
            }
        }

        if (hasFolder) {
            showFeedback('Folder drop support requires File System Access API which is best used via Add Folder button.');
        } else if (potentialImages.length > 0) {
            // Check if method exists on workspace (added via TS)
            if (workspace.addDroppedFilesSource) {
                workspace.addDroppedFilesSource(potentialImages);
                showFeedback(`Imported ${potentialImages.length} images to a temporary source.`);
            } else {
                showFeedback(`Dropped ${potentialImages.length} images! Currently waiting for full workspace drop support phase.`);
            }
        }
    };

    return (
        <div 
           className="flex-1 flex flex-col h-full bg-transparent min-w-0 relative outline-none"
           tabIndex={0}
           onKeyDown={(e) => {
               if (e.key === 'Escape') clearSelection();
               if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                   e.preventDefault();
                   selectRange(visibleItems.map(i => i.id));
               }
           }}
           onDragOver={onDragOver}
           onDragLeave={onDragLeave}
           onDrop={onDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-[100] bg-[#fde400]/10 backdrop-blur-[2px] border-2 border-dashed border-[#fde400] m-4 rounded-3xl flex items-center justify-center pointer-events-none transition-all animate-in fade-in">
                    <div className="bg-[#101212] px-6 py-4 rounded-2xl shadow-2xl ring-1 ring-[#fde400]/30 flex flex-col items-center">
                        <div className="w-12 h-12 bg-[#fde400]/20 rounded-full flex items-center justify-center mb-3 text-[#fde400]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        </div>
                        <h2 className="text-[#f2f2ef] font-bold text-lg">Drop images to import</h2>
                        <p className="text-[#a0a0a0] text-sm mt-1">Image files will be added temporarily.</p>
                    </div>
                </div>
            )}
            {actionFeedback && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
                    <div className="bg-[#151818]/95 backdrop-blur-3xl px-4 py-2 rounded-full ring-1 ring-white/[0.05] shadow-lg text-[11px] text-[#f2f2ef] font-medium tracking-wide">
                        {actionFeedback}
                    </div>
                </div>
            )}
            <div className="p-4 z-20 shrink-0">
                <LibraryHeader 
                    viewDensity={viewDensity} 
                    cycleViewDensity={cycleViewDensity}
                    sortMode={sortMode}
                    setSortMode={setSortMode}
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                    workspace={workspace}
                    activeCollection={activeCollection}
                    clearActiveCollection={clearActiveCollection}
                    saveCurrentView={saveCurrentView}
                />
            </div>
            {shouldShowLargeCollectionWarning(totalCount) && (
                <div className="px-4 pb-2">
                    <div className="rounded-xl border border-[#fde400]/20 bg-[#fde400]/8 px-3 py-2 text-[11px] text-[#fde400]">
                        {summarizePerformanceRisk(totalCount)}
                    </div>
                </div>
            )}
            
            <div className="flex-1 relative bg-transparent flex flex-row min-h-0 min-w-0 pb-4 pr-4 pl-4 gap-4">
                <div className="flex-1 min-w-0 relative h-full">
                    <div className="absolute inset-0 overflow-y-auto no-scrollbar pb-6 px-2 lg:px-4">
                        {!workspace.currentHandle && workspace.needsReconnect ? (
                            <ReconnectFolderState 
                                source={workspace.folderSources.find((s: any) => s.id === workspace.currentSourceId)}
                                onReconnect={() => workspace.addFolderSource(true)} 
                            />
                        ) : workspace.isScanning ? (
                            <ScanningState />
                        ) : workspace.currentHandle && !hasItems && workspace.searchQuery ? (
                            <SearchEmptyState onClear={() => workspace.setSearchQuery("")} />
                        ) : activeCollection && isFilterEmpty ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-60">
                                <h3 className="text-[#f2f2ef] font-medium mb-1 text-lg">No assets in this collection</h3>
                                <p className="text-[#7f826f] text-sm mt-1">Try another collection or clear the active view.</p>
                            </div>
                        ) : isFilterEmpty ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-60">
                                <h3 className="text-[#f2f2ef] font-medium mb-1">No assets match this filter</h3>
                                <p className="text-[#7f826f] text-sm">Try changing the filter or sorting.</p>
                            </div>
                        ) : workspace.currentHandle && !hasItems ? (
                            <EmptyFolderState 
                                onBack={workspace.breadcrumb.length > 1 ? () => workspace.navigateToBreadcrumb(workspace.breadcrumb.length - 2) : undefined} 
                                onAddFolder={workspace.addFolderSource} 
                                onRescan={workspace.rescanCurrent} 
                            />
                        ) : hasItems ? (
                            <GalleryGrid 
                                viewDensity={viewDensity}
                                folders={visibleFolders}
                                items={visibleMedia}
                                selectedAssetId={selectedAssetId}
                                selectedIds={selectedItemIds}
                                onSelectAsset={(id, url) => handleItemClick({} as any, id, url)}
                                onSelectAssetEvent={handleItemClick}
                                onOpenMedia={(item) => {
                                    if (item.kind === 'image') {
                                        onOpenEditor();
                                    } else {
                                        showFeedback('Video support is organizer-first in this phase. Processing tools remain image-only.');
                                    }
                                }}
                                onOpenFolder={workspace.openSubFolder}
                            />
                        ) : (
                            <EmptyLibraryState onAddFolder={workspace.addFolderSource} />
                        )}
                    </div>
                    
                    <SelectionActionBar 
                        selectedCount={selectedItemIds.size} 
                        selectedItem={selectedItem}
                        onEdit={editSelectedAsset}
                        onEnhance={enhanceSelectedAsset}
                        onRemoveBg={removeBgSelectedAsset}
                        onUpscale={upscaleSelectedAsset}
                        onPortrait={portraitSelectedAsset}
                        onUe5={ue5SelectedAsset}
                        onSavePng={saveSelectedAsPng}
                        onExportSvg={exportSelectedAsSvg}
                        onLocate={locateSelectedAsset}
                        onOpenFolder={openSelectedFolder}
                        onRescanFolder={rescanSelectedFolder}
                        onInfo={() => setShowOverlay(true)}
                        onClearSelection={clearSelection}
                        onBatchFeedback={(msg) => showFeedback(msg)}
                        onBatchAction={(action, presetId, presetLabel, options) => {
                            if (queueBatchJob) {
                                let label = 'Batch Job';
                                if (action === 'apply_preset') label = `Applying ${presetLabel || 'Preset'}`;
                                if (action === 'enhance') label = 'Batch Enhance';
                                if (action === 'portrait') label = 'Batch Portrait';
                                if (action === 'ue5') label = 'Batch UE5';
                                if (action === 'upscale') {
                                    const engineLabel = options?.upscale?.engine === 'real-esrgan'
                                        ? 'Real-ESRGAN'
                                        : options?.upscale?.engine === 'pillow'
                                            ? 'Pillow'
                                            : 'Auto';
                                    label = `Batch Upscale ${presetLabel || '2x'} • ${engineLabel}`;
                                }
                                if (action === 'export_png') label = 'Batch PNG Export';
                                const batchOptions = action === 'upscale'
                                    ? (options || { upscale: { scale: Number(presetId || 2) as 2 | 3 | 4, engine: 'auto' as const } })
                                    : undefined;

                                queueBatchJob(label, action, Array.from(selectedItemIds), action === 'upscale' ? undefined : presetId, action === 'upscale' ? undefined : presetLabel, batchOptions);
                                showFeedback(`${label} queued.`);
                                clearSelection();
                            }
                        }}
                        onPackageExport={() => {
                            if (runPackageExport) {
                                // Default to a standard manifest of original / active variants for PNGs for now
                                import('@/data/exportRecipes').then(({ exportRecipes }) => {
                                    runPackageExport("Batch Package Export", Array.from(selectedItemIds), exportRecipes['png_active_variant'], variants);
                                    showFeedback("Package export started. Manifest downloaded.");
                                    clearSelection();
                                });
                            }
                        }}
                    />
                </div>

                {selectedItem && selectedItem.kind !== 'video' && selectedItemIds.size === 1 && (
                    <div className={`xl:static xl:block ${showOverlay ? 'fixed right-4 top-24 bottom-[90px] z-50 block shadow-2xl' : 'hidden'} transition-all`}>
                        <AssetInspector 
                            selectedItem={selectedItem} 
                            onClose={() => {
                                if (showOverlay) setShowOverlay(false);
                                else clearSelection();
                            }}
                            onEdit={editSelectedAsset}
                            onEnhance={enhanceSelectedAsset}
                            onRemoveBg={removeBgSelectedAsset}
                            onUpscale={upscaleSelectedAsset}
                            onPortrait={portraitSelectedAsset}
                            onUe5={ue5SelectedAsset}
                            onSavePng={saveSelectedAsPng}
                            onExportSvg={exportSelectedAsSvg}
                            onLocate={locateSelectedAsset}
                            onOpenFolder={openSelectedFolder}
                            onRescanFolder={rescanSelectedFolder}
                            variants={variants}
                            activeVariantId={activeVariant?.id || null}
                            onSelectVariant={setActiveVariantId}
                            showFeedback={showFeedback}
                            latestJob={jobs.filter(j => j.assetId === selectedItem?.id).sort((a, b) => b.createdAt - a.createdAt)[0]}
                            jobs={jobs}
                            exportJobs={exportJobs}
                        />
                    </div>
                )}
                {selectedItemIds.size > 1 && (
                    <div className={`xl:static xl:block ${showOverlay ? 'fixed right-4 top-24 bottom-[90px] z-50 block shadow-2xl' : 'hidden'} transition-all`}>
                        <aside className="w-[300px] xl:w-[320px] h-full flex flex-col bg-[#101212]/80 backdrop-blur-xl shrink-0 rounded-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.04] overflow-hidden">
                            <div className="h-12 border-b border-white/[0.04] flex flex-row items-center justify-between px-4">
                                <span className="text-[13px] font-bold text-[#f2f2ef]">Multiple selected</span>
                                <button onClick={() => { if (showOverlay) setShowOverlay(false); else clearSelection(); }} className="w-6 h-6 flex items-center justify-center text-[#7f826f] hover:text-[#f2f2ef] rounded-md transition-colors hover:bg-white/[0.035]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-14 h-14 bg-[#151818] rounded-xl flex items-center justify-center mb-4 ring-1 ring-white/[0.04]">
                                    <span className="text-[#fde400] text-xl font-bold">{selectedItemIds.size}</span>
                                </div>
                                <h3 className="text-[#f2f2ef] font-medium text-[14px]">Items Selected</h3>
                                <p className="text-[#7f826f] text-[11px] mt-1.5 leading-relaxed">
                                    Batch processing and bulk editing are available from the action bar.
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}
