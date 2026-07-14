import React from 'react';
import { EditorTopBar } from './EditorTopBar';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasEmptyState } from './CanvasEmptyState';
import { SplitCanvas } from './SplitCanvas';
import { PromptBar } from './PromptBar';
import { ActiveModeId, EditorViewMode, GalleryImageItem, GalleryItem, AssetVariant, ExportRecipe, PreviewBgMode } from '@/types/asteria';
import { useAssetActions } from '@/hooks/useAssetActions';

export interface EditorViewProps {
    activeMode: ActiveModeId | string;
    viewMode: EditorViewMode;
    setViewMode: (mode: EditorViewMode) => void;
    hasImage: boolean;
    setHasImage: (val?: boolean) => void;
    isProcessing: boolean;
    startProcessing: (prompt?: string) => void;
    stopProcessing: () => void;
    sliderPos: number;
    isDragging: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    handlePointerDown: () => void;
    workspace: any;
    selectedItem?: GalleryItem | null;
    onBack: () => void;
    variants?: AssetVariant[];
    activeVariant?: AssetVariant | null;
    registerVariant?: (variant: AssetVariant) => void;
    runPlaceholderJob?: (asset: GalleryItem, mode: any, prompt?: string, options?: any) => void;
    queueExportJob?: (item: GalleryItem, recipe: ExportRecipe, activeVariant?: AssetVariant) => Promise<any>;
}

import { useImageAdjustments } from '@/hooks/useImageAdjustments';
import { AdjustmentPanel } from './AdjustmentPanel';
import { useCutoutPreview } from '@/hooks/useCutoutPreview';
import { CutoutToolsPanel } from './CutoutToolsPanel';

export function EditorView({
    activeMode,
    viewMode,
    setViewMode,
    hasImage,
    setHasImage,
    isProcessing,
    startProcessing,
    stopProcessing,
    sliderPos,
    isDragging,
    containerRef,
    handlePointerDown,
    workspace,
    selectedItem,
    onBack,
    variants,
    activeVariant,
    registerVariant,
    runPlaceholderJob,
    queueExportJob
}: EditorViewProps) {
    const isImage = selectedItem?.kind === 'image';
    const imageItem = isImage ? (selectedItem as GalleryImageItem) : null;
    
    // Add missing previewBg state
    const [previewBg, setPreviewBg] = React.useState<PreviewBgMode>('dark');
    const hasAlpha = activeVariant?.kind === 'cutout' || activeVariant?.kind === 'refined_cutout' || activeVariant?.hasAlpha;
    
    const sourceUrl = activeVariant && activeVariant.objectUrl ? activeVariant.objectUrl : imageItem?.objectUrl;
    
    // Color adjustments
    const adjHook = useImageAdjustments(sourceUrl, registerVariant);
    
    // Cutout refinements
    const cutoutHook = useCutoutPreview(sourceUrl, registerVariant);

    const { saveSelectedAsPng, actionFeedback, showFeedback } = useAssetActions({ 
        selectedItem: selectedItem || null,
        activeVariant,
        registerVariant,
        runPlaceholderJob,
        queueExportJob
    });

    const handleApplyAdjustment = async () => {
        if (!imageItem) return;
        
        let success = false;
        if (hasAlpha) {
            success = await cutoutHook.applyAsVariant(imageItem, activeVariant);
        } else {
            success = await adjHook.applyAsVariant(imageItem, activeVariant);
        }
        
        if (success) {
            showFeedback('New refined variant created.');
        } else {
            showFeedback('Failed to apply edits.');
        }
    };
    
    const isRendering = hasAlpha ? cutoutHook.isRendering : adjHook.isRendering;
    const finalPreviewUrl = hasAlpha ? cutoutHook.previewUrl : adjHook.previewUrl;
    
    // Process local wrapper to show feedback
    const handleProcess = (prompt?: string) => {
        startProcessing(prompt);
        if (imageItem && runPlaceholderJob && activeMode) {
            let actualMode: ActiveModeId | string = activeMode;
            if (prompt && (!activeMode || activeMode === 'enhance')) {
                 actualMode = 'prompt_edit';
            }
            runPlaceholderJob(imageItem, actualMode, prompt);
            
            // Stop processing visually after short delay since background job is queued
            setTimeout(() => {
                stopProcessing();
            }, 600);
        } else {
             // Fallback
             setTimeout(() => {
                 stopProcessing();
                 if (prompt) {
                     showFeedback("Prompt saved for local AI pipeline.");
                 } else {
                     showFeedback("Ready for local AI pipeline."); 
                 }
             }, 1000);
        }
    };
    return (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
            <EditorTopBar 
                activeMode={activeMode} 
                selectedItem={imageItem} 
                onBack={onBack}
                isProcessing={isProcessing}
                activeVariant={activeVariant}
                registerVariant={registerVariant}
                queueExportJob={queueExportJob}
            />
            
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
                <CanvasToolbar 
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    hasImage={hasImage}
                    setHasImage={setHasImage}
                    previewBg={previewBg}
                    setPreviewBg={setPreviewBg}
                    hasAlpha={hasAlpha}
                />
                
                <div className="flex-1 p-4 pb-0 flex flex-col items-center justify-center overflow-hidden relative">
                    <div 
                        ref={containerRef as React.RefObject<HTMLDivElement>}
                        className="relative w-full h-full rounded-2xl border border-[#161717] overflow-hidden bg-[#020202] flex items-center justify-center"
                        onPointerDown={handlePointerDown}
                        style={{ touchAction: 'none' }}
                    >
                        {!hasImage || !imageItem ? (
                            <CanvasEmptyState onOpen={() => setHasImage(true)} />
                        ) : (
                            <>
                                <SplitCanvas 
                                    viewMode={viewMode}
                                    isProcessing={isProcessing}
                                    onCancelProcessing={stopProcessing}
                                    sliderPos={sliderPos}
                                    isDragging={isDragging}
                                    selectedImageUrl={imageItem.objectUrl}
                                    activeVariant={activeVariant}
                                    previewUrl={finalPreviewUrl}
                                    previewBg={previewBg}
                                    cutoutSettings={hasAlpha ? cutoutHook.settings : undefined}
                                />
                                
                                {/* Adjustment Panel */}
                                <div className="absolute top-4 right-4 z-40">
                                    {hasAlpha ? (
                                        <CutoutToolsPanel
                                            previewBackground={previewBg}
                                            setPreviewBackground={setPreviewBg}
                                            settings={cutoutHook.settings}
                                            setSetting={cutoutHook.setSetting}
                                            onApply={handleApplyAdjustment}
                                            hasAdjustments={cutoutHook.hasAdjustments}
                                            isRendering={cutoutHook.isRendering}
                                        />
                                    ) : (
                                        <AdjustmentPanel 
                                            settings={adjHook.settings}
                                            setSetting={adjHook.setSetting}
                                            onReset={adjHook.resetSettings}
                                            onApply={handleApplyAdjustment}
                                            hasAdjustments={adjHook.hasAdjustments}
                                            isRendering={adjHook.isRendering}
                                            canUndo={adjHook.canUndo}
                                            canRedo={adjHook.canRedo}
                                            onUndo={adjHook.undo}
                                            onRedo={adjHook.redo}
                                            compareMode={viewMode}
                                            setCompareMode={setViewMode}
                                            activePreset={adjHook.activePreset}
                                            applyPreset={adjHook.applyPreset}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <PromptBar 
                    activeMode={activeMode}
                    onProcess={handleProcess}
                    fileName={imageItem?.name}
                    onSavePng={saveSelectedAsPng}
                />
                
                {actionFeedback && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 bg-[#0a0b0b]/95 backdrop-blur-xl border border-white/[0.08] text-[#f2f2ef] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] z-50 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-2 h-2 rounded-full bg-[#fde400] animate-pulse"></div>
                        <span className="text-[13px] font-medium tracking-wide">{actionFeedback}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
