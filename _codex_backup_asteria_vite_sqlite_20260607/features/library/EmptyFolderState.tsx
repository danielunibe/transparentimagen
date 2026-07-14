import { FolderSearch, FolderOpen } from 'lucide-react';

interface EmptyFolderStateProps {
    onBack?: () => void;
    onAddFolder: () => void;
    onRescan: () => void;
}

export function EmptyFolderState({ onBack, onAddFolder, onRescan }: EmptyFolderStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] shadow-sm flex items-center justify-center mb-6 text-[#7f826f]">
                <FolderSearch className="w-8 h-8" />
            </div>
            
            <h3 className="text-[#f2f2ef] font-semibold text-xl mb-2 tracking-tight">No images in this folder</h3>
            <p className="text-[#b8b59f] text-[13px] max-w-[360px] mx-auto mb-8 leading-relaxed">
                Choose another folder or add supported image files to this location.
            </p>
            
            <div className="flex items-center gap-3">
                {onBack && (
                    <button onClick={onBack} className="px-5 py-2.5 bg-[#151818] text-[#f2f2ef] font-semibold text-xs rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                        Go Back
                    </button>
                )}
                <button onClick={onAddFolder} className="px-5 py-2.5 bg-[#fde400] text-[#121414] font-bold text-xs rounded-xl hover:brightness-110 transition-colors shadow-sm flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" /> Add Folder
                </button>
                <button onClick={onRescan} className="px-5 py-2.5 bg-[#151818] text-[#f2f2ef] font-semibold text-xs rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                    Rescan
                </button>
            </div>
        </div>
    );
}
