import { useEffect, useState } from 'react';
import { AiProcessingJob } from '@/types/asteria';
import { getAiModeLabel, getAiStatusLabel } from '@/services/aiProcessingService';
import { Loader2, CheckCircle2, XCircle, Clock, Trash2, X } from 'lucide-react';
import { AiEngineStatus } from '../ai/AiEngineStatus';
import { isJobLifecycleActive } from '@/data/jobStatuses';

interface JobsPanelProps {
    jobs: AiProcessingJob[];
    onCancel: (id: string) => void;
    onClear: () => void;
}

export function JobsPanel({ jobs, onCancel, onClear }: JobsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    const activeJobs = jobs.filter(j => isJobLifecycleActive(j.status));
    
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {isOpen && (
                <div className="bg-[#101212]/95 backdrop-blur-3xl border border-white/[0.04] p-3 rounded-2xl w-[350px] shadow-2xl flex flex-col gap-2 max-h-[400px] overflow-hidden">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[12px] font-bold text-[#f2f2ef] tracking-wide uppercase">AI Pipeline</span>
                        <div className="flex items-center gap-2">
                           <button onClick={onClear} className="text-[#7f826f] hover:text-[#f2f2ef] flex items-center gap-1 text-[10px] uppercase font-bold" title="Clear completed">
                              <Trash2 className="w-3 h-3" />
                           </button>
                           <button onClick={() => setIsOpen(false)} className="text-[#7f826f] hover:text-[#f2f2ef]">
                              <X className="w-4 h-4" />
                           </button>
                        </div>
                    </div>
                    
                    <div className="pb-1 mt-1 border-b border-white/[0.04]">
                        <AiEngineStatus />
                    </div>
                    
                    {jobs.length > 0 ? (
                        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pr-1 mt-1">
                            {jobs.map(job => (
                                <div key={job.id} className="bg-[#151818] rounded-xl p-2.5 flex items-start justify-between border border-white/[0.02]">
                                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                                        <span className="text-[11px] font-bold text-[#f2f2ef]">{getAiModeLabel(job.mode)}</span>
                                        {job.adapterLabel && (
                                            <span className="text-[9px] text-[#fde400]/70 uppercase tracking-wider">{job.adapterLabel}</span>
                                        )}
                                        <span className="text-[10px] text-[#7f826f] truncate">{job.assetName}</span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                           <JobStatusIcon status={job.status} />
                                           <span className="text-[10px] text-[#b8b59f]">{getAiStatusLabel(job.status)}</span>
                                        </div>
                                        {job.variantId && job.status === 'completed' && (
                                            <div className="mt-1 px-1.5 py-[1px] rounded bg-[#fde400]/10 border border-[#fde400]/20 text-[8px] text-[#fde400] uppercase font-bold tracking-wider w-max">
                                                Variant Created
                                            </div>
                                        )}
                                    </div>
                                    {isJobLifecycleActive(job.status) && (
                                        <button 
                                            onClick={() => onCancel(job.id)}
                                            className="text-[#e65c5c] hover:bg-[#201010] p-1.5 rounded-lg transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-[11px] text-[#7f826f] font-medium tracking-wide">
                            No AI jobs in the queue.
                        </div>
                    )}
                </div>
            )}
            
            {!isOpen && activeJobs.length > 0 && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-[#fde400] text-[#121414] font-bold text-[11px] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
                >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {activeJobs.length} Processing
                </button>
            )}
            {!isOpen && activeJobs.length === 0 && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-[#101212] border border-white/[0.06] text-[#b8b59f] font-bold text-[11px] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-[#151818] transition-all cursor-pointer"
                >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#fde400]" />
                    AI Engine / Jobs {jobs.length > 0 ? `(${jobs.length})` : ''}
                </button>
            )}
        </div>
    );
}

function JobStatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'completed':
            return <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />;
        case 'failed':
        case 'unsupported':
            return <XCircle className="w-3 h-3 text-[#ef4444]" />;
        case 'cancelled':
            return <XCircle className="w-3 h-3 text-[#7f826f]" />;
        case 'queued':
            return <Clock className="w-3 h-3 text-[#b8b59f]" />;
        case 'placeholder':
            return <CheckCircle2 className="w-3 h-3 text-[#fde400]" />;
        case 'preparing':
        case 'processing':
        default:
            return <Loader2 className="w-3 h-3 text-[#fde400] animate-spin" />;
    }
}
