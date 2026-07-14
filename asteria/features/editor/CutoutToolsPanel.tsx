import { Check, Scissors } from 'lucide-react';
import { CutoutRefinementSettings, TransparentPreviewBackground } from '@/types/asteria';

interface CutoutToolsPanelProps {
    previewBackground: TransparentPreviewBackground;
    setPreviewBackground: (value: TransparentPreviewBackground) => void;
    settings: CutoutRefinementSettings;
    setSetting: <K extends keyof CutoutRefinementSettings>(key: K, value: CutoutRefinementSettings[K]) => void;
    onApply: () => void;
    isRendering: boolean;
    hasAdjustments: boolean;
}

const backgroundOptions: Array<{ id: TransparentPreviewBackground; label: string; className: string }> = [
    { id: 'checkerboard', label: 'Checker', className: 'bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc)] bg-[length:8px_8px] bg-[position:0_0,4px_4px] bg-white' },
    { id: 'white', label: 'White', className: 'bg-white' },
    { id: 'black', label: 'Black', className: 'bg-black' },
    { id: 'dark', label: 'Dark', className: 'bg-[#1a1a1a]' }
];

export function CutoutToolsPanel({
    previewBackground,
    setPreviewBackground,
    settings,
    setSetting,
    onApply,
    isRendering,
    hasAdjustments
}: CutoutToolsPanelProps) {
    return (
        <div className="w-60 bg-[#0a0b0b]/95 backdrop-blur-xl rounded-xl border border-[#1d1e1e] overflow-hidden flex flex-col shadow-2xl mt-4">
            <div className="px-3 py-2 border-b border-[#1d1e1e] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#f2f2ef] text-[11px] font-bold tracking-wider uppercase">
                    <Scissors className="w-3.5 h-3.5 text-[#7f826f]" />
                    Cutout Tools
                </div>
                {isRendering && <div className="w-2 h-2 rounded-full border border-[#fde400] border-t-transparent animate-spin" />}
            </div>

            <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] text-[#7f826f] font-bold tracking-widest uppercase">Preview Background</span>
                    <div className="grid grid-cols-4 gap-1.5">
                        {backgroundOptions.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setPreviewBackground(option.id)}
                                className={`h-8 rounded-lg border transition-all ${previewBackground === option.id ? 'border-[#fde400] scale-[1.03]' : 'border-[#1d1e1e] opacity-80 hover:opacity-100'} ${option.className}`}
                                title={option.label}
                            />
                        ))}
                    </div>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[10px] text-[#b8b59f] font-medium tracking-wide uppercase">Trim Transparent Pixels</span>
                    <input
                        type="checkbox"
                        checked={settings.trimTransparentPixels}
                        onChange={(event) => setSetting('trimTransparentPixels', event.target.checked)}
                    />
                </label>

                <RangeControl
                    label="Padding"
                    value={settings.padding}
                    min={0}
                    max={200}
                    suffix="px"
                    onChange={(value) => setSetting('padding', value)}
                />

                <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[10px] text-[#b8b59f] font-medium tracking-wide uppercase">Shadow Preview</span>
                    <input
                        type="checkbox"
                        checked={settings.shadowPreview}
                        onChange={(event) => setSetting('shadowPreview', event.target.checked)}
                    />
                </label>

                {settings.shadowPreview && (
                    <>
                        <RangeControl
                            label="Shadow Opacity"
                            value={Math.round(settings.shadowOpacity * 100)}
                            min={0}
                            max={80}
                            suffix="%"
                            onChange={(value) => setSetting('shadowOpacity', value / 100)}
                        />
                        <RangeControl
                            label="Shadow Blur"
                            value={settings.shadowBlur}
                            min={0}
                            max={80}
                            suffix="px"
                            onChange={(value) => setSetting('shadowBlur', value)}
                        />
                    </>
                )}
            </div>

            <div className="p-2 border-t border-[#1d1e1e] bg-[#0a0b0b]">
                <button
                    type="button"
                    onClick={onApply}
                    disabled={!hasAdjustments || isRendering}
                    className="w-full py-1.5 px-3 bg-[#fde400] text-[#121414] text-[11px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRendering ? 'Rendering...' : <><Check className="w-3.5 h-3.5" /> Apply as Refined Cutout</>}
                </button>
            </div>
        </div>
    );
}

function RangeControl({
    label,
    value,
    min,
    max,
    suffix,
    onChange
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    suffix: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-[10px] text-[#b8b59f] font-medium tracking-wide uppercase">{label}</label>
                <span className="text-[10px] text-[#f2f2ef] font-mono">{value}{suffix}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(parseInt(event.target.value, 10))}
                className="w-full h-1 bg-[#1d1e1e] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#f2f2ef] cursor-ew-resize"
            />
        </div>
    );
}
