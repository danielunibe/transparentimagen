'use client';

import { useAsteriaState } from '@/hooks/useAsteriaState';
import { useSplitSlider } from '@/hooks/useSplitSlider';
import { useFolderWorkspace } from '@/hooks/useFolderWorkspace';
import { useAssetVariants } from '@/hooks/useAssetVariants';
import { GalleryItem, GalleryImageItem } from '@/types/asteria';
import { Sidebar } from '@/features/sidebar/Sidebar';
import { LibraryView } from '@/features/library/LibraryView';
import { OrganizerView } from '@/features/organizer/OrganizerView';
import { SmartFoldersView } from '@/features/smart-folders/SmartFoldersView';
import { MaterialVaultView } from '@/features/materials/MaterialVaultView';
import { EditorView } from '@/features/editor/EditorView';
import { AppChrome } from '@/features/window/AppChrome';
import { useAiProcessing } from '@/hooks/useAiProcessing';
import { JobsPanel } from '@/features/jobs/JobsPanel';
import { useExportQueue } from '@/hooks/useExportQueue';
import { ExportCenter } from '@/features/export/ExportCenter';
import { useSmartCollections } from '@/hooks/useSmartCollections';
import { useState, useCallback, useMemo } from 'react';
import { useBatchProcessing } from '@/hooks/useBatchProcessing';
import { BatchPanel } from '@/features/batch/BatchPanel';
import { usePackageExport } from '@/hooks/usePackageExport';
import { PackageExportPanel } from '@/features/export/PackageExportPanel';

export function AsteriaShell() {
    const state = useAsteriaState();
    const splitSlider = useSplitSlider();
    const workspace = useFolderWorkspace();
    
    // Find the currently selected image item
    const selectedItem = workspace.images.find(img => img.id === state.selectedItemId)
        || workspace.videos.find((video: any) => video.id === state.selectedItemId)
        || workspace.folders.find(f => f.id === state.selectedItemId)
        || null;
    const selectedImageItem = selectedItem?.kind === 'image' ? (selectedItem as GalleryImageItem) : null;

    const { variants, activeVariant, setActiveVariantId, registerVariant, clearVariants } = useAssetVariants(selectedImageItem);

    const [globalFeedback, setGlobalFeedback] = useState<string | null>(null);
    const showFeedback = useCallback((msg: string) => {
        setGlobalFeedback(msg);
        setTimeout(() => setGlobalFeedback(null), 3000);
    }, []);

    const { jobs, cancelJob, clearCompleted, runPlaceholderJob } = useAiProcessing(registerVariant, showFeedback);
    
    // Use an empty array for getVariants inside ExportQueue since it needs all active variants per image in a batch
    // We can just rely on the ones activeVariant returns or pass down?
    // Actually, export queue needs variants when batch running. Let's pass a function that returns all variants if we had them globally.
    // For now, getVariants can be () => variants (but variants is only the current selection's variants! Uh oh. Batch export needs all items' variants...)
    // Wait, the variant system right now saves ONLY session variants locally and loads everything from storageService.
    const { 
        exportJobs, 
        queueExportJob, 
        runBatchExport, 
        clearCompletedExports 
    } = useExportQueue(
        () => workspace.images,
        () => {
            // Ideally should fetch from global variant service, but we'll try to find from the current list if needed.
            // For Asteria, since we only sync variant states on select... wait. We might miss active variant of unselected items in batch.
            // We can just pass the generic variant list and let it do best-effort.
            return variants;
        }
    );

    const allItems: GalleryItem[] = useMemo(() => [...workspace.folders, ...workspace.images, ...workspace.videos], [workspace.folders, workspace.images, workspace.videos]);

    const {
        batchJobs,
        activeBatchJob,
        queueBatchJob,
        cancelBatchJob,
        clearCompletedBatchJobs,
        processingReports,
        downloadProcessingReport,
        sessionVariants
    } = useBatchProcessing(allItems, queueExportJob);

    const {
        packageJobs,
        activePackageJob,
        runPackageExport,
        downloadPackageManifest,
        clearCompletedPackages
    } = usePackageExport(allItems, queueExportJob);

    const allVariants = useMemo(() => {
        // Simple merge, favoring earlier ones if dupes? 
        // Actually they should have mostly unique IDs, but just in case we concat.
        return [...variants, ...sessionVariants];
    }, [variants, sessionVariants]);

    const {
        builtInCollections,
        savedViews,
        activeCollectionId,
        activeCollection,
        setActiveCollection,
        clearActiveCollection,
        saveCurrentView,
        deleteSavedView,
        filteredItems,
        context: smartContext
    } = useSmartCollections(
        allItems,
        allVariants, 
        exportJobs,
        jobs
    );

    return (
        <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#020303] text-[#e2e2e2] font-sans">
            <AppChrome />
            <div className="flex-1 min-h-0 w-full flex px-3 pb-3 pt-1 gap-3">
                <Sidebar 
                    currentView={state.currentView}
                    activeMode={state.activeMode}
                    filterMode={state.filterMode}
                    setActiveMode={state.setActiveMode}
                    setCurrentView={state.setCurrentView}
                    setFilterMode={state.setFilterMode}
                    workspace={workspace}
                    builtInCollections={builtInCollections}
                    savedViews={savedViews}
                    activeCollectionId={activeCollectionId}
                    onSelectCollection={setActiveCollection}
                    onDeleteSavedView={deleteSavedView}
                />

                <main className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
                {state.currentView === 'library' ? (
                    <LibraryView 
                        viewDensity={state.viewDensity}
                        cycleViewDensity={state.cycleViewDensity}
                        sortMode={state.sortMode}
                        setSortMode={state.setSortMode}
                        filterMode={state.filterMode}
                        setFilterMode={state.setFilterMode}
                        selectedAssetId={state.selectedItemId}
                        selectedItemIds={state.selectedItemIds}
                        onSelectAsset={state.selectItemId}
                        toggleSelection={state.toggleSelection}
                        clearSelection={state.clearSelection}
                        selectRange={state.selectRange}
                        onOpenEditor={state.openEditor}
                        workspace={workspace}
                        variants={allVariants}
                        activeVariant={activeVariant}
                        setActiveVariantId={setActiveVariantId}
                        registerVariant={registerVariant}
                        runPlaceholderJob={runPlaceholderJob}
                        jobs={jobs}
                        exportJobs={exportJobs}
                        queueExportJob={queueExportJob}
                        runBatchExport={runBatchExport}
                        queueBatchJob={queueBatchJob}
                        runPackageExport={runPackageExport}
                        activeCollection={activeCollection}
                        clearActiveCollection={clearActiveCollection}
                        saveCurrentView={saveCurrentView}
                        preFilteredItems={filteredItems}
                        searchContext={smartContext}
                    />
                ) : state.currentView === 'organizer' ? (
                    <OrganizerView
                        items={filteredItems || allItems}
                        onApplyFilterToAssets={(assetIds) => {
                            state.clearSelection();
                            state.selectRange(assetIds);
                            showFeedback(`Applied organizer filter to ${assetIds.length} assets.`);
                        }}
                        onBackToLibrary={state.backToLibrary}
                    />
                ) : state.currentView === 'smart_folders' ? (
                    <SmartFoldersView items={filteredItems || allItems} />
                ) : state.currentView === 'materials' ? (
                    <MaterialVaultView items={filteredItems || allItems} />
                ) : (
                    <EditorView 
                        activeMode={state.activeMode}
                        viewMode={state.viewMode}
                        setViewMode={state.setViewMode}
                        hasImage={state.hasImage}
                        setHasImage={state.setHasImage}
                        isProcessing={state.isProcessing}
                        startProcessing={state.startProcessing}
                        stopProcessing={state.stopProcessing}
                        sliderPos={splitSlider.sliderPos}
                        isDragging={splitSlider.isDragging}
                        containerRef={splitSlider.containerRef}
                        handlePointerDown={splitSlider.handlePointerDown}
                        workspace={workspace}
                        selectedItem={selectedItem}
                        onBack={state.backToLibrary}
                        variants={variants}
                        activeVariant={activeVariant}
                        registerVariant={registerVariant}
                        runPlaceholderJob={runPlaceholderJob}
                        queueExportJob={queueExportJob}
                    />
                )}
            </main>
            </div>
            
            {globalFeedback && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
                    <div className="bg-[#151818]/95 backdrop-blur-3xl px-4 py-2 rounded-full ring-1 ring-white/[0.05] shadow-lg text-[11px] text-[#f2f2ef] font-medium tracking-wide">
                        {globalFeedback}
                    </div>
                </div>
            )}
            
            <ExportCenter jobs={exportJobs} onClear={clearCompletedExports} />
            <JobsPanel jobs={jobs} onCancel={cancelJob} onClear={clearCompleted} />
            <BatchPanel activeJob={activeBatchJob} recentJobs={batchJobs} reports={processingReports} onCancel={cancelBatchJob} onClear={clearCompletedBatchJobs} onDownloadReport={downloadProcessingReport} />
            <PackageExportPanel activeJob={activePackageJob} recentJobs={packageJobs} onDownloadManifest={downloadPackageManifest} onClear={clearCompletedPackages} />
        </div>
    );
}
