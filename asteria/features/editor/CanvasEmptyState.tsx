import { FolderOpen, Image as ImageIcon } from 'lucide-react';

interface CanvasEmptyStateProps {
    onOpen: () => void;
}

export function CanvasEmptyState({ onOpen }: CanvasEmptyStateProps) {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020202]">
            <div className="w-16 h-16 rounded-2xl bg-[#0a0b0b] border border-[#1d1e1e] flex items-center justify-center mb-6 text-[#b8b59f]">
                <ImageIcon className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-[#f2f2ef] font-semibold text-xl mb-3 tracking-wide">Open an image to start</h3>
            <p className="text-[#7f826f] text-[13px] max-w-sm text-center mb-8">Enhance, remove background, upscale and export transparent PNG locally.</p>
            <button onClick={onOpen} className="flex items-center gap-2 px-6 py-2.5 bg-[#fde400] text-[#121414] font-bold text-xs rounded-lg uppercase tracking-widest hover:brightness-110 transition-colors shadow-[0_0_15px_rgba(253,228,0,0.2)]">
                <FolderOpen className="w-4 h-4" /> Open Image
            </button>
        </div>
    );
}
