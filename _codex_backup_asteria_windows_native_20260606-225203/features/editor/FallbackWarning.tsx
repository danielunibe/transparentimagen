import { AlertTriangle, Clock } from 'lucide-react';

interface FallbackWarningProps {
    message?: string;
    type?: 'warning' | 'info';
}

export function FallbackWarning({ message = 'Local AI processing is not connected yet', type = 'warning' }: FallbackWarningProps) {
    const isWarning = type === 'warning';
    
    return (
        <div className={`absolute bottom-4 mx-auto px-4 py-1.5 ${isWarning ? 'bg-[#040404]/90 border-orange-400/30' : 'bg-[#040404]/90 border-[#7f826f]/30'} backdrop-blur-md border rounded-full z-20 shrink-0 shadow-lg pointer-events-none`}>
            <span className={`text-[9px] uppercase font-bold tracking-widest ${isWarning ? 'text-orange-400' : 'text-[#7f826f]'} font-mono flex items-center gap-1.5`}>
                {isWarning ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {message}
            </span>
        </div>
    );
}
