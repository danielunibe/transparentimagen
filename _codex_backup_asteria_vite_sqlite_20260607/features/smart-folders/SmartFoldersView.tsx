import { useMemo, useState } from 'react';
import { GalleryFolderItem, GalleryItem, SmartFolderKind } from '@/types/asteria';
import { SmartFolderCard } from './SmartFolderCard';
import { SmartFolderInspector } from './SmartFolderInspector';

const FILTERS: Array<{ label: string; value: SmartFolderKind | 'all' | 'needs_review' }> = [
    { label: 'All', value: 'all' },
    { label: 'Photos', value: 'photo_folder' },
    { label: 'Videos', value: 'video_folder' },
    { label: 'PBR', value: 'pbr_material_folder' },
    { label: 'Texture Sets', value: 'texture_set_folder' },
    { label: 'Needs Review', value: 'needs_review' },
];

interface SmartFoldersViewProps {
    items: GalleryItem[];
}

export function SmartFoldersView({ items }: SmartFoldersViewProps) {
    const smartFolders = useMemo(
        () => items.filter((item): item is GalleryFolderItem => item.kind === 'folder' && !!item.smartFolder),
        [items]
    );
    const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]['value']>('all');
    const [selectedId, setSelectedId] = useState<string | null>(smartFolders[0]?.id || null);

    const filteredFolders = smartFolders.filter((folder) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'needs_review') return folder.smartFolder?.status === 'needs_review';
        return folder.smartFolder?.kind === activeFilter;
    });
    const selectedFolder = filteredFolders.find((folder) => folder.id === selectedId) || filteredFolders[0] || null;

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setActiveFilter(filter.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            activeFilter === filter.value
                                ? 'bg-[#fde400] text-[#121414]'
                                : 'bg-[#101212] text-[#b8b59f] ring-1 ring-white/[0.05] hover:text-[#f2f2ef]'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
                <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {filteredFolders.length > 0 ? filteredFolders.map((folder) => (
                        <SmartFolderCard key={folder.id} folder={folder} onSelect={setSelectedId} />
                    )) : (
                        <div className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-8 text-center text-[#7f826f] md:col-span-2 2xl:col-span-3">
                            No smart folders match this filter yet.
                        </div>
                    )}
                </div>
                <SmartFolderInspector folder={selectedFolder} />
            </div>
        </div>
    );
}
