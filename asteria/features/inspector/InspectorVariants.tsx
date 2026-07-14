import { CheckCircle2, Clock, Image as ImageIcon, Box, AlertTriangle, SlidersHorizontal, Maximize2 } from 'lucide-react';
import { AssetVariant, AssetVariantStatus, AssetVariantKind } from '@/types/asteria';

interface InspectorVariantsProps {
    variants: AssetVariant[];
    activeVariantId: string | null;
    onSelectVariant: (variantId: string) => void;
    showFeedback: (msg: string) => void;
}

const statusConfig: Record<AssetVariantStatus, { icon: any, color: string }> = {
    ready: { icon: CheckCircle2, color: 'text-green-400' },
    pending: { icon: Clock, color: 'text-yellow-400' },
    placeholder: { icon: Clock, color: 'text-[#7f826f]' },
    failed: { icon: AlertTriangle, color: 'text-red-400' }
};

const kindIcons: Record<AssetVariantKind, any> = {
    original: ImageIcon,
    png_export: ImageIcon,
    svg_container: Box,
    ai_preview: Clock,
    enhanced: Box,
    cutout: Box,
    refined_cutout: Box,
    upscaled: Maximize2,
    portrait: Box,
    ue5: Box,
    adjustment: SlidersHorizontal
};

export function InspectorVariants({
    variants,
    activeVariantId,
    onSelectVariant,
    showFeedback
}: InspectorVariantsProps) {
    if (!variants || variants.length === 0) return null;

    const handleSelect = (v: AssetVariant) => {
        onSelectVariant(v.id);
        if (v.metadataOnly) {
            showFeedback('This variant output is not available in this session.');
        } else if (v.kind !== 'original') {
            showFeedback('Variant selected.');
        }
    };

    return (
        <div className="border-t border-[#161717] px-6 py-5">
            <h3 className="text-[10px] font-bold text-[#b8b59f] uppercase tracking-widest mb-4">Variants</h3>
            <div className="flex flex-col gap-2">
                {variants.map(variant => {
                    const isActive = variant.id === activeVariantId;
                    const StatusIcon = statusConfig[variant.status].icon;
                    const statusColor = statusConfig[variant.status].color;
                    const KindIcon = kindIcons[variant.kind] || Box;

                    return (
                        <button
                            key={variant.id}
                            onClick={() => handleSelect(variant)}
                            className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors border ${
                                isActive ? 'bg-[#121313] border-[#2a2a2a]' : 'bg-transparent border-transparent hover:bg-[#0a0b0b]'
                            }`}
                        >
                            <div className="pt-0.5 shrink-0">
                                <KindIcon className={`w-4 h-4 ${isActive ? 'text-[#fde400]' : 'text-[#7f826f]'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[12px] font-medium truncate ${isActive ? 'text-[#f2f2ef]' : 'text-[#b8b59f]'}`}>
                                        {variant.label}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {(variant.kind === 'cutout' || variant.kind === 'refined_cutout') && <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-[1px] rounded tracking-wider uppercase font-bold">Cutout</span>}
                                        {(variant.hasAlpha || variant.kind === 'cutout' || variant.kind === 'refined_cutout') && !variant.metadataOnly && <span className="bg-cyan-500/10 text-cyan-300 text-[9px] px-1.5 py-[1px] rounded tracking-wider uppercase font-bold">Alpha PNG</span>}
                                        {variant.kind === 'refined_cutout' && <span className="bg-[#fde400]/10 text-[#fde400] text-[9px] px-1.5 py-[1px] rounded tracking-wider uppercase font-bold">Refined</span>}
                                        {variant.kind === 'upscaled' && <span className="bg-[#4de082]/10 text-[#4de082] text-[9px] px-1.5 py-[1px] rounded tracking-wider uppercase font-bold">Upscaled</span>}
                                        {variant.kind === 'upscaled' && <span className="bg-[#4de082]/10 text-[#4de082] text-[9px] px-1.5 py-[1px] rounded tracking-wider uppercase font-bold">{variant.upscaleScale || 2}x</span>}
                                        {variant.sessionOnly && <span className="bg-[#fde400]/10 text-[#fde400] text-[9px] px-1.5 py-[1px] rounded tracking-wider uppercase font-bold">Session</span>}
                                        {variant.metadataOnly && <span className="bg-[#7f826f]/20 text-[#7f826f] text-[9px] px-1.5 py-[1px] rounded tracking-wider uppercase font-medium">Metadata</span>}
                                        <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />
                                    </div>
                                </div>
                                {(variant.presetLabel) && (
                                    <div className="text-[10px] text-[#4de082] mt-0.5 truncate uppercase tracking-widest font-bold">
                                        Preset: {variant.presetLabel}
                                    </div>
                                )}
                                {(variant.filename || variant.sizeLabel) && (
                                    <div className="text-[10px] text-[#7f826f] font-mono mt-1 truncate">
                                        {variant.filename} {variant.sizeLabel && `• ${variant.sizeLabel}`}
                                    </div>
                                )}
                                 {variant.kind === 'upscaled' && (
                                     <div className="mt-0.5 flex flex-col gap-0.5">
                                         <div className="text-[10px] text-[#4de082] truncate uppercase tracking-widest font-bold">
                                             Engine: {variant.actualEngine || variant.upscaleEngine || 'pillow_lanczos'}
                                         </div>
                                         {(variant.upscaleQualityPreset || variant.tileSize || variant.tilePad || variant.modelId) && (
                                             <div className="text-[9px] text-[#7f826f] uppercase tracking-widest">
                                                 {variant.upscaleQualityPreset ? `Preset ${variant.upscaleQualityPreset}` : 'Preset balanced'}
                                                 {variant.tileSize ? ` • Tile ${variant.tileSize}` : ''}
                                                 {variant.tilePad ? ` • Pad ${variant.tilePad}` : ''}
                                                 {variant.modelId ? ` • ${variant.modelId.replace('.onnx', '')}` : ''}
                                             </div>
                                         )}
                                         {variant.fallbackFrom && (
                                             <div className="text-[9px] text-[#f59e0b] uppercase tracking-widest font-bold">
                                                 Fallback from {variant.fallbackFrom}
                                             </div>
                                         )}
                                         {(variant.memoryMode || variant.estimatedCost) && (
                                             <div className="text-[9px] text-[#7f826f] uppercase tracking-widest">
                                                 {variant.memoryMode ? `Memory ${variant.memoryMode}` : ''}
                                                 {variant.estimatedCost ? ` • Cost ${variant.estimatedCost}` : ''}
                                             </div>
                                         )}
                                         <div className="text-[9px] text-[#7f826f] uppercase tracking-widest">
                                             Session / Metadata only
                                         </div>
                                     </div>
                                 )}
                                {variant.status === 'placeholder' && (
                                    <div className="text-[10px] text-[#7f826f] italic mt-0.5 truncate">
                                        {variant.note || 'AI Preview'}
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
