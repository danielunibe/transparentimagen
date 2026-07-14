import { MaterialFolderMetadata } from '@/types/asteria';
import { buildMaterialDiagnostics, buildMaterialRecommendations } from './materialDiagnosticsService';
import { downloadBlob } from './exportService';

export function createMaterialDiagnosticReport(material: MaterialFolderMetadata) {
  const diagnostics = material.diagnostics || buildMaterialDiagnostics(material, { targetEngine: material.targetEngine || 'generic' });
  return {
    id: `material-diagnostic-report_${material.folderAssetId}`,
    materialName: material.materialName || material.folderName,
    folderName: material.folderName,
    status: material.status,
    category: material.category,
    targetEngine: diagnostics.completeness.targetEngine,
    completenessScore: diagnostics.completeness.score,
    maps: material.maps.map((map) => ({
      id: map.id,
      fileName: map.fileName,
      mapType: map.mapType,
      confidence: map.confidence,
      width: map.width,
      height: map.height,
    })),
    missingRequiredMaps: diagnostics.completeness.missingRequiredMaps,
    missingOptionalMaps: diagnostics.completeness.missingOptionalMaps,
    diagnostics: diagnostics.items,
    recommendations: buildMaterialRecommendations(material, diagnostics),
    generatedAt: new Date().toISOString(),
  };
}

export function downloadMaterialDiagnosticReport(material: MaterialFolderMetadata): void {
  const report = createMaterialDiagnosticReport(material);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const safeName = (material.materialName || material.folderName || 'material')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  downloadBlob(blob, `${safeName || 'material'}_diagnostics.json`);
}
