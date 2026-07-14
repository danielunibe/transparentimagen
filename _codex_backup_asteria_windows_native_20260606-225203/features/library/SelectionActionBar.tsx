import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BatchUpscaleOptions, GalleryItem, LocalUpscaleModelInfo } from '@/types/asteria';
import { hasTauri } from '@/services/runtimeService';
import { getPythonSidecarCapabilities } from '@/services/tauriBridge';

interface SelectionActionBarProps {
    selectedCount: number;
    selectedItem: GalleryItem | null;
    onEdit?: () => void;
    onEnhance?: () => void;
    onRemoveBg?: () => void;
    onUpscale?: (options?: { upscale?: BatchUpscaleOptions }) => void;
    onPortrait?: () => void;
    onUe5?: () => void;
    onSavePng?: () => void;
    onExportSvg?: () => void;
    onLocate?: () => void;
    onOpenFolder?: () => void;
    onRescanFolder?: () => void;
    onInfo?: () => void;
    onClearSelection?: () => void;
    onBatchFeedback?: (msg: string) => void;
    onBatchExportPng?: () => void;
    onBatchExportSvg?: () => void;
    onBatchAction?: (action: string, presetId?: string, presetLabel?: string, options?: { upscale?: BatchUpscaleOptions }) => void;
    onPackageExport?: () => void;
}

export function SelectionActionBar({ 
    selectedCount, 
    selectedItem,
    onEdit,
    onEnhance,
    onRemoveBg,
    onUpscale,
    onPortrait,
    onUe5,
    onSavePng,
    onExportSvg,
    onLocate,
    onOpenFolder,
    onRescanFolder,
    onInfo,
    onClearSelection,
    onBatchFeedback,
    onBatchExportPng,
    onBatchExportSvg,
    onBatchAction,
    onPackageExport
}: SelectionActionBarProps) {
    const [batchUpscaleScale, setBatchUpscaleScale] = useState<2 | 3 | 4>(2);
    const [batchUpscaleEngine, setBatchUpscaleEngine] = useState<BatchUpscaleOptions['engine']>('auto');
    const [batchUpscaleQuality, setBatchUpscaleQuality] = useState<NonNullable<BatchUpscaleOptions['qualityPreset']>>('balanced');
    const [batchTileSize, setBatchTileSize] = useState<64 | 128 | 192 | 256>(128);
    const [batchTilePad, setBatchTilePad] = useState<4 | 8 | 12 | 16>(8);
    const [batchModelId, setBatchModelId] = useState<string>('');
    const [singleUpscaleScale, setSingleUpscaleScale] = useState<2 | 3 | 4>(2);
    const [singleUpscaleEngine, setSingleUpscaleEngine] = useState<BatchUpscaleOptions['engine']>('auto');
    const [singleUpscaleQuality, setSingleUpscaleQuality] = useState<NonNullable<BatchUpscaleOptions['qualityPreset']>>('balanced');
    const [singleTileSize, setSingleTileSize] = useState<64 | 128 | 192 | 256>(128);
    const [singleTilePad, setSingleTilePad] = useState<4 | 8 | 12 | 16>(8);
    const [singleModelId, setSingleModelId] = useState<string>('');
    const [realEsrganReady, setRealEsrganReady] = useState(false);
    const [realEsrganStatus, setRealEsrganStatus] = useState<string | undefined>(undefined);
    const [recommendedModelId, setRecommendedModelId] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<LocalUpscaleModelInfo[]>([]);

    useEffect(() => {
        if (!hasTauri()) return;
        getPythonSidecarCapabilities().then(result => {
            const caps = result?.capabilities || {};
            setRealEsrganReady(!!caps.realEsrgan);
            setRealEsrganStatus(caps.realEsrganStatus);
            setRecommendedModelId(caps.recommendedUpscaleModelId || '');
            setAvailableModels(Array.isArray(caps.realEsrganModels) ? caps.realEsrganModels : []);
        }).catch(() => undefined);
    }, []);

    const realEsrganTitle = realEsrganReady
        ? 'Real-ESRGAN available'
        : realEsrganStatus === 'dependency_missing'
            ? 'Install optional Real-ESRGAN dependencies first.'
            : 'Place a supported ONNX model in sidecars/python-ai/models.';

    if (selectedCount === 0 || !selectedItem) return null;

    const isImage = selectedItem.kind === 'image';
    const isFolder = selectedItem.kind === 'folder';
    const isMultiple = selectedCount > 1;
    const effectiveBatchModelId = batchModelId || recommendedModelId || undefined;
    const effectiveSingleModelId = singleModelId || recommendedModelId || undefined;

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#101212]/92 backdrop-blur-3xl ring-1 ring-white/[0.04] rounded-full p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)] z-30 pointer-events-auto">
            <span className="text-[#f2f2ef] font-medium text-[12px] ml-3 mr-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#fde400]" />
                {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </span>
            <div className="h-5 w-px bg-white/[0.06] mx-2"></div>
            
            {isMultiple ? (
                <>
                    <select 
                        onChange={(e) => {
                            if (e.target.value && onBatchAction) {
                                const opt = e.target.options[e.target.selectedIndex];
                                onBatchAction('apply_preset', e.target.value, opt.text);
                                e.target.value = '';
                            }
                        }}
                        className="bg-transparent text-[#b8b59f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef] pr-2"
                        defaultValue=""
                    >
                        <option value="" disabled>Presets...</option>
                        <option value="preset_clean">Clean Boost</option>
                        <option value="preset_moody">Moody Film</option>
                        <option value="preset_bw">B&W Film</option>
                        <option value="preset_vintage">Vintage Warm</option>
                        <option value="preset_neon">Cyber Neon</option>
                        <option value="preset_crisp">Crisp Detail</option>
                    </select>

                    <div className="h-4 w-px bg-white/[0.06] mx-1"></div>

                    <button 
                         onClick={() => onBatchAction ? onBatchAction('enhance') : null} 
                         className="flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors"
                    >
                        Enhance
                    </button>
                    
                    <button 
                         onClick={() => onBatchAction ? onBatchAction('portrait') : null} 
                         className="flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors"
                    >
                        Portrait
                    </button>
                    
                    <button 
                         onClick={() => {
                             if (!hasTauri()) {
                                 onBatchFeedback && onBatchFeedback("Background removal requires native Python sidecar.");
                                 return;
                             }
                             onBatchAction && onBatchAction('remove_bg');
                         }} 
                         className="flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors"
                    >
                        Remove BG
                    </button>
                    
                    <button 
                         onClick={() => onBatchAction ? onBatchAction('ue5') : null} 
                         className="flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors"
                    >
                        UE5
                    </button>

                    <div className="h-4 w-px bg-white/[0.06] mx-1"></div>

                     <select
                        value={batchUpscaleScale}
                        onChange={(event) => setBatchUpscaleScale(Number(event.target.value) as 2 | 3 | 4)}
                        className="bg-transparent text-[#b8b59f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                        title="Batch upscale scale"
                    >
                        <option value={2}>2x</option>
                        <option value={3}>3x</option>
                        <option value={4}>4x</option>
                     </select>

                     <select
                         value={batchUpscaleEngine}
                         onChange={(event) => setBatchUpscaleEngine(event.target.value as BatchUpscaleOptions['engine'])}
                         className="bg-transparent text-[#b8b59f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                         title="Batch upscale engine"
                     >
                         <option value="auto">Auto</option>
                         <option value="pillow">Pillow</option>
                         <option value="real-esrgan" disabled={!realEsrganReady}>Real-ESRGAN</option>
                     </select>

                     <select
                        value={batchUpscaleQuality}
                        onChange={(event) => setBatchUpscaleQuality(event.target.value as NonNullable<BatchUpscaleOptions['qualityPreset']>)}
                        className="bg-transparent text-[#b8b59f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                        title="Batch upscale quality preset"
                     >
                        <option value="fast">Fast</option>
                        <option value="balanced">Balanced</option>
                        <option value="quality">Quality</option>
                        <option value="max">Max</option>
                     </select>

                     <select
                        value={batchTileSize}
                        onChange={(event) => setBatchTileSize(Number(event.target.value) as 64 | 128 | 192 | 256)}
                        className="bg-transparent text-[#7f826f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                        title="Batch tile size"
                     >
                        <option value={64}>Tile 64</option>
                        <option value={128}>Tile 128</option>
                        <option value={192}>Tile 192</option>
                        <option value={256}>Tile 256</option>
                     </select>

                     <select
                        value={batchTilePad}
                        onChange={(event) => setBatchTilePad(Number(event.target.value) as 4 | 8 | 12 | 16)}
                        className="bg-transparent text-[#7f826f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                        title="Batch tile pad"
                     >
                        <option value={4}>Pad 4</option>
                        <option value={8}>Pad 8</option>
                        <option value={12}>Pad 12</option>
                        <option value={16}>Pad 16</option>
                     </select>

                     <select
                        value={batchModelId}
                        onChange={(event) => setBatchModelId(event.target.value)}
                        className="bg-transparent text-[#7f826f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef] max-w-[120px]"
                        title="Batch Real-ESRGAN model"
                     >
                        <option value="">Model Auto</option>
                        {availableModels.map(model => (
                            <option key={model.id} value={model.id}>{model.label}</option>
                        ))}
                     </select>

                     <button
                          onClick={() => {
                              if (!hasTauri()) {
                                  onBatchFeedback && onBatchFeedback("Batch upscale requires the local Python sidecar.");
                                  return;
                              }
                              onBatchAction && onBatchAction(
                                  'upscale',
                                  String(batchUpscaleScale),
                                  `${batchUpscaleScale}x`,
                                  {
                                      upscale: {
                                          scale: batchUpscaleScale,
                                          engine: batchUpscaleEngine,
                                          qualityPreset: batchUpscaleQuality,
                                          tileSize: batchTileSize,
                                          tilePad: batchTilePad,
                                          modelId: effectiveBatchModelId
                                      }
                                  }
                              );
                              if ((batchUpscaleEngine === 'real-esrgan' || batchUpscaleEngine === 'auto') && !realEsrganReady) {
                                  onBatchFeedback && onBatchFeedback("Batch upscale will fall back to Pillow until a supported Real-ESRGAN model is available.");
                              } else if (batchUpscaleEngine === 'pillow') {
                                  onBatchFeedback && onBatchFeedback("Pillow upscale ignores tile and model controls.");
                              }
                          }}
                         className="flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors"
                    >
                        Batch Upscale
                    </button>

                    <div className="h-4 w-px bg-white/[0.06] mx-1"></div>

                    <button 
                         onClick={() => onBatchAction ? onBatchAction('export_png') : null} 
                         className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]"
                    >
                        Export PNG
                    </button>
                    
                    <button 
                         onClick={onPackageExport} 
                         className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-[rgba(77,224,130,0.3)] shadow-sm"
                    >
                        {hasTauri() ? 'Package Export to Folder' : 'Package Export'}
                    </button>

                    <button 
                         onClick={onClearSelection} 
                         className="flex items-center justify-center px-3 py-2 bg-transparent text-[#e65c5c] font-semibold text-[11px] rounded-xl hover:bg-[#201010] hover:text-[#ff7474] transition-colors" title="Clear selection"
                    >
                        <X className="w-3.5 h-3.5 mr-1" /> Clear
                    </button>
                </>
            ) : isImage ? (
                <>
                    {onEdit && (
                        <button onClick={onEdit} className="flex items-center gap-1.5 px-4 py-2 bg-[#fde400] text-[#121414] font-bold text-[11px] rounded-xl hover:brightness-110 transition-all shadow-sm">
                            Edit
                        </button>
                    )}
                    {onEnhance && (
                        <button onClick={onEnhance} className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                            Enhance
                        </button>
                    )}
                    {onRemoveBg && (
                        <button onClick={onRemoveBg} className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                            Remove BG
                        </button>
                    )}
                    {onUpscale && (
                        <>
                            <select
                                value={singleUpscaleScale}
                                onChange={(event) => setSingleUpscaleScale(Number(event.target.value) as 2 | 3 | 4)}
                                className="bg-transparent text-[#b8b59f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                                title="Upscale scale"
                            >
                                <option value={2}>2x</option>
                                <option value={3}>3x</option>
                                <option value={4}>4x</option>
                            </select>
                            <select
                                value={singleUpscaleEngine}
                                onChange={(event) => setSingleUpscaleEngine(event.target.value as BatchUpscaleOptions['engine'])}
                                className="bg-transparent text-[#b8b59f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                                title="Upscale engine"
                            >
                                <option value="auto">Auto</option>
                                <option value="pillow">Pillow</option>
                                <option value="real-esrgan" disabled={!realEsrganReady} title={realEsrganTitle}>Real-ESRGAN</option>
                            </select>
                            <select
                                value={singleUpscaleQuality}
                                onChange={(event) => setSingleUpscaleQuality(event.target.value as NonNullable<BatchUpscaleOptions['qualityPreset']>)}
                                className="bg-transparent text-[#b8b59f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                                title="Upscale quality preset"
                            >
                                <option value="fast">Fast</option>
                                <option value="balanced">Balanced</option>
                                <option value="quality">Quality</option>
                                <option value="max">Max</option>
                            </select>
                            <select
                                value={singleTileSize}
                                onChange={(event) => setSingleTileSize(Number(event.target.value) as 64 | 128 | 192 | 256)}
                                className="bg-transparent text-[#7f826f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                                title="Upscale tile size"
                            >
                                <option value={64}>Tile 64</option>
                                <option value={128}>Tile 128</option>
                                <option value={192}>Tile 192</option>
                                <option value={256}>Tile 256</option>
                            </select>
                            <select
                                value={singleTilePad}
                                onChange={(event) => setSingleTilePad(Number(event.target.value) as 4 | 8 | 12 | 16)}
                                className="bg-transparent text-[#7f826f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef]"
                                title="Upscale tile pad"
                            >
                                <option value={4}>Pad 4</option>
                                <option value={8}>Pad 8</option>
                                <option value={12}>Pad 12</option>
                                <option value={16}>Pad 16</option>
                            </select>
                            <select
                                value={singleModelId}
                                onChange={(event) => setSingleModelId(event.target.value)}
                                className="bg-transparent text-[#7f826f] font-semibold text-[11px] outline-none cursor-pointer hover:text-[#f2f2ef] max-w-[120px]"
                                title="Real-ESRGAN model"
                            >
                                <option value="">Model Auto</option>
                                {availableModels.map(model => (
                                    <option key={model.id} value={model.id}>{model.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => onUpscale({
                                    upscale: {
                                        scale: singleUpscaleScale,
                                        engine: singleUpscaleEngine,
                                        qualityPreset: singleUpscaleQuality,
                                        tileSize: singleTileSize,
                                        tilePad: singleTilePad,
                                        modelId: effectiveSingleModelId
                                    }
                                })}
                                className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]"
                            >
                                Upscale {singleUpscaleScale}x
                            </button>
                            {!realEsrganReady && (
                                <span className="text-[10px] text-[#7f826f]" title={realEsrganTitle}>
                                    {realEsrganStatus === 'dependency_missing' ? 'Install dependencies first' : 'Model required'}
                                </span>
                            )}
                        </>
                    )}
                    {onPortrait && (
                        <button onClick={onPortrait} className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                            Portrait
                        </button>
                    )}
                    {onUe5 && (
                        <button onClick={onUe5} className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                            UE5
                        </button>
                    )}
                    {onSavePng && (
                        <button onClick={onSavePng} className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                            Save PNG
                        </button>
                    )}
                    {onExportSvg && (
                        <button onClick={onExportSvg} className="flex items-center gap-1.5 px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors" title="Export as SVG container">
                            SVG
                        </button>
                    )}
                    {onLocate && (
                        <button onClick={onLocate} className="flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors">
                            Locate
                        </button>
                    )}
                </>
            ) : isFolder ? (
                <>
                    {onOpenFolder && (
                        <button onClick={onOpenFolder} className="flex items-center gap-1.5 px-4 py-2 bg-[#fde400] text-[#121414] font-bold text-[11px] rounded-xl hover:brightness-110 transition-all shadow-sm">
                            Open
                        </button>
                    )}
                    {onRescanFolder && (
                        <button onClick={onRescanFolder} className="flex items-center gap-1.5 px-3 py-2 bg-[#151818] text-[#f2f2ef] font-semibold text-[11px] rounded-xl hover:bg-[#1a1c1c] transition-colors ring-1 ring-transparent hover:ring-white/[0.04]">
                            Rescan
                        </button>
                    )}
                    {onLocate && (
                        <button onClick={onLocate} className="flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors">
                            Locate
                        </button>
                    )}
                </>
            ) : null}

            {onInfo && !isMultiple && (
                <button onClick={onInfo} className="xl:hidden flex items-center justify-center px-3 py-2 bg-transparent text-[#b8b59f] font-semibold text-[11px] rounded-xl hover:bg-[#151818] hover:text-[#f2f2ef] transition-colors" title="Show details">
                    Info
                </button>
            )}
        </div>
    );
}
