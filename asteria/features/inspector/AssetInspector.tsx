import { GalleryItem, AssetVariant } from '@/types/asteria';
import { InspectorHeader } from './InspectorHeader';
import { InspectorPreview } from './InspectorPreview';
import { InspectorMetadata } from './InspectorMetadata';
import { InspectorBadges } from './InspectorBadges';
import { InspectorActions } from './InspectorActions';
import { InspectorVariants } from './InspectorVariants';
import { InspectorAiStatus } from './InspectorAiStatus';

export interface AssetInspectorProps {
    selectedItem: GalleryItem | null;
    onClose: () => void;
    onEdit?: () => void;
    onEnhance?: () => void;
    onRemoveBg?: () => void;
    onUpscale?: () => void;
    onPortrait?: () => void;
    onUe5?: () => void;
    onSavePng?: () => void;
    onExportSvg?: () => void;
    onLocate?: () => void;
    onOpenFolder?: () => void;
    onRescanFolder?: () => void;
    variants?: AssetVariant[];
    activeVariantId?: string | null;
    onSelectVariant?: (id: string) => void;
    showFeedback?: (msg: string) => void;
    latestJob?: any;
    jobs?: any[];
    exportJobs?: any[];
}

export function AssetInspector({
    selectedItem,
    onClose,
    onEdit,
    onEnhance,
    onRemoveBg,
    onUpscale,
    onPortrait,
    onUe5,
    onSavePng,
    onExportSvg,
    onLocate,
    onOpenFolder,
    onRescanFolder,
    variants,
    activeVariantId,
    onSelectVariant,
    showFeedback,
    latestJob,
    jobs = [],
    exportJobs = []
}: AssetInspectorProps) {
    if (!selectedItem) {
        return null; // The parent should ideally not render this if null, but this is a safeguard.
    }

    const itemVariants = variants?.filter(v => v.assetId === selectedItem.id) || [];
    const itemJobs = jobs?.filter(j => j.assetId === selectedItem.id) || [];
    const itemExports = exportJobs?.filter(j => j.assetId === selectedItem.id) || [];

    return (
        <aside className="w-[300px] xl:w-[320px] h-full flex flex-col bg-[#101212]/80 backdrop-blur-xl shrink-0 rounded-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.04] overflow-hidden">
            <InspectorHeader onClose={onClose} />
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 pt-4 flex flex-col gap-5">
                <div>
                   <InspectorPreview item={selectedItem} />
                   <InspectorBadges item={selectedItem} />
                   <InspectorMetadata 
                        item={selectedItem} 
                        variants={itemVariants}
                        aiJobs={itemJobs}
                        exportJobs={itemExports}
                   />
                   
                   {selectedItem.kind === 'image' && latestJob && (
                       <InspectorAiStatus item={selectedItem} job={latestJob} />
                   )}
                   
                   <InspectorActions 
                       item={selectedItem}
                       onEdit={onEdit}
                       onEnhance={onEnhance}
                       onRemoveBg={onRemoveBg}
                       onUpscale={onUpscale}
                       onPortrait={onPortrait}
                       onUe5={onUe5}
                       onSavePng={onSavePng}
                       onExportSvg={onExportSvg}
                       onLocate={onLocate}
                       onOpenFolder={onOpenFolder}
                       onRescanFolder={onRescanFolder}
                   />
                </div>
                {selectedItem.kind === 'image' && variants && variants.length > 0 && onSelectVariant && showFeedback && (
                    <div className="-mx-5 border-t border-[#161717]">
                       <InspectorVariants 
                           variants={variants}
                           activeVariantId={activeVariantId || null}
                           onSelectVariant={onSelectVariant}
                           showFeedback={showFeedback}
                       />
                    </div>
                )}
            </div>
        </aside>
    );
}
