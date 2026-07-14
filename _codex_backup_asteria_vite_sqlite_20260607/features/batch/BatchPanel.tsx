import { useMemo } from 'react';
import { BatchProcessingJob } from '@/types/asteria';
import { Download } from 'lucide-react';
import { getBatchActionLabel, getBatchProcessingMessage, getBatchStatusLabel } from '@/services/batchProcessingService';
import { ProcessingReport } from '@/services/processingReportService';

interface BatchPanelProps {
    activeJob: BatchProcessingJob | null;
    recentJobs: BatchProcessingJob[];
    reports?: ProcessingReport[];
    onCancel: (jobId: string) => void;
    onClear: () => void;
    onDownloadReport?: (reportId: string) => void;
}

export function BatchPanel({ activeJob, recentJobs, reports = [], onCancel, onClear, onDownloadReport }: BatchPanelProps) {
    const latestReport = useMemo(() => {
        if (!activeJob && recentJobs.length === 0) return null;
        const displayJob = activeJob || recentJobs[0];
        return displayJob.reportId
            ? reports.find(report => report.id === displayJob.reportId)
            : reports[0];
    }, [activeJob, recentJobs, reports]);

    const recentResults = useMemo(() => {
        if (!activeJob && recentJobs.length === 0) return [];
        const displayJob = activeJob || recentJobs[0];
        return displayJob.results.slice(-3).reverse();
    }, [activeJob, recentJobs]);

    if (!activeJob && recentJobs.length === 0) return null;

    const displayJob = activeJob || recentJobs[0];
    const scale = displayJob.options?.upscale?.scale;
    const requestedEngine = displayJob.options?.upscale?.engine;
    const qualityPreset = displayJob.options?.upscale?.qualityPreset;
    const tileSize = displayJob.options?.upscale?.tileSize;
    const tilePad = displayJob.options?.upscale?.tilePad;
    const modelId = displayJob.options?.upscale?.modelId;
    const engineLabel = displayJob.action === 'upscale'
        ? requestedEngine === 'real-esrgan'
            ? 'Requested: Real-ESRGAN'
            : requestedEngine === 'pillow'
                ? 'Requested: Pillow'
                : 'Requested: Auto'
        : undefined;
    

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            <div className="w-[320px] bg-[#1a1c1c]/90 backdrop-blur-xl shrink-0 rounded-2xl shadow-2xl ring-1 ring-white/[0.08] overflow-hidden pointer-events-auto">
                <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${displayJob.status === 'running' ? 'bg-[#fde400] shadow-[0_0_8px_rgba(253,228,0,0.4)] animate-pulse' : 
                            displayJob.status === 'completed' ? 'bg-[#4de082]' : 
                            displayJob.status === 'failed' ? 'bg-[#f59e0b]' : 'bg-[#7f826f]'
                        }`} />
                        <h3 className="text-[#f2f2ef] font-semibold text-[13px] tracking-tight">{displayJob.label}</h3>
                    </div>
                </div>

                <div className="p-4 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5 text-[9px] uppercase tracking-wider font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[#b8b59f]">{getBatchActionLabel(displayJob.action)}</span>
                        {scale && <span className="px-1.5 py-0.5 rounded bg-[#4de082]/10 text-[#4de082]">{scale}x</span>}
                        {qualityPreset && <span className="px-1.5 py-0.5 rounded bg-[#4de082]/10 text-[#9bf3bc]">{qualityPreset}</span>}
                        {engineLabel && <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[#7f826f]">{engineLabel}</span>}
                        {tileSize && <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[#7f826f]">Tile {tileSize}</span>}
                        {tilePad && <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[#7f826f]">Pad {tilePad}</span>}
                        {modelId && <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[#7f826f]">{modelId.replace('.onnx', '')}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-[#b8b59f]">{displayJob.status === 'running' ? getBatchProcessingMessage(displayJob.action) : getBatchStatusLabel(displayJob.status)}</span>
                            <span className="text-[#f2f2ef] font-mono">{displayJob.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ${displayJob.status === 'failed' ? 'bg-[#f59e0b]' : 'bg-[#fde400]'}`}
                                style={{ width: `${displayJob.progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-[#7f826f] mt-1 space-x-4">
                            <span>{displayJob.completedCount + displayJob.failedCount} / {displayJob.itemIds.length} items</span>
                            <div className="flex gap-2">
                                {displayJob.completedCount > 0 && <span className="text-[#4de082]">{displayJob.completedCount} done</span>}
                                {displayJob.failedCount > 0 && <span className="text-[#f59e0b]">{displayJob.failedCount} failed</span>}
                                {!!displayJob.skippedCount && <span>{displayJob.skippedCount} skipped</span>}
                            </div>
                        </div>
                    </div>

                    {recentResults.length > 0 && (
                        <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-2">
                             {recentResults.map(result => (
                                 <div key={`${result.itemId}_${result.status}`} className="flex justify-between gap-2 text-[10px]">
                                     <div className="min-w-0 flex flex-col">
                                         <span className="truncate text-[#b8b59f]">{result.itemName}</span>
                                         {result.actualEngine && (
                                             <span className="text-[9px] text-[#7f826f] uppercase tracking-wider">
                                                 {result.actualEngine}
                                                 {result.fallbackFrom ? ` • fallback ${result.fallbackFrom}` : ''}
                                                 {result.upscaleQualityPreset ? ` • ${result.upscaleQualityPreset}` : ''}
                                                 {result.tileSize ? ` • tile ${result.tileSize}` : ''}
                                                 {result.tilePad ? ` • pad ${result.tilePad}` : ''}
                                             </span>
                                         )}
                                     </div>
                                     <span className={result.status === 'completed' ? 'text-[#4de082]' : result.status === 'failed' ? 'text-[#f59e0b]' : 'text-[#7f826f]'}>
                                         {result.message || result.error || getBatchStatusLabel(result.status)}
                                     </span>
                                 </div>
                             ))}
                        </div>
                    )}

                    {latestReport && displayJob.status !== 'running' && (
                        <div className="border-t border-white/[0.04] pt-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[10px] text-[#f2f2ef] font-semibold">Processing Report</div>
                                <div className="text-[9px] text-[#7f826f] truncate">{latestReport.summary}</div>
                            </div>
                            {onDownloadReport && (
                                <button
                                    onClick={() => onDownloadReport(latestReport.id)}
                                    className="shrink-0 flex items-center gap-1 px-2 py-1.5 bg-white/[0.05] text-[#b8b59f] hover:bg-white/[0.1] hover:text-[#f2f2ef] rounded-lg text-[10px] font-semibold transition-colors"
                                >
                                    <Download className="w-3 h-3" /> JSON
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                        {displayJob.status === 'running' && (
                            <button 
                                onClick={() => onCancel(displayJob.id)}
                                className="px-3 py-1.5 bg-[#fde400]/10 text-[#fde400] hover:bg-[#fde400]/20 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                                Cancel Batch
                            </button>
                        )}
                        {displayJob.status !== 'running' && (
                            <button 
                                onClick={onClear}
                                className="px-3 py-1.5 bg-white/[0.05] text-[#b8b59f] hover:bg-white/[0.1] hover:text-[#f2f2ef] rounded-lg text-[11px] font-semibold transition-colors"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
