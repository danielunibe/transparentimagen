import { useMemo, useState } from 'react';
import { GalleryFolderItem, GalleryItem } from '@/types/asteria';
import { MemoizedMaterialCard as MaterialCard } from './MaterialCard';
import { MaterialInspectorPanel } from './MaterialInspectorPanel';

interface MaterialVaultViewProps {
    items: GalleryItem[];
}

export function MaterialVaultView({ items }: MaterialVaultViewProps) {
    const materialFolders = useMemo(
        () => items.filter((item): item is GalleryFolderItem => item.kind === 'folder' && !!item.material),
        [items]
    );
    const [activeFilter, setActiveFilter] = useState('all');
    const [sortMode, setSortMode] = useState('score');
    const [selectedId, setSelectedId] = useState<string | null>(materialFolders[0]?.id || null);
    const filteredFolders = useMemo(() => {
        let next = [...materialFolders];
        if (activeFilter === 'ready') next = next.filter((folder) => (folder.material?.completenessScore || 0) >= 90 && !folder.material?.needsReview);
        if (activeFilter === 'complete') next = next.filter((folder) => folder.material?.status === 'complete');
        if (activeFilter === 'partial') next = next.filter((folder) => folder.material?.status === 'partial');
        if (activeFilter === 'texture_set') next = next.filter((folder) => folder.material?.status === 'texture_set');
        if (activeFilter === 'review') next = next.filter((folder) => folder.material?.needsReview);
        if (activeFilter === 'warnings') next = next.filter((folder) => folder.material?.hasWarnings);
        if (activeFilter === 'errors') next = next.filter((folder) => folder.material?.hasErrors);
        if (activeFilter === 'favorites') next = next.filter((folder) => folder.material?.isFavorite);
        if (activeFilter.startsWith('category:')) next = next.filter((folder) => folder.material?.category === activeFilter.split(':')[1]);

        next.sort((a, b) => {
            if (sortMode === 'name') return a.name.localeCompare(b.name);
            if (sortMode === 'category') return String(a.material?.category || '').localeCompare(String(b.material?.category || ''));
            if (sortMode === 'status') return String(a.material?.status || '').localeCompare(String(b.material?.status || ''));
            if (sortMode === 'warnings') return (b.material?.diagnostics?.items.filter((item) => item.severity === 'warning').length || 0) - (a.material?.diagnostics?.items.filter((item) => item.severity === 'warning').length || 0);
            return (b.material?.completenessScore || 0) - (a.material?.completenessScore || 0);
        });
        return next;
    }, [activeFilter, materialFolders, sortMode]);
    const selectedFolder = filteredFolders.find((folder) => folder.id === selectedId) || filteredFolders[0] || null;

    const totals = useMemo(() => ({
        total: materialFolders.length,
        complete: materialFolders.filter((folder) => folder.material?.status === 'complete').length,
        partial: materialFolders.filter((folder) => folder.material?.status === 'partial').length,
        textureSet: materialFolders.filter((folder) => folder.material?.status === 'texture_set').length,
        favorites: materialFolders.filter((folder) => folder.material?.isFavorite).length,
    }), [materialFolders]);

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                {[
                    ['Total Materials', totals.total],
                    ['Complete', totals.complete],
                    ['Partial', totals.partial],
                    ['Texture Sets', totals.textureSet],
                    ['Favorites', totals.favorites],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-4">
                        <div className="text-xs text-[#7f826f]">{label}</div>
                        <div className="text-2xl font-semibold text-[#f2f2ef]">{value}</div>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {[
                    ['All', 'all'],
                    ['Ready', 'ready'],
                    ['Complete', 'complete'],
                    ['Partial', 'partial'],
                    ['Texture Sets', 'texture_set'],
                    ['Needs Review', 'review'],
                    ['With Warnings', 'warnings'],
                    ['With Errors', 'errors'],
                    ['Favorites', 'favorites'],
                    ['Wood', 'category:wood'],
                    ['Metal', 'category:metal'],
                    ['Stone', 'category:stone'],
                ].map(([label, value]) => (
                    <button
                        key={value}
                        onClick={() => setActiveFilter(value)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold ${activeFilter === value ? 'bg-[#fde400] text-[#121414]' : 'bg-[#101212] text-[#b8b59f] ring-1 ring-white/[0.05]'}`}
                    >
                        {label}
                    </button>
                ))}
                <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    className="ml-auto bg-[#101212] text-[#f2f2ef] ring-1 ring-white/[0.05] rounded-xl px-3 py-2 text-xs"
                >
                    <option value="score">Score</option>
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                    <option value="status">Status</option>
                    <option value="warnings">Warnings</option>
                </select>
            </div>

            {filteredFolders.length === 0 ? (
                <div className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-8 text-center text-[#7f826f]">
                    No PBR material folders detected yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
                    <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {filteredFolders.map((folder) => (
                            <MaterialCard key={folder.id} folder={folder} onView={setSelectedId} />
                        ))}
                    </div>
                    <MaterialInspectorPanel folder={selectedFolder} />
                </div>
            )}
        </div>
    );
}
