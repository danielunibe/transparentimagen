import { Settings, Download, ChevronLeft } from 'lucide-react';
import { ActiveModeId, GalleryImageItem, AssetVariant, ExportRecipe, GalleryItem } from '@/types/asteria';
import { MODES } from '@/data/modes';
import { useAssetActions } from '@/hooks/useAssetActions';
import { getFileExtension, getAspectRatio } from '@/services/metadataService';

export interface EditorTopBarProps {
    activeMode: ActiveModeId | string;
    selectedItem: GalleryImageItem | null;
    onBack: () => void;
    isProcessing: boolean;
    activeVariant?: AssetVariant | null;
    registerVariant?: (variant: AssetVariant) => void;
    queueExportJob?: (item: GalleryItem, recipe: ExportRecipe, activeVariant?: AssetVariant) => Promise<any>;
}

export function EditorTopBar({ activeMode, selectedItem, onBack, isProcessing, activeVariant, registerVariant, queueExportJob }: EditorTopBarProps) {
    const mode = MODES[activeMode as ActiveModeId];
    const ActiveIcon = mode?.icon;
    
    const { saveSelectedAsPng, exportSelectedAsSvg } = useAssetActions({ selectedItem, activeVariant, registerVariant, queueExportJob });

    const extension = selectedItem ? (selectedItem.metadata?.extension || getFileExtension(selectedItem.name) || 'IMAGE') : null;
    const formatLabel = extension ? extension.toUpperCase() : null;
    const width = selectedItem?.metadata?.width;
    const height = selectedItem?.metadata?.height;
    const dimensionsStr = width && height ? `${width} × ${height}` : null;

    return (
        <header className="h-[52px] flex items-center justify-between px-6 border-b border-[#161717] shrink-0 z-10 bg-[#040404]">
            <div className="flex items-center gap-3">
                <button 
                    onClick={onBack}
                    className="flex items-center justify-center p-1.5 -ml-2 rounded-lg text-[#7f826f] hover:text-[#f2f2ef] hover:bg-[#121313] transition-colors"
                    title="Back to Folder"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-[13px] font-bold tracking-wide text-[#f2f2ef] flex items-center gap-2 relative group cursor-pointer">
                    {ActiveIcon && <ActiveIcon className="w-4 h-4 text-[#b8b59f]" />} {mode?.label}
                    {selectedItem && (
                        <div className="hidden md:flex ml-3 items-center gap-1.5 border border-white/[0.04] bg-white/[0.02] rounded-md px-2 py-0.5">
                            <span className="text-[10px] text-[#b8b59f] font-mono truncate max-w-[150px]" title={selectedItem.name}>
                                {selectedItem.name}
                            </span>
                            {formatLabel && (
                                <span className="text-[8px] font-bold px-1 py-0.5 bg-black/40 rounded text-[#7f826f]">
                                    {formatLabel}
                                </span>
                            )}
                            {dimensionsStr && (
                                <span className="text-[9px] text-[#7f826f] font-mono ml-1">
                                    {dimensionsStr}
                                </span>
                            )}
                        </div>
                    )}
                </h1>
                <div className="hidden sm:block h-3 w-px bg-[#1d1e1e] ml-2"></div>
                <span className="hidden sm:block text-[11px] text-[#7f826f]">{mode?.description}</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-2">
                    {isProcessing ? (
                         <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1c1c] rounded-md border border-[#303333] text-[9px] uppercase font-mono tracking-widest text-[#fde400]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#fde400] animate-pulse"></div>
                            Processing...
                        </div>
                    ) : activeVariant && activeVariant.kind !== 'original' ? (
                         <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-[#0a0b0b] rounded-md border border-[#1d1e1e] text-[9px] uppercase font-mono tracking-widest ${activeVariant.status === 'placeholder' ? 'text-[#7f826f]' : 'text-[#fde400]'}`} title={activeVariant.note || "Variant"}>
                            <div className={`w-1.5 h-1.5 rounded-full ${activeVariant.status === 'placeholder' ? 'bg-[#7f826f]' : 'bg-[#fde400]'}`}></div>
                            {activeVariant.label}
                            {activeVariant.sessionOnly && <span className="ml-1 text-[8px] bg-[#fde400]/20 px-1 py-0.5 rounded text-[#fde400]">Session</span>}
                            {activeVariant.metadataOnly && <span className="ml-1 text-[8px] bg-[#7f826f]/20 px-1 py-0.5 rounded text-[#7f826f]">Metadata</span>}
                        </div>
                    ) : (
                         <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0a0b0b] rounded-md border border-[#1d1e1e] text-[9px] uppercase font-mono tracking-widest text-[#4de082]" title="Original asset">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#4de082]"></div>
                            Original
                        </div>
                    )}
                </div>
                <button className="px-3 py-1.5 bg-[#0a0b0b] border border-[#1d1e1e] text-[#f2f2ef] text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-[#121313] transition-colors flex items-center gap-1.5 shadow-sm">
                    <Settings className="w-3 h-3" /> Settings
                </button>
                <div className="flex bg-[#0a0b0b] border border-[#1d1e1e] rounded-lg shadow-sm overflow-hidden">
                    <button 
                        onClick={saveSelectedAsPng}
                        className="px-3 py-1.5 text-[#f2f2ef] text-[10px] font-bold uppercase tracking-widest hover:bg-[#121313] transition-colors flex items-center gap-1.5 border-r border-[#1d1e1e]"
                    >
                        <Download className="w-3 h-3 text-[#b8b59f]" /> Save PNG
                    </button>
                    <button 
                        onClick={exportSelectedAsSvg}
                        className="px-3 py-1.5 text-[#f2f2ef] text-[10px] font-bold uppercase tracking-widest hover:bg-[#121313] transition-colors flex items-center"
                        title="Export as SVG container"
                    >
                        SVG
                    </button>
                </div>
            </div>
        </header>
    );
}
