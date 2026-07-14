import { FolderOpen } from 'lucide-react';

interface EmptyLibraryStateProps {
    onAddFolder: () => void;
}

export function EmptyLibraryState({ onAddFolder }: EmptyLibraryStateProps) {
    return (
        <div className="h-full flex flex-col items-center justify-center -mt-10 min-w-[360px] max-w-[560px] mx-auto text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] shadow-sm flex items-center justify-center mb-6 text-[#7f826f] flex-shrink-0">
                <FolderOpen className="w-10 h-10 relative z-10" />
            </div>
            
            <h3 className="text-[#f2f2ef] font-semibold text-2xl mb-2 tracking-tight">Add a folder to begin</h3>
            <p className="text-[#b8b59f] text-[14px] max-w-[460px] mx-auto mb-8 leading-relaxed">
                Browse your images visually, explore folders, and edit assets with local AI.
            </p>
            
            <button onClick={onAddFolder} className="px-6 py-3 bg-[#fde400] text-[#121414] font-bold text-sm rounded-xl hover:brightness-110 transition-colors shadow-sm flex items-center gap-2 mb-3">
                <FolderOpen className="w-4.5 h-4.5" /> Add Folder
            </button>
            <p className="text-[#7f826f] text-xs font-medium">Local-first. No cloud upload required.</p>

            <div className="flex items-center gap-2 mt-8">
                <span className="px-3 py-1.5 rounded-full bg-white/[0.03] text-[11px] font-medium text-[#7f826f]">Browse folders</span>
                <span className="px-3 py-1.5 rounded-full bg-white/[0.03] text-[11px] font-medium text-[#7f826f]">Edit with AI</span>
                <span className="px-3 py-1.5 rounded-full bg-white/[0.03] text-[11px] font-medium text-[#7f826f]">Export PNG / SVG</span>
            </div>
        </div>
    );
}
