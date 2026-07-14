import { GalleryItem } from '@/types/asteria';
import { MousePointer2, Wand2, Download, Image as ImageIcon, MapPin, FolderOpen, RefreshCw } from 'lucide-react';

interface InspectorActionsProps {
    item: GalleryItem;
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
}

export function InspectorActions({ 
    item, 
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
    onRescanFolder
}: InspectorActionsProps) {
    if (item.kind === 'folder') {
        return (
            <div className="flex flex-col gap-2 mt-5">
                {onOpenFolder && (
                    <button onClick={onOpenFolder} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#fde400] text-[#121414] font-bold text-[12px] rounded-xl hover:brightness-110 active:brightness-95 transition-colors shadow-sm mb-2">
                        <FolderOpen className="w-3.5 h-3.5" /> Open Folder
                    </button>
                )}
                <div className="flex gap-2">
                    {onRescanFolder && (
                        <button onClick={onRescanFolder} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                            <RefreshCw className="w-3 h-3 text-[#b8b59f]" /> Rescan
                        </button>
                    )}
                    {onLocate && (
                        <button onClick={onLocate} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                            <MapPin className="w-3 h-3 text-[#b8b59f]" /> Locate
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-2 mt-5">
            {onEdit && (
                <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#fde400] text-[#121414] font-bold text-[12px] rounded-xl hover:brightness-110 active:brightness-95 transition-colors shadow-sm mb-2">
                    <MousePointer2 className="w-3.5 h-3.5" /> Edit Asset
                </button>
            )}
            
            <div className="text-[10px] text-[#7f826f] font-medium tracking-wider mb-1 pt-2">AI ACTIONS</div>
            <div className="grid grid-cols-2 gap-2">
                {onEnhance && (
                    <button onClick={onEnhance} className="flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                        <Wand2 className="w-3 h-3 text-[#b8b59f]" /> Enhance
                    </button>
                )}
                {onRemoveBg && (
                    <button onClick={onRemoveBg} className="flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                        Remove BG
                    </button>
                )}
                {onUpscale && (
                    <button onClick={onUpscale} className="flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                        Upscale 2x
                    </button>
                )}
                {onPortrait && (
                    <button onClick={onPortrait} className="flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                        Portrait
                    </button>
                )}
                {onUe5 && (
                    <button onClick={onUe5} className="flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                        UE5
                    </button>
                )}
            </div>
            
            <div className="text-[10px] text-[#7f826f] font-medium tracking-wider mt-3 mb-1 pt-2">EXPORT</div>
            <div className="flex gap-2">
                {onSavePng && (
                    <button onClick={onSavePng} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm">
                        <ImageIcon className="w-3 h-3 text-[#b8b59f]" /> PNG
                    </button>
                )}
                {onExportSvg && (
                    <button onClick={onExportSvg} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#151818] text-[#f2f2ef] font-medium text-[11px] rounded-lg hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04] shadow-sm" title="Export as SVG container">
                        <Download className="w-3 h-3 text-[#b8b59f]" /> SVG
                    </button>
                )}
            </div>
        </div>
    );
}
