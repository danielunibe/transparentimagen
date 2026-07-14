import { GalleryItem } from '@/types/asteria';
import { FolderOpen } from 'lucide-react';

interface InspectorPreviewProps {
    item: GalleryItem;
}

export function InspectorPreview({ item }: InspectorPreviewProps) {
    if (item.kind === 'folder') {
        return (
            <div className="w-full aspect-[4/3] bg-[#0a0b0b] rounded-xl flex items-center justify-center ring-1 ring-white/[0.04] overflow-hidden p-1">
                 {item.previewUrls && item.previewUrls.length > 0 ? (
                    <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                        {Array.from({ length: 4 }).map((_, idx) => {
                            const url = item.previewUrls[idx];
                            return (
                                <div key={idx} className="relative w-full h-full bg-[#101212] overflow-hidden rounded-[8px] flex items-center justify-center">
                                    {url ? (
                                        <img
                                            src={url} 
                                            alt="folder preview" 
                                            className="absolute inset-0 h-full w-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#101212]" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <FolderOpen className="w-10 h-10 text-[#7f826f]/60" strokeWidth={1.5} />
                )}
            </div>
        );
    }

    return (
        <div className="w-full aspect-[4/3] bg-[#0a0b0b] rounded-xl flex items-center justify-center ring-1 ring-white/[0.04] overflow-hidden relative">
            {item.objectUrl ? (
                <img
                    src={item.objectUrl}
                    alt={item.name}
                    className="absolute inset-0 h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div className="w-8 h-8 rounded-full border border-white/[0.1] border-t-white/[0.4] animate-spin" />
            )}
        </div>
    );
}
