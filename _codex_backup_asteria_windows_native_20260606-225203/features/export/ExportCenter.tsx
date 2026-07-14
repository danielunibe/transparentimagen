import { useMemo } from 'react';
import { Download, CheckCircle2, XCircle, Clock, Loader2, Trash2 } from 'lucide-react';
import { ExportJob } from '@/types/asteria';
import { getExportStatusLabel } from '@/services/exportQueueService';

interface ExportCenterProps {
    jobs: ExportJob[];
    onClear: () => void;
}

export function ExportCenter({ jobs, onClear }: ExportCenterProps) {
    const recentJobs = useMemo(() => jobs.slice(0, 30), [jobs]);
    if (jobs.length === 0) return null;

    return (
        <div className="absolute bottom-4 right-44 w-72 bg-[#0a0b0b]/95 backdrop-blur-xl rounded-xl border border-[#1d1e1e] shadow-2xl overflow-hidden flex flex-col z-40 max-h-96">
            <div className="px-3 py-2 border-b border-[#1d1e1e] flex items-center justify-between bg-[#151818]/50">
                <div className="flex items-center gap-1.5 text-[#f2f2ef] text-[11px] font-bold tracking-wider uppercase">
                    <Download className="w-3.5 h-3.5 text-[#4de082]" />
                    Export Center
                </div>
                <button 
                    onClick={onClear}
                    className="text-[9px] uppercase tracking-wider text-[#7f826f] hover:text-[#f2f2ef] transition-colors flex items-center gap-1"
                >
                    <Trash2 className="w-3 h-3" /> Clear
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
                {recentJobs.map(job => (
                    <div key={job.id} className="bg-[#151818] border border-[#1d1e1e] rounded-lg p-2.5 flex flex-col gap-1.5">
                        <div className="flex justify-between items-start gap-2">
                            <span className="text-[11px] font-medium text-[#f2f2ef] truncate flex-1">
                                {job.filename || job.assetName}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <JobStatusIcon status={job.status} />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono uppercase bg-[#1d1e1e] px-1.5 py-0.5 rounded text-[#b8b59f]">
                                    {job.format}
                                </span>
                                {(job.variantLabel) && (
                                    <span className="text-[9px] font-mono uppercase bg-[#4de082]/10 text-[#4de082] px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                        {job.variantLabel}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] text-[#7f826f]">{getExportStatusLabel(job.status)}</span>
                        </div>

                        {job.error && (
                            <div className="text-[9px] text-red-400 mt-0.5 leading-tight bg-red-400/10 px-1.5 py-1 rounded">
                                {job.error}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function JobStatusIcon({ status }: { status: ExportJob['status'] }) {
    switch (status) {
        case 'queued':
        case 'preparing':
            return <Clock className="w-3.5 h-3.5 text-[#7f826f]" />;
        case 'exporting':
            return <Loader2 className="w-3.5 h-3.5 text-[#4de082] animate-spin" />;
        case 'completed':
            return <CheckCircle2 className="w-3.5 h-3.5 text-[#4de082]" />;
        case 'failed':
        case 'unsupported':
            return <XCircle className="w-3.5 h-3.5 text-red-500" />;
        case 'cancelled':
            return <XCircle className="w-3.5 h-3.5 text-[#7f826f]" />;
    }
}
