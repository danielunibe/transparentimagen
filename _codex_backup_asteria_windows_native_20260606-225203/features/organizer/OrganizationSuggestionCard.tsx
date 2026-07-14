import { OrganizationSuggestion } from '@/services/mediaOrganizationService';

interface OrganizationSuggestionCardProps {
    suggestion: OrganizationSuggestion;
    onApplyFilter?: (assetIds: string[]) => void;
}

export function OrganizationSuggestionCard({ suggestion, onApplyFilter }: OrganizationSuggestionCardProps) {
    return (
        <div className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.04] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] flex flex-col gap-3">
            <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#7f826f] font-bold">{suggestion.type.replace(/_/g, ' ')}</div>
                <h3 className="text-[#f2f2ef] text-[15px] font-semibold mt-1">{suggestion.label}</h3>
                <p className="text-[#9ca099] text-[12px] mt-1 leading-relaxed">{suggestion.description}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#4de082] font-semibold">{suggestion.assetIds.length} assets</span>
                <button
                    onClick={() => onApplyFilter?.(suggestion.assetIds)}
                    className="px-3 py-1.5 rounded-xl bg-[#151818] text-[#f2f2ef] text-[11px] font-semibold hover:bg-[#1a1c1c] transition-colors"
                >
                    Apply Filter
                </button>
            </div>
        </div>
    );
}
