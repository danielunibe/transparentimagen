import { Columns, SkipBack, SkipForward, SplitSquareHorizontal, FolderOpen, RotateCcw, Palette } from 'lucide-react';
import { EditorViewMode, PreviewBgMode } from '@/types/asteria';

interface CanvasToolbarProps {
    viewMode: EditorViewMode;
    setViewMode: (mode: EditorViewMode) => void;
    hasImage: boolean;
    setHasImage: (val?: boolean) => void;
    previewBg?: PreviewBgMode;
    setPreviewBg?: (mode: PreviewBgMode) => void;
    hasAlpha?: boolean;
}

export function CanvasToolbar({ viewMode, setViewMode, hasImage, setHasImage, previewBg = 'dark', setPreviewBg, hasAlpha }: CanvasToolbarProps) {
    return (
        <div className="flex flex-wrap gap-2 justify-between items-center px-6 pt-4 pb-2 shrink-0 pointer-events-none absolute top-0 w-full z-10 transition-all">
            <div className="flex gap-1 p-1 bg-[#040404]/90 backdrop-blur-md border border-[#1d1e1e] rounded-xl pointer-events-auto shadow-xl">
                <button onClick={() => setViewMode('compare')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-colors rounded-lg ${viewMode === 'compare' ? 'text-[#121414] bg-[#fde400] shadow-sm' : 'text-[#b8b59f] hover:bg-[#121313] hover:text-[#f2f2ef]'}`}><Columns className="w-3 h-3" /> Compare</button>
                <button onClick={() => setViewMode('before')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-colors rounded-lg ${viewMode === 'before' ? 'text-[#121414] bg-[#fde400] shadow-sm' : 'text-[#b8b59f] hover:bg-[#121313] hover:text-[#f2f2ef]'}`}><SkipBack className="w-3 h-3" /> Before</button>
                <button onClick={() => setViewMode('after')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-colors rounded-lg ${viewMode === 'after' ? 'text-[#121414] bg-[#fde400] shadow-sm' : 'text-[#b8b59f] hover:bg-[#121313] hover:text-[#f2f2ef]'}`}><SkipForward className="w-3 h-3" /> After</button>
                <button onClick={() => setViewMode('split')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-colors rounded-lg ${viewMode === 'split' ? 'text-[#121414] bg-[#fde400] shadow-sm' : 'text-[#b8b59f] hover:bg-[#121313] hover:text-[#f2f2ef]'}`}><SplitSquareHorizontal className="w-3 h-3" /> Split A/B</button>
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
                {hasAlpha && setPreviewBg && (
                    <div className="flex gap-1 mr-2 p-1 bg-[#040404]/90 backdrop-blur-md border border-[#1d1e1e] rounded-xl shadow-xl items-center">
                        <Palette className="w-3.5 h-3.5 text-[#b8b59f] ml-2 mr-1" />
                        <button onClick={() => setPreviewBg('dark')} className={`w-5 h-5 rounded-md border transition-all ${previewBg === 'dark' ? 'border-[#fde400] scale-110' : 'border-transparent opacity-60'} bg-[#1a1a1a]`} title="Dark" />
                        <button onClick={() => setPreviewBg('checkerboard')} className={`w-5 h-5 rounded-md border transition-all ${previewBg === 'checkerboard' ? 'border-[#fde400] scale-110' : 'border-transparent opacity-60'} bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc)] bg-[length:8px_8px] bg-[position:0_0,4px_4px] bg-white`} title="Checkerboard" />
                        <button onClick={() => setPreviewBg('white')} className={`w-5 h-5 rounded-md border transition-all ${previewBg === 'white' ? 'border-[#fde400] scale-110' : 'border-transparent opacity-60'} bg-white`} title="White" />
                        <button onClick={() => setPreviewBg('black')} className={`w-5 h-5 rounded-md border transition-all ${previewBg === 'black' ? 'border-[#fde400] scale-110' : 'border-transparent opacity-60'} bg-black`} title="Black" />
                    </div>
                )}
                <button onClick={() => setHasImage(!hasImage)} className="flex items-center gap-2 px-4 py-1.5 bg-[#040404]/90 backdrop-blur-md border border-[#1d1e1e] text-[#b8b59f] text-[9px] font-bold rounded-xl uppercase tracking-widest hover:text-[#f2f2ef] transition-colors shadow-xl">
                    <FolderOpen className="w-3.5 h-3.5" /> Open
                </button>
                <button onClick={() => setHasImage(!hasImage)} className="flex items-center gap-2 px-4 py-1.5 bg-[#040404]/90 backdrop-blur-md border border-[#1d1e1e] text-[#b8b59f] text-[9px] font-bold rounded-xl uppercase tracking-widest hover:text-[#f2f2ef] transition-colors shadow-xl">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
            </div>
        </div>
    );
}
