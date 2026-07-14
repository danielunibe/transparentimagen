import { GalleryItem } from '@/types/asteria';

interface InspectorBadgesProps {
    item: GalleryItem;
}

export function InspectorBadges({ item }: InspectorBadgesProps) {
    if (item.kind === 'folder') return null;
    
    if (!item.badges || item.badges.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 mt-4">
            {item.badges.map(badge => (
                <span key={badge} className="px-2 py-0.5 rounded-md bg-[#1d1e1e] ring-1 ring-white/[0.06] text-[10px] text-[#f2f2ef] font-mono tracking-wide">
                    {badge}
                </span>
            ))}
        </div>
    );
}
