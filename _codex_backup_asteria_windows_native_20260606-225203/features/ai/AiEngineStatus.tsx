import { useEffect, useState } from 'react';
import { Cpu, AlertCircle } from 'lucide-react';
import { getActiveEngine } from '@/services/aiEngineService';
import { LocalAiEngineInfo } from '@/types/aiEngine';
import { LocalModelManagerPanel } from './LocalModelManagerPanel';

export function AiEngineStatus() {
    const [engine, setEngine] = useState<LocalAiEngineInfo | null>(null);

    useEffect(() => {
        let mounted = true;
        getActiveEngine().then(eng => {
            if (mounted) setEngine(eng);
        }).catch(err => {
            console.error("Failed to get active engine", err);
        });
        return () => { mounted = false; };
    }, []);

    if (!engine) return null;

    let Icon = Cpu;
    if (engine.status === 'not_configured' || engine.status === 'unavailable') {
        Icon = AlertCircle;
    }
    const upscaleEngine = engine.capabilities.upscaleEngine;
    const realEsrganStatus = engine.capabilities.realEsrganStatus;
    const realEsrganLabel = realEsrganStatus === 'available'
        ? 'Real-ESRGAN Available'
        : realEsrganStatus === 'dependency_missing'
            ? 'Real-ESRGAN Dependency Missing'
            : realEsrganStatus === 'model_missing'
                ? 'Real-ESRGAN Model Missing'
                : realEsrganStatus === 'model_invalid'
                    ? 'Real-ESRGAN Invalid'
                    : realEsrganStatus === 'inference_failed'
                        ? 'Real-ESRGAN Inference Failed'
                : 'Real-ESRGAN Pending';

    return (
        <div className="rounded-xl bg-[#151818] px-3 py-2 ring-1 ring-white/[0.04]">
            <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${engine.status === 'available' ? 'text-[#4de082]' : 'text-[#f59e0b]'}`} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-[#f2f2ef] leading-tight flex items-center gap-1.5">
                        {engine.label}
                        {engine.status === 'not_configured' && (
                            <span className="px-1.5 py-0.5 rounded-sm bg-[#f59e0b]/10 text-[#f59e0b] text-[8px] uppercase tracking-wider font-bold">
                                Not Configured
                            </span>
                        )}
                    </span>
                    <span className="text-[9px] text-[#7f826f] font-medium tracking-wide">
                        {engine.message || 'Ready for visual processing'}
                    </span>
                </div>
                
                <div className="ml-auto flex items-center gap-1.5 border-l border-white/[0.06] pl-2">
                    <CapabilityBadge label="Enhance" active={engine.capabilities.enhance} />
                    <CapabilityBadge label="RemBG" active={engine.capabilities.removeBg} pipelineReady={(engine.capabilities as any).removeBgPipelineReady} />
                    <CapabilityBadge label="Upscale" active={engine.capabilities.upscale} />
                    {engine.capabilities.upscale && upscaleEngine && (
                        <CapabilityBadge label={upscaleEngine === 'pillow_lanczos' ? 'Default Pillow LANCZOS' : `Default ${String(upscaleEngine)}`} active={true} />
                    )}
                    {engine.capabilities.upscale && (
                        <CapabilityBadge label={realEsrganLabel} active={realEsrganStatus === 'available'} />
                    )}
                </div>
            </div>
            <LocalModelManagerPanel initialStatus={realEsrganStatus} />
        </div>
    );
}

function CapabilityBadge({ label, active, pipelineReady }: { label: string, active: boolean, pipelineReady?: boolean }) {
    if (active) {
        return (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide bg-[#4de082]/10 text-[#4de082]">
                {label} (Real)
            </div>
        );
    }
    
    if (pipelineReady) {
        return (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide bg-[#f59e0b]/10 text-[#f59e0b]">
                {label} (Pipeline Ready / Model Missing)
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide bg-white/[0.04] text-[#7f826f]">
            {label}
        </div>
    );
}
