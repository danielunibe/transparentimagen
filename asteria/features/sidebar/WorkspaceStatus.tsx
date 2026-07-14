import { Monitor, HardDrive, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRuntimeCapabilities, RuntimeCapabilities } from '@/services/runtimeService';
import { clearThumbnailCache } from '@/services/thumbnailService';
import { initializePersistence } from '@/services/persistenceService';

export function WorkspaceStatus() {
    const [caps, setCaps] = useState<RuntimeCapabilities | null>(null);
    const [sqliteReady, setSqliteReady] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        setCaps(getRuntimeCapabilities());
        void initializePersistence()
            .then(() => setSqliteReady(true))
            .catch(() => setSqliteReady(false));
    }, []);

    const handleClearCache = async () => {
        setClearing(true);
        await clearThumbnailCache();
        setFeedback('Cache cleared');
        setTimeout(() => setFeedback(''), 2000);
        setClearing(false);
    };

    let title = "Asteria Desktop";
    let icon = <Monitor className="w-4.5 h-4.5 text-[#b8b59f]" strokeWidth={1.5} />;
    
    if (caps) {
        if (caps.runtime === 'tauri') {
            title = sqliteReady ? "Tauri + SQLite" : "Tauri Runtime";
            icon = <Monitor className="w-4.5 h-4.5 text-[#4de082]" strokeWidth={1.5} />;
        } else if (caps.runtime === 'native-bridge') {
            title = "Native Bridge";
            icon = <Monitor className="w-4.5 h-4.5 text-[#b8b59f]" strokeWidth={1.5} />;
        } else if (caps.runtime !== 'web' && caps.runtime !== 'unknown') {
            title = "Desktop Runtime";
            icon = <Monitor className="w-4.5 h-4.5 text-[#b8b59f]" strokeWidth={1.5} />;
        }
    }

    return (
        <div className="flex flex-col px-3 mb-2">
            <span className="text-[10px] text-[#7f826f] font-semibold mb-1 px-3">Workspace</span>
            <div className="flex flex-col px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.035] ring-1 ring-white/[0.02] flex items-center justify-center transition-colors">
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-[#f2f2ef] leading-tight flex items-center gap-1.5">
                            {title}
                        </span>
                        <span className="text-[10px] text-[#7f826f] font-medium mt-0.5 leading-tight flex items-center gap-1.5">
                            {caps?.runtime === 'tauri' ? 'Native paths' : 'Native runtime required'}
                            <span className="opacity-40">•</span>
                            {sqliteReady ? 'SQLite Ready' : 'SQLite unavailable'}
                        </span>
                    </div>
                </div>
                
                {sqliteReady && (
                    <div className="flex items-center justify-between pl-1">
                        <div className="flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-[#7f826f]" />
                            <span className="text-[10px] text-[#7f826f] font-medium">Cache Active</span>
                        </div>
                        <button 
                            onClick={handleClearCache}
                            disabled={clearing}
                            className={`flex items-center gap-1 px-2 py-1 bg-[#1a1c1c] text-[#b8b59f] hover:text-[#f2f2ef] hover:bg-white/[0.05] rounded-[6px] text-[10px] font-medium transition-colors ${clearing ? 'opacity-50' : ''}`}
                        >
                            <Trash2 className="w-3 h-3" />
                            {feedback ? feedback : 'Clear'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
