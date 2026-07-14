import { Loader2, Sparkles } from 'lucide-react';

interface ProcessingOverlayProps {
    onCancel: () => void;
}

export function ProcessingOverlay({ onCancel }: ProcessingOverlayProps) {
    return (
        <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#fde400] animate-spin mb-4" />
            <span className="text-[#f2f2ef] font-medium text-sm tracking-wide mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#fde400]" /> Preparing local AI action...
            </span>
            <div className="w-48 h-1 bg-[#1d1e1e] rounded-full overflow-hidden mt-4">
                <div className="h-full bg-[#fde400] w-[60%] rounded-full animate-pulse"></div>
            </div>
            <button onClick={onCancel} className="mt-6 px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold text-[#b8b59f] border border-[#1c1c1c] rounded hover:bg-[#121313] hover:text-[#f2f2ef] transition-colors">
                Cancel
            </button>
        </div>
    );
}
