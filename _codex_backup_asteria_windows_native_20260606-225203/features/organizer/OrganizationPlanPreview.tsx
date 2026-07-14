import { OrganizationPlan } from '@/services/fileOrganizationService';

interface OrganizationPlanPreviewProps {
    plan: OrganizationPlan | null;
    onExecute?: () => void;
}

export function OrganizationPlanPreview({ plan, onExecute }: OrganizationPlanPreviewProps) {
    if (!plan) return null;

    return (
        <section className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.04] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] flex flex-col gap-4">
            <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#7f826f] font-bold">Organization Plan</div>
                <h3 className="text-[#f2f2ef] text-[16px] font-semibold mt-1">{plan.strategy}</h3>
                <p className="text-[#9ca099] text-[12px] mt-1">Preview only. No files are moved in this phase without a future desktop-safe confirmation flow.</p>
            </div>

            <div className="rounded-xl bg-black/20 p-3 text-[12px] text-[#b8b59f]">
                <div>{plan.items.length} files would be {plan.operation}d.</div>
                {plan.warnings.map((warning, index) => (
                    <div key={index} className="text-[#f59e0b] mt-1">{warning}</div>
                ))}
            </div>

            <div className="max-h-48 overflow-y-auto no-scrollbar flex flex-col gap-2">
                {plan.items.slice(0, 12).map(item => (
                    <div key={`${item.assetId}_${item.targetFolder}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#0d0f0f] px-3 py-2">
                        <div className="min-w-0">
                            <div className="text-[#f2f2ef] text-[12px] font-medium truncate">{item.assetName}</div>
                            <div className="text-[#7f826f] text-[10px] truncate">{item.targetFolder}</div>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-[#4de082]">{item.operation}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={onExecute}
                disabled={!plan.canExecute}
                className="px-3 py-2 rounded-xl bg-[#151818] text-[#7f826f] text-[12px] font-semibold cursor-not-allowed"
            >
                Confirm disabled in this phase
            </button>
        </section>
    );
}
