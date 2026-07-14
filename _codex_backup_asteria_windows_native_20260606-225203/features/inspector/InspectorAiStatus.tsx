import { GalleryItem, AiProcessingJob } from '@/types/asteria';
import { getAiModeLabel, getAiStatusLabel } from '@/services/aiProcessingService';
import { Loader2, CheckCircle2, Clock, XCircle, Sparkles } from 'lucide-react';

export function InspectorAiStatus({ item, job }: { item: GalleryItem, job: AiProcessingJob }) {
    if (!job) return null;
    
    return (
        <div className="mt-4 pt-4 border-t border-[#161717]">
             <div className="text-[10px] text-[#7f826f] font-medium tracking-wider mb-2">LATEST AI JOB</div>
             <div className="bg-[#151818] rounded-xl p-3 border border-white/[0.04]">
                 <div className="flex justify-between items-start mb-2">
                     <div className="flex flex-col">
                         <div className="flex items-center gap-1.5 text-[#f2f2ef] text-[12px] font-bold">
                             <Sparkles className="w-3.5 h-3.5 text-[#fde400]" />
                             {getAiModeLabel(job.mode)}
                         </div>
                         {job.adapterLabel && (
                             <span className="text-[9px] text-[#fde400]/80 uppercase tracking-widest mt-1">
                                 {job.adapterLabel}
                             </span>
                         )}
                     </div>
                     <JobStatusBadge status={job.status} />
                 </div>
                 {job.message && (
                     <p className="text-[#a0a0a0] text-[11px] leading-relaxed mt-1">
                         {job.message}
                     </p>
                 )}
                 {job.prompt && (
                     <div className="mt-2 text-[11px] bg-[#000000] rounded p-2 text-[#b8b59f] border border-[#161717]">
                         &quot;{job.prompt}&quot;
                     </div>
                 )}
             </div>
        </div>
    );
}

function JobStatusBadge({ status }: { status: string }) {
    let Icon = Loader2;
    let colorClass = "text-[#fde400]";
    let bgClass = "bg-[#fde400]/10";
    
    switch (status) {
        case 'completed':
            Icon = CheckCircle2; colorClass = "text-[#22c55e]"; bgClass = "bg-[#22c55e]/10"; break;
        case 'failed':
        case 'unsupported':
            Icon = XCircle; colorClass = "text-[#ef4444]"; bgClass = "bg-[#ef4444]/10"; break;
        case 'cancelled':
            Icon = XCircle; colorClass = "text-[#7f826f]"; bgClass = "bg-[#161717]"; break;
        case 'queued':
            Icon = Clock; colorClass = "text-[#b8b59f]"; bgClass = "bg-[#161717]"; break;
        case 'placeholder':
            Icon = CheckCircle2; colorClass = "text-[#fde400]"; bgClass = "bg-[#fde400]/10"; break;
    }
    
    const isSpinning = status === 'preparing' || status === 'processing';
    
    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${bgClass} border border-white/[0.04]`}>
            <Icon className={`w-2.5 h-2.5 ${colorClass} ${isSpinning ? 'animate-spin' : ''}`} />
            <span className={`text-[8px] uppercase tracking-widest font-bold ${colorClass}`}>
                {getAiStatusLabel(status as any)}
            </span>
        </div>
    );
}
