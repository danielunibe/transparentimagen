import { memo } from 'react';
import { GalleryFolderItem } from '@/types/asteria';
import { getMaterialReadinessLabel } from '@/services/materialDiagnosticsService';

interface MaterialCardProps {
    folder: GalleryFolderItem;
    onView: (folderId: string) => void;
}

function MaterialCard({ folder, onView }: MaterialCardProps) {
    const material = folder.material;
    if (!material) return null;

    const maps = material.maps || [];
    const diagnostics = material.diagnostics;
    const completeness = diagnostics?.completeness;
    const baseMap = maps.find((map) => ['base_color', 'albedo', 'diffuse'].includes(map.mapType));
    const warningCount = material.diagnostics?.items.filter((item) => item.severity === 'warning').length || 0;
    const errorCount = material.diagnostics?.items.filter((item) => item.severity === 'error').length || 0;
    const readinessLabel = getMaterialReadinessLabel(material, material.targetEngine || 'generic');
    const dominantResolution = material.diagnostics?.resolution.dominantWidth && material.diagnostics?.resolution.dominantHeight
        ? `${material.diagnostics.resolution.dominantWidth}x${material.diagnostics.resolution.dominantHeight}`
        : 'Unknown';
    const missingMaps = completeness?.missingRequiredMaps || material.missingMaps || [];
    const presentRequiredMaps = completeness?.presentRequiredMaps || [];
    const statusLabel = readinessLabel === 'Ready'
        ? 'Ready'
        : material.needsReview
            ? 'Needs Review'
            : material.status === 'partial'
                ? 'Partial'
                : material.status === 'texture_set'
                    ? 'Texture Set'
                    : 'Partial';

    return (
        <div className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-4 flex flex-col gap-3 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
            <div className="h-28 rounded-xl bg-[radial-gradient(circle_at_top,#1b2020,transparent_60%),linear-gradient(135deg,#0f1111,#090a0a)] ring-1 ring-white/[0.04] flex items-end p-3">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#7f826f]">{statusLabel}</div>
                    <div className="text-sm font-semibold text-[#f2f2ef]">{material.materialName || folder.name}</div>
                    <div className="text-[11px] text-[#b8b59f]">{baseMap ? `Base map: ${baseMap.fileName}` : 'No base color preview'}</div>
                    <div className="text-[11px] text-[#7f826f] mt-1">{readinessLabel}</div>
                </div>
            </div>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-[#7f826f]">Score</div>
                    <div className="text-sm font-semibold text-[#f2f2ef]">{material.completenessScore ?? 0}</div>
                </div>
                <div>
                    <div className="text-xs text-[#7f826f]">Diagnostics</div>
                    <div className="text-sm font-semibold text-[#f2f2ef]">{warningCount}W / {errorCount}E</div>
                </div>
            </div>
            <div className="text-[11px] text-[#7f826f]">
                {missingMaps.length > 0 ? `Missing: ${missingMaps.join(', ')}` : 'No required maps missing.'}
            </div>
            <div className="text-[11px] text-[#7f826f]">
                {presentRequiredMaps.length > 0 ? `Required detected: ${presentRequiredMaps.join(', ')}` : 'No required maps confirmed yet.'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#b8b59f]">
                <span>{material.category || 'unknown'}</span>
                <span>{maps.length} maps</span>
                <span>{dominantResolution}</span>
            </div>
            {material.isFavorite ? <div className="text-[11px] text-[#fde400]">Favorite material</div> : null}
            <button onClick={() => onView(folder.id)} className="px-3 py-2 rounded-xl bg-[#fde400] text-[#121414] text-xs font-bold hover:brightness-110 transition-colors">
                View
            </button>
        </div>
    );
}

export const MemoizedMaterialCard = memo(MaterialCard);
