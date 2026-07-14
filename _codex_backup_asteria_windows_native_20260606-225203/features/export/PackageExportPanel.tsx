import { ExportPackageJob } from '@/types/asteria';
import { Package, Download, Trash2, ShieldAlert, FolderKey } from 'lucide-react';
import { getPackageStatusLabel } from '@/services/packageExportService';

interface PackageExportPanelProps {
    activeJob: ExportPackageJob | null;
    recentJobs: ExportPackageJob[];
    onDownloadManifest: (job: ExportPackageJob) => void;
    onClear: () => void;
}

export function PackageExportPanel({ activeJob, recentJobs, onDownloadManifest, onClear }: PackageExportPanelProps) {
    if (!activeJob && recentJobs.length === 0) return null;

    const displayJob = activeJob || recentJobs[0];

    return (
        <div className="fixed bottom-6 right-[440px] z-50 flex flex-col gap-2 pointer-events-none">
            <div className="w-[340px] bg-[#1a1c1c]/90 backdrop-blur-xl shrink-0 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.08] overflow-hidden pointer-events-auto flex flex-col">
                <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-2">
                        {displayJob.nativeExport ? (
                            <FolderKey className="w-4 h-4 text-[#e0a84d]" strokeWidth={1.5} />
                        ) : (
                            <Package className="w-4 h-4 text-[#4de082]" strokeWidth={1.5} />
                        )}
                        <h3 className="text-[#f2f2ef] font-semibold text-[13px] tracking-tight truncate max-w-[150px]">
                            {displayJob.label}
                        </h3>
                    </div>
                    {displayJob.nativeExport && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e0a84d]/10 text-[#e0a84d]">
                            Native Save
                        </span>
                    )}
                </div>

                <div className="p-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-[#b8b59f]">{getPackageStatusLabel(displayJob.status)}</span>
                        </div>
                        {displayJob.manifest && (
                            <div className="flex justify-between items-center text-[10px] text-[#7f826f] mt-1">
                                <span>{displayJob.manifest.itemCount} items exported</span>
                                <div className="flex gap-2">
                                    <span className="text-[#4de082]">
                                        {displayJob.nativeExport ? displayJob.savedFileCount : displayJob.manifest.completedCount} done
                                    </span>
                                    {(displayJob.nativeExport ? displayJob.skippedFileCount! > 0 : displayJob.manifest.failedCount > 0) && 
                                        <span className="text-[#f59e0b]">
                                            {displayJob.nativeExport ? displayJob.skippedFileCount : displayJob.manifest.failedCount} failed
                                        </span>
                                    }
                                </div>
                            </div>
                        )}
                        {displayJob.nativeExport && displayJob.outputDirectory && (
                           <div className="text-[10px] text-[#b8b59f] truncate mt-1">
                               to: {displayJob.outputDirectory.length > 40 ? "..." + displayJob.outputDirectory.substring(displayJob.outputDirectory.length - 40) : displayJob.outputDirectory}
                           </div>
                        )}
                    </div>
                    
                    {!displayJob.nativeExport && (
                        <div className="flex items-start gap-2 mt-1 px-3 py-2 bg-yellow-500/10 rounded-lg">
                            <ShieldAlert className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" strokeWidth={2} />
                            <span className="text-[10px] text-yellow-500/90 leading-tight font-medium">ZIP packaging is reserved for native runtime or an approved zip dependency. Files will download sequentially.</span>
                        </div>
                    )}

                    <div className="flex gap-2 mt-2 pt-2 border-t border-white/[0.04]">
                        {displayJob.status !== 'exporting' && displayJob.status !== 'preparing' && (
                            <>
                                {!displayJob.nativeExport && (
                                    <button 
                                        onClick={() => onDownloadManifest(displayJob)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.05] text-[#f2f2ef] hover:bg-white/[0.1] rounded-lg text-[11px] font-semibold transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Manifest
                                    </button>
                                )}
                                <button 
                                    onClick={onClear}
                                    className={`flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] hover:text-[#f2f2ef] hover:bg-white/[0.05] rounded-lg text-[11px] font-semibold transition-colors ${displayJob.nativeExport ? 'flex-1' : 'shrink-0'}`}
                                    title="Dismiss"
                                >
                                    Dismiss
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
