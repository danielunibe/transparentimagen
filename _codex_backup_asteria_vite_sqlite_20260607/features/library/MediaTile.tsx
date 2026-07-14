import { memo } from 'react';
import { Play, Image as ImageIcon } from 'lucide-react';
import { GalleryImageItem, GalleryVideoItem } from '@/types/asteria';

interface MediaTileProps {
    item: GalleryImageItem | GalleryVideoItem;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onOpen: () => void;
    thumbnailUrl?: string;
    isThumbnailLoading?: boolean;
}

function MediaTile({ item, isSelected, onSelect, onOpen, thumbnailUrl, isThumbnailLoading }: MediaTileProps) {
    const isVideo = item.kind === 'video';
    const src = item.kind === 'image' ? (thumbnailUrl || item.objectUrl) : undefined;

    return (
        <div
            onClick={(e) => onSelect(e)}
            onDoubleClick={onOpen}
            className={`group relative overflow-hidden bg-[#0c0f0f] rounded-2xl cursor-pointer ${isSelected ? 'ring-2 ring-[#fde400] shadow-[0_0_15px_rgba(253,228,0,0.15)]' : 'ring-1 ring-white/[0.04]'} transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.28)]`}
            style={{ aspectRatio: '4/3' }}
        >
            {src ? (
                <img
                    src={src}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out ${isThumbnailLoading ? 'opacity-50 blur-sm' : 'opacity-100'}`}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(circle_at_top,#1b1d1d,transparent_60%),linear-gradient(135deg,#0f1111,#090a0a)]">
                    {isVideo ? <Play className="w-12 h-12 text-[#fde400]" /> : <ImageIcon className="w-10 h-10 text-[#7f826f]" />}
                </div>
            )}

            {isVideo && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 text-[#f2f2ef] text-[9px] font-bold tracking-widest">
                    VIDEO
                </div>
            )}
            {item.kind === 'image' && item.pbrMapType && item.pbrMapType !== 'unknown' && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 text-[#fde400] text-[9px] font-bold tracking-widest">
                    {item.pbrMapType.replace(/_/g, ' ')}
                </div>
            )}

            {isSelected && (
                <div className="absolute top-3 left-3 w-5 h-5 bg-[#fde400] rounded-md flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3)] z-20">
                    <div className="w-2 h-2 rounded-sm border-b-2 border-r-2 border-[#121414] transform rotate-45 -mt-0.5"></div>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#0a0b0b]/95 via-[#0a0b0b]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 mb-3 pointer-events-auto">
                    <span className="text-[#f2f2ef] font-semibold text-[13px] truncate drop-shadow-md block mb-1.5">{item.name}</span>
                    <div className="flex flex-wrap gap-1.5">
                        {item.badges.slice(0, 3).map(badge => (
                            <span key={badge} className="px-2 py-0.5 rounded-md bg-[#151818]/80 ring-1 ring-white/[0.04] text-[9px] font-medium text-[#b8b59f] tracking-wide backdrop-blur-md">
                                {badge}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex-1 py-1.5 bg-[#fde400] text-[#121414] rounded-lg font-bold text-[11px] hover:brightness-110 text-center shadow-lg transition-all">
                        {isVideo ? 'Inspect' : 'Edit'}
                    </button>
                    <button className="flex-1 py-1.5 bg-[#151818]/90 text-[#f2f2ef] rounded-lg font-bold text-[11px] hover:bg-[#1a1c1c] text-center shadow-lg ring-1 ring-transparent hover:ring-white/[0.04] backdrop-blur-md transition-all">
                        {isVideo ? 'Organize' : 'Enhance'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export { MediaTile };
export const MemoizedMediaTile = memo(MediaTile);
