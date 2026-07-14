import { WindowControls } from './WindowControls';

export function AppChrome() {
    return (
        <div className="relative z-50 shrink-0 select-none px-3 pt-3 pb-2">
            <div className="flex h-10 items-center gap-3 rounded-2xl bg-[#020303]/90 px-3 ring-1 ring-white/[0.03] shadow-[0_8px_24px_rgba(0,0,0,0.15)] backdrop-blur-sm">
                <div
                    className="flex items-center gap-2 min-w-0 shrink-0 pr-2 cursor-move"
                    data-tauri-drag-region
                >
                    <span className="text-[#7f826f] font-medium text-[11px] tracking-[0.28em] uppercase">
                        Asteria
                    </span>
                </div>

                <div
                    className="flex-1 h-full min-w-0 cursor-move"
                    data-tauri-drag-region
                />

                <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <WindowControls />
                </div>
            </div>
        </div>
    );
}
