import { AssetVariantKind, BatchProcessingAction, BatchProcessingJob } from '@/types/asteria';
import { downloadBlob } from './exportService';
import { safeGetJson, safeSetJson } from './storageService';
import { getJobLifecycleLabel } from './jobLifecycleService';

const PROCESSING_REPORTS_KEY = 'asteria_processing_reports';

export interface ProcessingReportItem {
  assetId: string;
  assetName: string;
  status: 'completed' | 'failed' | 'skipped';
  variantId?: string;
  variantKind?: AssetVariantKind;
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessingReport {
  id: string;
  createdAt: string;
  action: BatchProcessingAction;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  durationMs?: number;
  createdVariantCount: number;
  items: ProcessingReportItem[];
  summary: string;
}

export function createProcessingReport(batchJob: BatchProcessingJob): ProcessingReport {
  const completed = batchJob.completedCount || 0;
  const failed = batchJob.failedCount || 0;
  const skipped = batchJob.skippedCount || 0;
  const createdVariantCount = batchJob.results.filter(item => item.variantId).length;

  return {
    id: `report_${batchJob.id}`,
    createdAt: new Date().toISOString(),
    action: batchJob.action,
    total: batchJob.itemIds.length,
    completed,
    failed,
    skipped,
    durationMs: batchJob.durationMs,
    createdVariantCount,
    items: batchJob.results.map(result => ({
      assetId: result.itemId,
      assetName: result.itemName,
      status: result.status === 'completed' ? 'completed' : result.status === 'skipped' ? 'skipped' : 'failed',
      variantId: result.variantId,
      variantKind: result.variantKind,
      message: result.message,
      error: result.error,
      metadata: {
        outputWidth: result.outputWidth,
        outputHeight: result.outputHeight,
        upscaleScale: result.upscaleScale,
        upscaleEngine: result.upscaleEngine,
        upscaleQualityPreset: result.upscaleQualityPreset,
        tileSize: result.tileSize,
        tilePad: result.tilePad,
        requestedEngine: result.requestedEngine,
        actualEngine: result.actualEngine,
        fallbackFrom: result.fallbackFrom,
        realEsrganStatus: result.realEsrganStatus,
        modelId: result.modelId,
        modelStatus: result.modelStatus,
        memoryMode: result.memoryMode,
        estimatedCost: result.estimatedCost,
        errorCode: result.errorCode
      }
    })),
    summary: `${completed}/${batchJob.itemIds.length} ${getJobLifecycleLabel('completed').toLowerCase()}, ${failed} ${getJobLifecycleLabel('failed').toLowerCase()}, ${skipped} ${getJobLifecycleLabel('skipped').toLowerCase()}.`
  };
}

export function loadProcessingReports(): ProcessingReport[] {
  const reports = safeGetJson<ProcessingReport[]>(PROCESSING_REPORTS_KEY, []);
  return Array.isArray(reports) ? reports : [];
}

export function saveProcessingReport(report: ProcessingReport): ProcessingReport[] {
  const reports = [report, ...loadProcessingReports().filter(existing => existing.id !== report.id)];
  const limited = reports.slice(0, 20);
  safeSetJson(PROCESSING_REPORTS_KEY, limited);
  return limited;
}

export function clearOldProcessingReports(limit = 20): ProcessingReport[] {
  const reports = loadProcessingReports().slice(0, limit);
  safeSetJson(PROCESSING_REPORTS_KEY, reports);
  return reports;
}

export function exportProcessingReportJson(report: ProcessingReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${report.id}.json`);
}
