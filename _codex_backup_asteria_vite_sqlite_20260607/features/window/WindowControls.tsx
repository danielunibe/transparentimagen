import { Minus, Square, Copy, X } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { minimizeWindow, toggleMaximizeWindow, closeWindow, getWindowControlsCapabilities } from '@/services/windowControls';

export function WindowControls() {
    const [isMaximized, setIsMaximized] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const isNativeRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        isNativeRef.current = getWindowControlsCapabilities().isNativeShell;
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const showMessage = useCallback((msg: string) => {
        if (isNativeRef.current) return;
        setMessage(msg);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setMessage(null), 2500);
    }, []);

    const handleMinimize = useCallback(() => {
        minimizeWindow();
        showMessage("Desktop mode only");
    }, [showMessage]);

    const handleMaximize = useCallback(() => {
        const newState = toggleMaximizeWindow();
        setIsMaximized(newState);
    }, []);

    const handleClose = useCallback(() => {
        closeWindow();
        showMessage("Desktop mode only");
    }, [showMessage]);

    return (
        <div className="flex items-center select-none gap-0.5">
            {message && (
                <span className="text-[10px] text-[#b8b59f] mr-2 font-medium px-2.5 py-1 bg-[#151818]/95 rounded-full ring-1 ring-white/[0.05] shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    {message}
                </span>
            )}
            <button
                onClick={handleMinimize}
                title="Minimize"
                className="w-10 h-8 rounded-lg flex items-center justify-center text-[#7f826f] hover:text-[#f2f2ef] hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-150"
            >
                <Minus className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={handleMaximize}
                title={isMaximized ? "Restore" : "Maximize"}
                className="w-10 h-8 rounded-lg flex items-center justify-center text-[#7f826f] hover:text-[#f2f2ef] hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-150"
            >
                {isMaximized ? (
                    <Copy className="w-3.5 h-3.5 rotate-180 scale-x-[-1]" />
                ) : (
                    <Square className="w-3 h-3" strokeWidth={2} />
                )}
            </button>
            <button
                onClick={handleClose}
                title="Close"
                className="w-10 h-8 rounded-lg flex items-center justify-center text-[#7f826f] hover:text-white hover:bg-red-500/85 active:bg-red-500 transition-colors duration-150"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
