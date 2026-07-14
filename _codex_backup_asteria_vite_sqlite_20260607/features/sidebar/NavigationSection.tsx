import { LayoutGrid, FolderOpen, ArrowLeft, Maximize, Eraser, Grid, Plus, Shapes, Boxes, SwatchBook } from 'lucide-react';
import { AppView } from '@/types/asteria';
import { MODES } from '@/data/modes';

interface NavigationSectionProps {
    currentView: AppView;
    activeMode: string;
    setActiveMode: (mode: string) => void;
    setCurrentView: (view: AppView) => void;
}

export function NavigationSection({
    currentView,
    activeMode,
    setActiveMode,
    setCurrentView
}: NavigationSectionProps) {
    if (currentView === 'library' || currentView === 'organizer' || currentView === 'smart_folders' || currentView === 'materials') {
        return (
            <div className="flex flex-col gap-1 px-3">
                <span className="text-[10px] text-[#7f826f] font-semibold mb-1 px-3">Navigation</span>
                <button onClick={() => setCurrentView('library')} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-medium transition-colors ring-1 shadow-sm ${currentView === 'library' ? 'bg-[#151818] text-[#f2f2ef] ring-white/[0.06]' : 'text-[#b8b59f] bg-transparent ring-transparent hover:bg-white/[0.02] hover:text-[#f2f2ef]'}`}>
                    <div className="w-8 h-8 rounded-xl bg-white/[0.035] flex items-center justify-center">
                        <LayoutGrid className="w-4.5 h-4.5 text-[#fde400]" />
                    </div>
                    <span className="text-[13px]">Library</span>
                </button>
                <button onClick={() => setCurrentView('organizer')} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-medium transition-colors ring-1 shadow-sm ${currentView === 'organizer' ? 'bg-[#151818] text-[#f2f2ef] ring-white/[0.06]' : 'text-[#b8b59f] bg-transparent ring-transparent hover:bg-white/[0.02] hover:text-[#f2f2ef]'}`}>
                    <div className="w-8 h-8 rounded-xl bg-white/[0.035] flex items-center justify-center">
                        <Shapes className="w-4.5 h-4.5 text-[#4de082]" />
                    </div>
                    <span className="text-[13px]">Organizer</span>
                </button>
                <button onClick={() => setCurrentView('smart_folders')} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-medium transition-colors ring-1 shadow-sm ${currentView === 'smart_folders' ? 'bg-[#151818] text-[#f2f2ef] ring-white/[0.06]' : 'text-[#b8b59f] bg-transparent ring-transparent hover:bg-white/[0.02] hover:text-[#f2f2ef]'}`}>
                    <div className="w-8 h-8 rounded-xl bg-white/[0.035] flex items-center justify-center">
                        <Boxes className="w-4.5 h-4.5 text-[#78d7ff]" />
                    </div>
                    <span className="text-[13px]">Smart Folders</span>
                </button>
                <button onClick={() => setCurrentView('materials')} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-medium transition-colors ring-1 shadow-sm ${currentView === 'materials' ? 'bg-[#151818] text-[#f2f2ef] ring-white/[0.06]' : 'text-[#b8b59f] bg-transparent ring-transparent hover:bg-white/[0.02] hover:text-[#f2f2ef]'}`}>
                    <div className="w-8 h-8 rounded-xl bg-white/[0.035] flex items-center justify-center">
                        <SwatchBook className="w-4.5 h-4.5 text-[#f59e0b]" />
                    </div>
                    <span className="text-[13px]">Materials</span>
                </button>
                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[#b8b59f] hover:text-[#f2f2ef] hover:bg-white/[0.02] font-medium transition-colors group">
                    <div className="w-8 h-8 rounded-xl bg-transparent group-hover:bg-white/[0.035] flex items-center justify-center transition-colors">
                        <FolderOpen className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[13px]">Folders</span>
                </button>
                {Object.values(MODES).map((mode) => {
                    const Icon = mode.icon;
                    return (
                        <button key={mode.id} onClick={() => { setActiveMode(mode.id); setCurrentView('editor'); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[#b8b59f] hover:text-[#f2f2ef] hover:bg-white/[0.02] font-medium transition-colors group">
                            <div className="w-8 h-8 rounded-xl bg-transparent group-hover:bg-white/[0.035] flex items-center justify-center transition-colors">
                                <Icon className="w-4.5 h-4.5" />
                            </div>
                            <span className="text-[13px]">{mode.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col gap-1 px-3 border-b border-white/[0.04] pb-4 mb-2">
                <span className="text-[10px] text-[#7f826f] font-semibold mb-1 px-3">Navigation</span>
                <button onClick={() => setCurrentView('library')} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#b8b59f] hover:text-[#f2f2ef] hover:bg-[#151818] font-medium transition-colors border border-transparent hover:ring-1 hover:ring-white/[0.04]">
                    <ArrowLeft className="w-4.5 h-4.5 text-[#7f826f]" />
                    <span className="text-[13px]">Back to Folder</span>
                </button>
            </div>

            <div className="flex flex-col gap-1 px-3 mt-2">
                <span className="text-[10px] text-[#7f826f] font-semibold mb-1 px-3">Main Tools</span>
                {Object.values(MODES).map((mode) => {
                    const Icon = mode.icon;
                    const isActive = activeMode === mode.id;
                    return (
                        <button key={mode.id} onClick={() => setActiveMode(mode.id)} className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors border border-transparent hover:bg-white/[0.02] ${isActive ? 'bg-[#151818] ring-1 ring-white/[0.06] shadow-sm' : ''} group`}>
                            <div className="flex items-center gap-3 w-full">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/[0.035]' : 'bg-transparent group-hover:bg-white/[0.035]'}`}>
                                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#fde400]' : 'text-[#7f826f] group-hover:text-[#f2f2ef]'}`} />
                                </div>
                                <div className="flex flex-col items-start text-left">
                                    <span className={`text-[13px] font-medium ${isActive ? 'text-[#f2f2ef]' : 'text-[#b8b59f] group-hover:text-[#f2f2ef]'}`}>{mode.label}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
                
                <div className="mt-2 px-3">
                    <button className="text-[11px] text-[#7f826f] hover:text-[#b8b59f] font-medium py-1 transition-colors w-full text-left flex items-center gap-2">
                        <Plus className="w-4 h-4" /> More Tools
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-5 mt-3 px-2">
                <div className="flex justify-between items-center mb-1 px-3">
                    <span className="text-[10px] text-[#7f826f] font-semibold">Active Stack</span>
                    <button className="text-[10px] text-[#b8b59f] hover:text-[#f2f2ef] transition-colors font-medium">Manage</button>
                </div>
                <div className="flex flex-wrap gap-2 px-3">
                    <span className="px-2.5 py-1.5 bg-[#151818] ring-1 ring-white/[0.04] rounded-lg text-[10px] text-[#b8b59f] font-medium flex items-center gap-2 shadow-sm"><Maximize className="w-3.5 h-3.5 text-[#fde400]" /> Real-ESRGAN</span>
                    <span className="px-2.5 py-1.5 bg-[#151818] ring-1 ring-white/[0.04] rounded-lg text-[10px] text-[#b8b59f] font-medium flex items-center gap-2 shadow-sm"><Eraser className="w-3.5 h-3.5 text-[#4de082]" /> Remove BG</span>
                    <span className="px-2.5 py-1.5 bg-[#151818] ring-1 ring-white/[0.04] rounded-lg text-[10px] text-[#b8b59f] font-medium flex items-center gap-2 shadow-sm"><Grid className="w-3.5 h-3.5 text-[#4de082]" /> Transp. PNG</span>
                </div>
            </div>
        </>
    );
}
