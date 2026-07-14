import { Unplug, FolderSync, UploadCloud } from 'lucide-react';
import { FolderSource } from '@/types/asteria';

interface ReconnectFolderStateProps {
    source?: FolderSource | null;
    onReconnect: () => void;
}

export function ReconnectFolderState({ source, onReconnect }: ReconnectFolderStateProps) {
    let title = "Reconnect folder";
    let message = "Your browser needs permission again to read this folder.";
    let buttonLabel = "Reconnect";
    
    if (source) {
        if (source.kind === 'webkit_fallback') {
            title = "Temporary Folder access";
            message = "This folder was added through browser fallback. Reconnect may be required after refresh.";
        } else if (source.kind === 'dropped_files') {
            title = "Dropped files expired";
            message = "Dropped files are temporary for this session. Please drop them again to view.";
            buttonLabel = "Understood";
        } else if (source.status === 'reconnect_required' && source.hasPersistentHandle) {
             title = "Permission expired";
             message = "Asteria saved the folder handle, but the browser needs you to confirm access again for security.";
             buttonLabel = "Grant Permission";
        }
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] shadow-sm flex items-center justify-center mb-6 text-[#7f826f]">
                {source?.kind === 'dropped_files' ? <UploadCloud className="w-8 h-8" /> : (
                    source?.hasPersistentHandle ? <FolderSync className="w-8 h-8 text-[#fde400]" /> : <Unplug className="w-8 h-8" />
                )}
            </div>
            
            <h3 className="text-[#f2f2ef] font-semibold text-xl mb-2 tracking-tight">{title}</h3>
            <p className="text-[#b8b59f] text-[13px] max-w-[360px] mx-auto mb-8 leading-relaxed">
                {message}
            </p>
            
            <button onClick={onReconnect} className="px-6 py-3 bg-[#fde400] text-[#121414] font-bold text-sm rounded-xl hover:brightness-110 transition-colors shadow-sm">
                {buttonLabel}
            </button>
        </div>
    );
}
