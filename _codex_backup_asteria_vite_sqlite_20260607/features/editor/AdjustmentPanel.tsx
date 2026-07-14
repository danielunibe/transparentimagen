import { useState, useEffect } from 'react';
import { SlidersHorizontal, RotateCw, Check, Undo2, Redo2, Columns, Save } from 'lucide-react';
import { ImageAdjustmentSettings, EditorViewMode, ImageAdjustmentPreset } from '@/types/asteria';
import { getAllPresets, saveCustomPreset } from '@/services/adjustmentPresetService';

interface AdjustmentPanelProps {
    settings: ImageAdjustmentSettings;
    setSetting: (key: keyof ImageAdjustmentSettings, value: number) => void;
    onReset: () => void;
    onApply: () => void;
    isRendering: boolean;
    hasAdjustments: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    compareMode: EditorViewMode;
    setCompareMode: (m: EditorViewMode) => void;
    activePreset: ImageAdjustmentPreset | null;
    applyPreset: (p: ImageAdjustmentPreset) => void;
}

export function AdjustmentPanel({
    settings,
    setSetting,
    onReset,
    onApply,
    isRendering,
    hasAdjustments,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    compareMode,
    setCompareMode,
    activePreset,
    applyPreset
}: AdjustmentPanelProps) {
    const [presets, setPresets] = useState<ImageAdjustmentPreset[]>([]);
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [presetName, setPresetName] = useState('');

    useEffect(() => {
        // Load presets on mount, timeout 0 solves sync state update warning
        const timer = setTimeout(() => {
            setPresets(getAllPresets());
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const handleSavePreset = () => {
        if (!presetName) return;
        const newPreset: ImageAdjustmentPreset = {
            id: `custom_${Date.now()}`,
            label: presetName,
            settings: { ...settings },
            createdAt: new Date().toISOString(),
            builtIn: false
        };
        saveCustomPreset(newPreset);
        setPresets(getAllPresets());
        setIsSavingPreset(false);
        setPresetName('');
    };

    const renderSlider = (label: string, key: keyof ImageAdjustmentSettings, value: number, min: number = -50, max: number = 50) => (
        <div className="flex flex-col gap-1.5 mb-3 group">
            <div className="flex items-center justify-between">
                <label className="text-[10px] text-[#b8b59f] font-medium tracking-wide uppercase">{label}</label>
                <span className={`text-[10px] font-mono w-8 text-right ${value === 0 ? 'text-[#7f826f]' : 'text-[#f2f2ef]'}`}>
                    {value > 0 ? `+${value}` : value}
                </span>
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                value={value}
                onChange={(e) => setSetting(key, parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[#1d1e1e] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#f2f2ef] cursor-ew-resize hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
            />
        </div>
    );

    return (
        <div className="w-56 bg-[#0a0b0b]/90 backdrop-blur-md rounded-xl border border-[#1d1e1e] overflow-hidden flex flex-col shadow-2xl h-[calc(100vh-100px)]">
            <div className="px-3 py-2 border-b border-[#1d1e1e] flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between select-none">
                    <div className="flex items-center gap-1.5 text-[#f2f2ef] text-[11px] font-bold tracking-wider uppercase">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#7f826f]" />
                        Adjustments
                    </div>
                    <div className="flex items-center gap-1">
                        <button disabled={!canUndo} onClick={onUndo} className="p-1 text-[#7f826f] hover:text-[#f2f2ef] disabled:opacity-30"><Undo2 className="w-3.5 h-3.5" /></button>
                        <button disabled={!canRedo} onClick={onRedo} className="p-1 text-[#7f826f] hover:text-[#f2f2ef] disabled:opacity-30"><Redo2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {isRendering && (
                        <div className="w-2 h-2 rounded-full border border-[#fde400] border-t-transparent animate-spin"></div>
                    )}
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-4">
                
                {/* Presets Grid */}
                <div className="flex flex-col gap-2">
                    <label className="text-[9px] text-[#7f826f] font-bold tracking-widest uppercase">Presets</label>
                    <div className="grid grid-cols-2 gap-1.5">
                        {presets.map(p => (
                            <button
                                key={p.id}
                                onClick={() => applyPreset(p)}
                                className={`text-[9px] py-1 px-1.5 rounded truncate text-left transition-colors border ${activePreset?.id === p.id ? 'bg-[#fde400]/10 border-[#fde400]/30 text-[#fde400]' : 'bg-[#151818] hover:bg-[#1d1e1e] border-[#1d1e1e] text-[#b8b59f]'}`}
                                title={p.description || p.label}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-col gap-1 hidden"></div>

                <div className="flex flex-col">
                    <label className="text-[9px] text-[#7f826f] font-bold tracking-widest uppercase mb-3">Controls</label>
                    {renderSlider('Brightness', 'brightness', settings.brightness)}
                    {renderSlider('Contrast', 'contrast', settings.contrast)}
                    {renderSlider('Saturation', 'saturation', settings.saturation)}
                    {renderSlider('Warmth', 'warmth', settings.warmth)}
                    {renderSlider('Sharpness', 'sharpness', settings.sharpness, 0, 50)}
                </div>
            </div>

            {(hasAdjustments) && (
                <div className="shrink-0 flex flex-col border-t border-[#1d1e1e]">
                    
                    {/* Compare mode */}
                    <div className="flex items-center justify-between p-2 pb-0 gap-1">
                        <button onClick={() => setCompareMode('before')} className={`flex-1 text-[9px] uppercase tracking-wider font-bold py-1 rounded transition-colors ${compareMode === 'before' ? 'bg-[#1d1e1e] text-[#f2f2ef]' : 'text-[#7f826f] hover:bg-[#151818]'}`}>Before</button>
                        <button onClick={() => setCompareMode('split')} className={`flex-1 text-[9px] uppercase tracking-wider font-bold py-1 rounded transition-colors flex items-center justify-center ${compareMode === 'split' ? 'bg-[#1d1e1e] text-[#f2f2ef]' : 'text-[#7f826f] hover:bg-[#151818]'}`}><Columns className="w-3 h-3" /></button>
                        <button onClick={() => setCompareMode('after')} className={`flex-1 text-[9px] uppercase tracking-wider font-bold py-1 rounded transition-colors ${compareMode === 'after' ? 'bg-[#1d1e1e] text-[#f2f2ef]' : 'text-[#7f826f] hover:bg-[#151818]'}`}>After</button>
                    </div>

                     <div className="p-2 flex gap-2 w-full">
                        <button 
                            onClick={() => setIsSavingPreset(!isSavingPreset)}
                            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${isSavingPreset ? 'bg-[#fde400] text-black' : 'bg-[#151818] hover:bg-[#1d1e1e] text-[#f2f2ef]'}`}
                            title="Save as custom preset"
                        >
                            <Save className="w-3 h-3" /> Save Preset
                        </button>
                     </div>
                     
                     {isSavingPreset && (
                         <div className="px-2 pb-2 flex gap-1">
                             <input 
                                 type="text" 
                                 value={presetName}
                                 onChange={e => setPresetName(e.target.value)}
                                 placeholder="Preset Name"
                                 className="flex-1 bg-[#151818] border border-[#1d1e1e] rounded px-2 text-[10px] text-[#f2f2ef] outline-none focus:border-[#fde400]/50"
                                 autoFocus
                                 onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                             />
                             <button onClick={handleSavePreset} disabled={!presetName} className="bg-[#fde400] text-black px-2 rounded text-[10px] font-bold disabled:opacity-50">OK</button>
                         </div>
                     )}

                    <div className="p-2 pt-0 flex gap-2">
                        <button 
                            onClick={onReset}
                            className="flex-1 py-1.5 flex items-center justify-center gap-1.5 bg-[#151818] hover:bg-[#1d1e1e] text-[#f2f2ef] rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                            <RotateCw className="w-3 h-3 text-[#7f826f]" /> Reset
                        </button>
                        <button 
                            onClick={onApply}
                            className="flex-1 py-1.5 flex items-center justify-center gap-1.5 bg-[#fde400] hover:bg-[#ffe92b] text-black rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                            <Check className="w-3 h-3" /> Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
