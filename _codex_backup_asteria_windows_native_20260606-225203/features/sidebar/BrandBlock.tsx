export function BrandBlock() {
    return (
        <div className="h-[88px] flex flex-col justify-center px-6 shrink-0 bg-transparent">
            <div className="w-full flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.035] group-hover:bg-white/[0.07] ring-1 ring-white/[0.02] flex items-center justify-center transition-colors">
                        <div className="w-2 h-2 rounded-full bg-[#fde400]/80"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-bold tracking-wide text-[#f2f2ef] leading-tight">Asteria</span>
                        <span className="text-[11px] text-[#7f826f] font-medium leading-tight group-hover:text-[#b8b59f] transition-colors">Local visual AI</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
