import { GalleryFolderItem } from '@/types/asteria';

interface SmartFolderCardProps {
    folder: GalleryFolderItem;
    onSelect: (folderId: string) => void;
}

export function SmartFolderCard({ folder, onSelect }: SmartFolderCardProps) {
    return (
        <div className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-4 flex flex-col gap-3">
            <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#7f826f]">{folder.smartFolder?.kind?.replace(/_/g, ' ')}</div>
                <h3 className="text-sm font-semibold text-[#f2f2ef]">{folder.name}</h3>
            </div>
            <div className="flex items-center justify-between text-xs">
                <span className="text-[#b8b59f]">Status: {folder.smartFolder?.status}</span>
                <span className="text-[#7f826f]">{folder.childAssetIds?.length || 0} items</span>
            </div>
            {folder.smartFolder?.warnings?.length ? (
                <div className="text-[11px] text-[#f59e0b]">{folder.smartFolder.warnings.join(' • ')}</div>
            ) : (
                <div className="text-[11px] text-[#7f826f]">{folder.smartFolder?.summary || 'No summary available yet.'}</div>
            )}
            <button onClick={() => onSelect(folder.id)} className="px-3 py-2 rounded-xl bg-[#151818] text-[#f2f2ef] text-xs font-semibold hover:bg-[#1a1d1d]">
                Inspect
            </button>
        </div>
    );
}
