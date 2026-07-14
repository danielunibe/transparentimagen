import { GalleryFolderItem } from '@/types/asteria';

interface SmartFolderInspectorProps {
    folder: GalleryFolderItem | null;
}

export function SmartFolderInspector({ folder }: SmartFolderInspectorProps) {
    if (!folder?.smartFolder) {
        return (
            <aside className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-5 text-sm text-[#7f826f]">
                Select a smart folder to inspect it.
            </aside>
        );
    }

    return (
        <aside className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-lg font-semibold text-[#f2f2ef]">{folder.name}</h3>
                <p className="text-xs text-[#7f826f]">{folder.smartFolder.kind.replace(/_/g, ' ')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <div className="text-[#7f826f]">Status</div>
                    <div className="text-[#f2f2ef] font-semibold">{folder.smartFolder.status}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Confidence</div>
                    <div className="text-[#f2f2ef] font-semibold">{folder.smartFolder.confidence}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Child count</div>
                    <div className="text-[#f2f2ef] font-semibold">{folder.smartFolder.childAssetIds.length}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Material folder</div>
                    <div className="text-[#f2f2ef] font-semibold">{folder.isMaterialFolder ? 'Yes' : 'No'}</div>
                </div>
            </div>
            {folder.smartFolder.warnings?.length ? (
                <div className="rounded-xl bg-[#0c0f0f] ring-1 ring-white/[0.04] p-3 text-xs text-[#f59e0b]">
                    {folder.smartFolder.warnings.join(' • ')}
                </div>
            ) : null}
        </aside>
    );
}
