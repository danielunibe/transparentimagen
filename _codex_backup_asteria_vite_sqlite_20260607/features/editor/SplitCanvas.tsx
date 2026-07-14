import Image from 'next/image';
import { CutoutRefinementSettings, EditorViewMode, AssetVariant, PreviewBgMode } from '@/types/asteria';
import { ProcessingOverlay } from './ProcessingOverlay';
import { FallbackWarning } from './FallbackWarning';
import { TransparentCanvasBackground } from './TransparentCanvasBackground';

interface SplitCanvasProps {
    viewMode: EditorViewMode;
    isProcessing: boolean;
    onCancelProcessing: () => void;
    sliderPos: number;
    isDragging: boolean;
    selectedImageUrl?: string | null;
    activeVariant?: AssetVariant | null;
    previewUrl?: string | null;
    previewBg?: PreviewBgMode;
    cutoutSettings?: CutoutRefinementSettings;
}

export function SplitCanvas({
    viewMode,
    isProcessing,
    onCancelProcessing,
    sliderPos,
    isDragging,
    selectedImageUrl,
    activeVariant,
    previewUrl,
    previewBg = 'dark',
    cutoutSettings
}: SplitCanvasProps) {
    if (!selectedImageUrl) {
        return null;
    }

    const imgSrcOrig = selectedImageUrl;
    
    // Determine condition for fallback
    let fallbackMessage: string | null = null;
    let fallbackType: 'warning' | 'info' = 'warning';
    
    let imgSrcEnhance = selectedImageUrl; // Default to original
    let activeLabel = activeVariant ? activeVariant.label : 'AI Preview';

    if (previewUrl) {
        imgSrcEnhance = previewUrl;
        activeLabel = 'Preview';
    } else if (activeVariant && activeVariant.kind !== 'original') {
        if (activeVariant.objectUrl) {
            imgSrcEnhance = activeVariant.objectUrl;
        } else if (activeVariant.metadataOnly) {
            fallbackMessage = 'This variant is metadata only. Re-run the action to restore the output.';
        } else if (activeVariant.status === 'placeholder') {
            fallbackMessage = 'This action requires local AI pipeline.';
            fallbackType = 'info';
        }
    }
    
    const alphaPreviewStyle = cutoutSettings?.shadowPreview
        ? {
            filter: `drop-shadow(0 18px ${cutoutSettings.shadowBlur}px rgba(0,0,0,${cutoutSettings.shadowOpacity}))`
        }
        : undefined;

    return (
        <>
            <TransparentCanvasBackground mode={previewBg} />
            
            <div 
                className="absolute inset-0 flex items-center justify-center select-none z-0"
                style={{
                    clipPath: viewMode === 'split' ? `inset(0 0 0 ${sliderPos}%)` : viewMode === 'after' ? 'inset(0 0 0 100%)' : 'inset(0 0 0 0)',
                    transition: isDragging ? 'none' : 'clip-path 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {imgSrcOrig.startsWith('blob:') || imgSrcOrig.startsWith('data:') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                        src={imgSrcOrig} 
                        alt="Original"
                        className="object-contain object-center opacity-85 absolute inset-0 w-full h-full"
                        draggable={false}
                    />
                ) : (
                    <Image 
                        src={imgSrcOrig} 
                        alt="Original"
                        fill
                        sizes="1200px"
                        className="object-contain object-center opacity-85"
                        draggable={false}
                    />
                )}
                
                <div className="absolute top-6 right-6 px-3 py-1 bg-[#000000]/85 backdrop-blur-md border border-[#1d1e1e]/40 rounded text-[9px] font-bold uppercase tracking-widest text-[#7f826f] pointer-events-none z-20">
                    Original
                </div>
            </div>

            <div 
                className="absolute inset-0 z-10 flex items-center justify-center select-none"
                style={{ 
                    clipPath: viewMode === 'split' ? `inset(0 ${100 - sliderPos}% 0 0)` : viewMode === 'before' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)',
                    transition: isDragging ? 'none' : 'clip-path 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {imgSrcEnhance.startsWith('blob:') || imgSrcEnhance.startsWith('data:') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                        src={imgSrcEnhance} 
                        alt="AI Preview"
                        className="object-contain object-center absolute inset-0 w-full h-full"
                        style={alphaPreviewStyle}
                        draggable={false}
                    />
                ) : (
                    <Image 
                        src={imgSrcEnhance} 
                        alt="AI Preview"
                        fill
                        sizes="1200px"
                        className="object-contain object-center"
                        style={alphaPreviewStyle}
                        draggable={false}
                    />
                )}
                
                {viewMode !== 'before' && (
                    <div className="absolute top-6 left-6 px-3 py-1 bg-[#040404]/95 backdrop-blur-md border border-[#fde400]/25 rounded text-[9px] font-bold uppercase tracking-widest text-[#fde400] z-20 pointer-events-none shadow-md">
                        {activeLabel}
                    </div>
                )}
            </div>

            {viewMode === 'split' && (
                <div 
                    className="absolute inset-y-0 w-px bg-[#fde400] shadow-[0_0_15px_rgba(253,228,0,0.6)] z-30 pointer-events-none"
                    style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#000000] border border-[#fde400] flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.6)]">
                        <div className="w-2 h-0.5 bg-[#fde400] rotate-90"></div>
                    </div>
                </div>
            )}

            {isProcessing && <ProcessingOverlay onCancel={onCancelProcessing} />}
            
            {fallbackMessage && <FallbackWarning message={fallbackMessage} type={fallbackType} />}
        </>
    );
}
