import { Loader2 } from 'lucide-react';

export function ScanningState() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
            <Loader2 className="w-8 h-8 text-[#fde400] animate-spin mb-4" />
            <h3 className="text-[#f2f2ef] font-semibold text-[15px] mb-1">Scanning folder...</h3>
            <p className="text-[#7f826f] text-[13px]">Preparing previews and reading supported images.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-8 w-full max-w-4xl opacity-50">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[4/3] bg-white/[0.03] rounded-2xl animate-pulse"></div>
                ))}
            </div>
        </div>
    );
}
