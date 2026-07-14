import { memo } from 'react';
import { FolderOpen } from 'lucide-react';
import { GalleryFolderItem } from '@/types/asteria';

interface FolderTileProps {
    folder: GalleryFolderItem;
    isSelected?: boolean;
    onSelect?: (e: React.MouseEvent) => void;
    onOpen?: () => void;
    onRescan?: () => void;
}

function FolderTile({ folder, isSelected, onSelect, onOpen, onRescan }: FolderTileProps) {
    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(e);
            }}
            onDoubleClick={onOpen}
            className={`group relative overflow-hidden rounded-2xl cursor-pointer ring-1 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.28)] flex flex-col p-3 ${
                isSelected
                    ? "bg-[#161919] ring-[#fde400]/40 shadow-[0_4px_16px_rgba(253,228,0,0.06)]"
                    : "bg-[#101212] ring-white/[0.035] hover:ring-white/[0.06] hover:bg-[#151818] shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
            }`}
            style={{ aspectRatio: '4/3' }}
        >
            <div className={`w-full flex-1 flex items-center justify-center relative rounded-xl overflow-hidden bg-[#0c0f0f] ring-1 transition-colors ${isSelected ? 'ring-white/[0.08]' : 'ring-white/[0.04]'}`}>
                {folder.previewUrls && folder.previewUrls.length > 0 ? (
                    <div className="grid grid-cols-2 gap-0.5 w-full h-full p-0.5">
                        {Array.from({ length: 4 }).map((_, idx) => {
                            const url = folder.previewUrls![idx];
                            return (
                                <div key={idx} className="relative w-full h-full bg-[#0a0b0b] overflow-hidden rounded-[8px] flex items-center justify-center">
                                    {url ? (
                                        <img 
                                            src={url} 
                                            alt="folder preview" 
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#101212]" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <FolderOpen className="w-10 h-10 text-[#7f826f]/60 group-hover:text-[#b8b59f] transition-colors" strokeWidth={1.5} />
                )}
                
                {/* Folder Hover Actions Overlay */}
                <div className="absolute inset-0 bg-[#0a0b0b]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-4 z-10 backdrop-blur-md">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onOpen) onOpen();
                        }} 
                        className="w-full py-2 bg-[#fde400] hover:brightness-110 text-[#121414] rounded-lg font-bold text-[11px] transition-all shadow-md"
                    >
                        Open Folder
                    </button>
                    {onRescan && (
                        <div className="flex gap-1.5 w-full">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRescan();
                                }}
                                className="flex-1 py-1.5 bg-[#151818] hover:bg-[#1a1c1c] text-[#f2f2ef] rounded-lg font-bold text-[11px] transition-all text-center ring-1 ring-white/[0.05] hover:ring-white/[0.1] shadow-xl"
                            >
                                Rescan
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-3 text-left px-2">
                <span className={`block font-medium text-[13px] truncate transition-colors ${isSelected ? "text-[#fde400]" : "text-[#f2f2ef]"}`}>
                    {folder.name}
                </span>
                <span className="block text-[#7f826f] text-[10px] font-medium tracking-wide mt-0.5">{folder.imageCount} photos{folder.videoCount ? ` · ${folder.videoCount} videos` : ''}</span>
                {(folder.smartFolderKind || folder.material) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {folder.smartFolderKind && (
                            <span className="px-2 py-0.5 rounded-md bg-[#151818] ring-1 ring-white/[0.04] text-[9px] font-medium text-[#78d7ff] tracking-wide">
                                {folder.smartFolderKind.replace(/_/g, ' ')}
                            </span>
                        )}
                        {folder.material && (
                            <span className="px-2 py-0.5 rounded-md bg-[#151818] ring-1 ring-white/[0.04] text-[9px] font-medium text-[#f59e0b] tracking-wide">
                                {folder.material.status}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export const MemoizedFolderTile = memo(FolderTile);
