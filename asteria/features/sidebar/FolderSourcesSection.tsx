import { FolderOpen, Plus } from 'lucide-react';
import { FolderSource, AssetFilterMode } from '@/types/asteria';

interface FolderSourcesSectionProps {
    filterMode: AssetFilterMode;
    setFilterMode: (filter: AssetFilterMode) => void;
    workspace: any;
}

export function FolderSourcesSection({ workspace }: FolderSourcesSectionProps) {
    const { folderSources, addFolderSource } = workspace;
    
    return (
        <div className="flex flex-col gap-1 px-3 mt-2 border-t border-white/[0.04] pt-5">
            <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[10px] text-[#7f826f] font-semibold">Folder Sources</span>
                <button onClick={addFolderSource} className="w-6 h-6 flex items-center justify-center text-[#7f826f] hover:text-[#f2f2ef] transition-colors rounded-lg hover:bg-white/[0.035]"><Plus className="w-4 h-4" /></button>
            </div>
            
            {folderSources.map((folder: FolderSource) => {
                const isActive = workspace.currentSourceId === folder.id;
                const isTemp = folder.status === 'temporary';
                const isRecReq = folder.status === 'reconnect_required';
                return (
                <div key={folder.id} onClick={() => {
                    workspace.openSavedFolderSource(folder);
                }} className={`flex items-center justify-between py-2 cursor-pointer transition-colors rounded-xl px-2 group ${isActive ? 'bg-[#151818] ring-1 ring-white/[0.04] text-[#f2f2ef]' : 'text-[#b8b59f] hover:bg-white/[0.02] hover:text-[#f2f2ef]'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-white/[0.035]' : 'bg-transparent group-hover:bg-white/[0.02]'}`}>
                            <FolderOpen className={`w-4 h-4 ${isActive ? (isTemp ? 'text-[#b8b59f]' : 'text-[#fde400]') : 'text-[#7f826f] group-hover:text-[#f2f2ef]'}`} />
                        </div>
                        <span className="text-[13px] font-medium flex flex-col">
                            {folder.name}
                            {isTemp && <span className="text-[9px] text-[#7f826f]">Temporary</span>}
                            {isRecReq && <span className="text-[9px] text-[#e65c5c]/80">Reconnect</span>}
                        </span>
                    </div>
                </div>
            )})}
            
            {folderSources.length === 0 && (
                <div className="px-3 py-4 text-center mt-2 cursor-pointer group" onClick={addFolderSource}>
                    <p className="text-[11px] text-[#7f826f] font-medium leading-relaxed group-hover:text-[#b8b59f] transition-colors">
                        No folders yet.<br/>Click + to add one.
                    </p>
                </div>
            )}
        </div>
    );
}
