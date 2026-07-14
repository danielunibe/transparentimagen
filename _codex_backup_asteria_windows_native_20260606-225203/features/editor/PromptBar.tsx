import { useState } from 'react';
import { Plus, Save, Sparkles, Wand2 } from 'lucide-react';
import { ActiveModeId } from '@/types/asteria';
import { MODES } from '@/data/modes';

interface PromptBarProps {
    activeMode: ActiveModeId | string;
    onProcess: (prompt?: string) => void;
    fileName?: string;
    onSavePng?: () => void;
}

export function PromptBar({ activeMode, onProcess, fileName, onSavePng }: PromptBarProps) {
    const mode = MODES[activeMode];
    const [prompt, setPrompt] = useState('');

    const handleProcess = () => {
        onProcess(prompt);
    };

    const placeholderText = fileName 
        ? `Describe what you want to change in ${fileName}...`
        : activeMode === 'enhance' ? mode?.placeholder : "Open an image to start editing...";

    return (
        <div className="absolute bottom-6 w-full flex justify-center z-30 pointer-events-none px-6">
            <div className="w-[65%] min-w-[600px] max-w-[800px] bg-[#040404]/90 backdrop-blur-2xl border border-[#1d1e1e] rounded-2xl p-2 shadow-2xl pointer-events-auto flex flex-col gap-2">
                
                <div className="flex items-center gap-2">
                    <button className="w-10 h-10 shrink-0 border border-[#1c1c1c] rounded-xl bg-[#000000] flex items-center justify-center text-[#b8b59f] hover:bg-[#121313] hover:text-[#f2f2ef] transition-colors">
                        <Plus className="w-5 h-5" />
                    </button>
                    <div className="flex-1 h-10 flex items-center px-4 bg-[#000000] border border-[#1c1c1c]/40 hover:border-[#2a2a2a] focus-within:border-[#fde400]/25 rounded-xl transition-colors bg-[#000000]">
                        <input 
                            type="text" 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleProcess();
                            }}
                            placeholder={placeholderText} 
                            className="w-full bg-transparent border-none outline-none font-sans text-[#f2f2ef] placeholder:text-[#7f826f] text-[13px]" 
                        />
                    </div>
                    {onSavePng && (
                        <button 
                            onClick={onSavePng}
                            className="h-10 px-4 rounded-xl bg-[#0a0b0b] border border-[#1d1e1e] text-[#b8b59f] font-bold text-[10px] uppercase tracking-widest hover:bg-[#121313] hover:text-[#f2f2ef] transition-colors shrink-0 flex items-center gap-2"
                        >
                            <Save className="w-3.5 h-3.5" /> Save PNG
                        </button>
                    )}
                    <button onClick={handleProcess} className="h-10 px-6 rounded-xl bg-[#fde400] text-[#121414] font-bold text-[11px] uppercase tracking-widest shadow-sm hover:brightness-110 transition-all shrink-0 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> {mode?.action}
                    </button>
                </div>
                
                <div className="flex items-center justify-center gap-2 px-1 pb-0.5 overflow-x-auto no-scrollbar">
                    {mode?.chips.map((chip: string, i: number) => (
                        <div key={i} className={`px-2.5 py-1 border ${i === 0 && activeMode === 'enhance' ? 'border-[#fde400]/20 text-[#fde400] bg-[#fde400]/5 hover:bg-[#fde400]/10' : 'border-[#1c1c1c] text-[#7f826f] bg-transparent hover:bg-[#121313] hover:text-[#b8b59f]'} rounded-md text-[8px] font-bold uppercase tracking-widest whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5`}>
                            {i === 0 && activeMode === 'enhance' ? <Wand2 className="w-2.5 h-2.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#1c1c1c]"></div>}
                            {chip}
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
