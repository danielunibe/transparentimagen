import { X } from 'lucide-react';

interface InspectorHeaderProps {
    onClose: () => void;
}

export function InspectorHeader({ onClose }: InspectorHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0 bg-[#121414]/50">
            <h3 className="text-[#f2f2ef] font-medium text-[13px] flex items-center gap-2">
                Inspector
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1d1e1e] ring-1 ring-white/[0.06] text-[#b8b59f]">Selected</span>
            </h3>
            <button 
                onClick={onClose}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#7f826f] hover:text-[#f2f2ef] hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors"
                title="Close Inspector"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
