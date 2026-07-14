import { SearchX } from 'lucide-react';

interface SearchEmptyStateProps {
    onClear: () => void;
}

export function SearchEmptyState({ onClear }: SearchEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
            <SearchX className="w-10 h-10 text-[#7f826f] mb-4" />
            <h3 className="text-[#f2f2ef] font-semibold text-[15px] mb-2 tracking-tight">No matches found</h3>
            <p className="text-[#b8b59f] text-[13px] mb-6">Try adjusting your filters or use advanced queries.</p>
            
            <div className="flex gap-2 items-center mb-6 text-[11px] text-[#7f826f]">
                <span className="px-2 py-1 bg-[#1a1c1c] rounded-md">type:png</span>
                <span className="px-2 py-1 bg-[#1a1c1c] rounded-md">edited:true</span>
                <span className="px-2 py-1 bg-[#1a1c1c] rounded-md">width&gt;1000</span>
                <span className="px-2 py-1 bg-[#1a1c1c] rounded-md">variant:adjustment</span>
            </div>

            <button onClick={onClear} className="px-5 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-xs rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-white/[0.04]">
                Clear Search
            </button>
        </div>
    );
}

