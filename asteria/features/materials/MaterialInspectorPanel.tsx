import { GalleryFolderItem, MaterialCategory, MaterialTargetEngine, PbrMapType } from '@/types/asteria';
import { MaterialMapList } from './MaterialMapList';
import { MaterialPreviewPlaceholder } from './MaterialPreviewPlaceholder';
import { createMaterialManifest, markMaterialFavorite, overrideMaterialMapType, resetMaterialMapOverride, updateMaterialCategory, updateMaterialMetadata, updateMaterialTargetEngine } from '@/services/materialLibraryService';
import { MaterialDiagnosticsPanel } from './MaterialDiagnosticsPanel';
import { createMaterialDiagnosticReport, downloadMaterialDiagnosticReport } from '@/services/materialDiagnosticReportService';
import { createManifestBlob } from '@/services/packageExportService';
import { downloadBlob } from '@/services/exportService';
import { getMaterialOverrideCount } from '@/services/materialDiagnosticsService';

interface MaterialInspectorPanelProps {
    folder: GalleryFolderItem | null;
}

const CATEGORY_OPTIONS: MaterialCategory[] = ['wood', 'metal', 'stone', 'fabric', 'plastic', 'organic', 'ground', 'wall', 'ceramic', 'glass', 'tile', 'skin', 'other', 'unknown'];
const TARGET_OPTIONS: MaterialTargetEngine[] = ['generic', 'blender', 'unreal', 'unity'];

export function MaterialInspectorPanel({ folder }: MaterialInspectorPanelProps) {
    if (!folder?.material) {
        return (
            <aside className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-5 text-sm text-[#7f826f]">
                Select a material folder to inspect it.
            </aside>
        );
    }

    const material = folder.material;
    const manifest = createMaterialManifest(material);
    const diagnosticReport = createMaterialDiagnosticReport(material);
    const downloadManifest = () => {
        const blob = createManifestBlob({
            id: `material-manifest_${material.folderAssetId}`,
            label: material.materialName || folder.name,
            createdAt: new Date().toISOString(),
            appName: 'Asteria',
            format: 'folder_manifest',
            itemCount: 1,
            completedCount: 1,
            failedCount: 0,
            items: [{
                id: `material-item_${material.folderAssetId}`,
                assetId: material.folderAssetId,
                assetName: material.materialName || folder.name,
                exportFormat: 'png',
                sourceMode: 'original',
                outputFilename: `${(material.materialName || folder.name).replace(/[^\w.-]+/g, '_').toLowerCase() || 'material'}.json`,
                status: 'completed',
                smartFolderKind: 'pbr_material_folder',
                materialName: manifest.materialName,
                materialStatus: manifest.status,
                maps: manifest.maps,
                missingMaps: manifest.missingMaps,
                category: manifest.category,
                favorite: manifest.favorite,
                materialDiagnostics: manifest.materialDiagnostics,
            }],
        });
        downloadBlob(blob, `${(material.materialName || folder.name).replace(/[^\w.-]+/g, '_').toLowerCase() || 'material'}_manifest.json`);
    };

    return (
        <aside className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.05] p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-lg font-semibold text-[#f2f2ef]">{material.materialName || folder.name}</h3>
                <p className="text-xs text-[#7f826f]">{folder.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <div className="text-[#7f826f]">Status</div>
                    <div className="text-[#f2f2ef] font-semibold">{material.status}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Favorite</div>
                    <div className="text-[#f2f2ef] font-semibold">{material.isFavorite ? 'Yes' : 'No'}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Category</div>
                    <div className="text-[#f2f2ef] font-semibold">{material.category || 'Uncategorized'}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Missing maps</div>
                    <div className="text-[#f2f2ef] font-semibold">{material.missingMaps?.length || 0}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Target engine</div>
                    <div className="text-[#f2f2ef] font-semibold">{material.targetEngine || 'generic'}</div>
                </div>
                <div>
                    <div className="text-[#7f826f]">Overrides</div>
                    <div className="text-[#f2f2ef] font-semibold">{getMaterialOverrideCount(material)}</div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-[#7f826f] flex flex-col gap-1">
                    Category
                    <select
                        value={material.category || 'unknown'}
                        onChange={(e) => updateMaterialCategory(material.folderAssetId, e.target.value as MaterialCategory)}
                        className="bg-[#0c0f0f] rounded-xl ring-1 ring-white/[0.04] px-3 py-2 text-[#f2f2ef]"
                    >
                        {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                </label>
                <label className="text-xs text-[#7f826f] flex flex-col gap-1">
                    Target Engine
                    <select
                        value={material.targetEngine || 'generic'}
                        onChange={(e) => updateMaterialTargetEngine(material.folderAssetId, e.target.value as MaterialTargetEngine)}
                        className="bg-[#0c0f0f] rounded-xl ring-1 ring-white/[0.04] px-3 py-2 text-[#f2f2ef]"
                    >
                        {TARGET_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                </label>
            </div>
            <button
                onClick={() => markMaterialFavorite(material.folderAssetId)}
                className="px-3 py-2 rounded-xl bg-[#151818] text-[#f2f2ef] text-xs font-semibold hover:bg-[#1a1d1d]"
            >
                {material.isFavorite ? 'Unfavorite' : 'Mark Favorite'}
            </button>
            <label className="text-xs text-[#7f826f] flex flex-col gap-1">
                Notes
                <textarea
                    defaultValue={material.notes || ''}
                    onBlur={(e) => updateMaterialMetadata(material.folderAssetId, { notes: e.target.value })}
                    className="min-h-[84px] bg-[#0c0f0f] rounded-xl ring-1 ring-white/[0.04] px-3 py-2 text-[#f2f2ef]"
                />
            </label>
            <MaterialDiagnosticsPanel material={material} />
            <MaterialMapList
                maps={material.maps || []}
                onOverrideMapType={(mapId: string, mapType: PbrMapType) => overrideMaterialMapType(material.folderAssetId, mapId, mapType)}
                onResetOverride={(mapId: string) => resetMaterialMapOverride(material.folderAssetId, mapId)}
            />
            <MaterialPreviewPlaceholder material={material} />
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={downloadManifest}
                    className="px-3 py-2 rounded-xl bg-[#151818] text-[#f2f2ef] text-xs font-semibold hover:bg-[#1a1d1d]"
                >
                    Download Manifest JSON
                </button>
                <button
                    onClick={() => downloadMaterialDiagnosticReport(material)}
                    className="px-3 py-2 rounded-xl bg-[#fde400] text-[#121414] text-xs font-semibold hover:brightness-110"
                >
                    Download Diagnostic Report
                </button>
            </div>
            <div className="rounded-xl bg-[#0c0f0f] ring-1 ring-white/[0.04] p-3">
                <div className="text-xs font-semibold text-[#f2f2ef] mb-2">Export manifest metadata-only</div>
                <pre className="text-[10px] text-[#b8b59f] overflow-auto whitespace-pre-wrap">{JSON.stringify(manifest, null, 2)}</pre>
            </div>
            <div className="rounded-xl bg-[#0c0f0f] ring-1 ring-white/[0.04] p-3">
                <div className="text-xs font-semibold text-[#f2f2ef] mb-2">Diagnostic report metadata-only</div>
                <pre className="text-[10px] text-[#b8b59f] overflow-auto whitespace-pre-wrap">{JSON.stringify(diagnosticReport, null, 2)}</pre>
            </div>
        </aside>
    );
}
