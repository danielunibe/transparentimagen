import { Settings } from 'lucide-react';

export function SidebarFooter() {
    return (
        <div className="p-4 flex flex-col gap-2 bg-transparent shrink-0">
            <button className="w-full py-2 group text-[#b8b59f] hover:text-[#f2f2ef] transition-colors rounded-xl text-[13px] font-medium hover:bg-white/[0.02] text-left px-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-transparent group-hover:bg-white/[0.035] flex items-center justify-center transition-colors">
                    <Settings className="w-4.5 h-4.5" />
                </div>
                Settings
            </button>
            <div className="flex justify-center items-center px-1 pt-2 pb-1">
                 <span className="text-[#7f826f] text-[10px] font-medium tracking-wide flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#4de082]/80"></div> Local · Ready
                 </span>
            </div>
        </div>
    );
}
