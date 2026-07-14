import { MaterialFolderMetadata } from '@/types/asteria';
import { buildMaterialRecommendations, getMaterialDiagnosticTone, getMaterialReadinessLabel } from '@/services/materialDiagnosticsService';

interface MaterialDiagnosticsPanelProps {
    material: MaterialFolderMetadata;
}

export function MaterialDiagnosticsPanel({ material }: MaterialDiagnosticsPanelProps) {
    const diagnostics = material.diagnostics;
    if (!diagnostics) {
        return <div className="text-xs text-[#7f826f]">Diagnostics will appear after material analysis.</div>;
    }

    const recommendations = buildMaterialRecommendations(material, diagnostics);
    const readinessLabel = getMaterialReadinessLabel(material, diagnostics.completeness.targetEngine);
    const presentRequired = diagnostics.completeness.presentRequiredMaps || [];
    const missingRequired = diagnostics.completeness.missingRequiredMaps || [];
    const presentOptional = diagnostics.completeness.presentOptionalMaps || [];
    const missingOptional = diagnostics.completeness.missingOptionalMaps || [];
    const diagnosticItems = diagnostics.items || [];

    return (
        <section className="rounded-2xl bg-[#0c0f0f] ring-1 ring-white/[0.04] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-[#7f826f]">Completeness score</div>
                    <div className="text-2xl font-semibold text-[#f2f2ef]">{diagnostics.completeness.score}</div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#151818] text-xs font-semibold text-[#f2f2ef]">
                    {readinessLabel}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                    <div className="text-[#7f826f] mb-1">Required present</div>
                    <div className="text-[#f2f2ef]">{presentRequired.join(', ') || 'None'}</div>
                </div>
                <div>
                    <div className="text-[#7f826f] mb-1">Required missing</div>
                    <div className="text-[#f2f2ef]">{missingRequired.join(', ') || 'None'}</div>
                </div>
                <div>
                    <div className="text-[#7f826f] mb-1">Optional present</div>
                    <div className="text-[#f2f2ef]">{presentOptional.join(', ') || 'None'}</div>
                </div>
                <div>
                    <div className="text-[#7f826f] mb-1">Optional missing</div>
                    <div className="text-[#f2f2ef]">{missingOptional.join(', ') || 'None'}</div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {diagnosticItems.length === 0 ? (
                    <div className="rounded-xl bg-[#101212] ring-1 ring-white/[0.04] p-3 text-xs text-[#7f826f]">
                        No warnings or errors were produced for this material.
                    </div>
                ) : diagnosticItems.map((item) => (
                    <div key={item.id} className="rounded-xl bg-[#101212] ring-1 ring-white/[0.04] p-3">
                        <div className={`text-xs font-semibold ${getMaterialDiagnosticTone(item)}`}>{item.title}</div>
                        <div className="text-xs text-[#b8b59f] mt-1">{item.message}</div>
                        {item.recommendation ? <div className="text-[11px] text-[#7f826f] mt-1">{item.recommendation}</div> : null}
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-1">
                <div className="text-xs font-semibold text-[#f2f2ef]">Recommendations</div>
                {recommendations.map((entry) => (
                    <div key={entry} className="text-xs text-[#b8b59f]">{entry}</div>
                ))}
            </div>
        </section>
    );
}
