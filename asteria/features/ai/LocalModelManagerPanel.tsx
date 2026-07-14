import { useEffect, useState } from 'react';
import { LocalUpscaleModelInfo } from '@/types/asteria';
import { getModelStatusLabel, getModelStatusTone, listLocalModels, openLocalModelsFolder, smokeTestUpscaleModel, validateLocalModels } from '@/services/localModelService';

interface LocalModelManagerPanelProps {
    initialStatus?: string;
}

export function LocalModelManagerPanel({ initialStatus }: LocalModelManagerPanelProps) {
    const [models, setModels] = useState<LocalUpscaleModelInfo[]>([]);
    const [modelsDir, setModelsDir] = useState<string>('sidecars/python-ai/models');
    const [status, setStatus] = useState<string | undefined>(initialStatus);
    const [message, setMessage] = useState<string>('Asteria does not download models automatically.');
    const [busy, setBusy] = useState<'refresh' | 'validate' | 'smoke' | 'open' | null>(null);

    const refreshModels = async () => {
        setBusy('refresh');
        const result = await listLocalModels();
        setBusy(null);
        setModels(result.models);
        setModelsDir(result.modelsDir || 'sidecars/python-ai/models');
        setStatus(result.realEsrganStatus || result.status);
        setMessage(result.message || 'Asteria does not download models automatically.');
    };

    const validateModels = async () => {
        setBusy('validate');
        const result = await validateLocalModels();
        setBusy(null);
        setModels(result.models);
        setModelsDir(result.modelsDir || 'sidecars/python-ai/models');
        setStatus(result.realEsrganStatus || result.status);
        setMessage(result.message || 'Model validation completed.');
    };

    const smokeTest = async (modelId?: string) => {
        if (!modelId) return;
        setBusy('smoke');
        const result = await smokeTestUpscaleModel(modelId);
        setBusy(null);
        setMessage(result?.message || 'Smoke test finished.');
        await validateModels();
    };

    const openFolder = async () => {
        setBusy('open');
        const result = await openLocalModelsFolder();
        setBusy(null);
        setMessage(result?.message || (result?.ok ? 'Models folder opened.' : 'Unable to open models folder.'));
    };

    useEffect(() => {
        void Promise.resolve().then(refreshModels);
    }, []);

    return (
        <div className="mt-3 rounded-xl border border-white/[0.05] bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-[11px] font-semibold text-[#f2f2ef]">Local Model Manager</div>
                    <div className="mt-1 text-[10px] text-[#7f826f]">{modelsDir}</div>
                </div>
                {status && (
                    <span className={`rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${getModelStatusTone(status)}`}>
                        {getModelStatusLabel(status)}
                    </span>
                )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={openFolder} disabled={busy !== null} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-[#f2f2ef] hover:bg-white/[0.09] disabled:opacity-50">
                    Open Models Folder
                </button>
                <button onClick={refreshModels} disabled={busy !== null} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-[#f2f2ef] hover:bg-white/[0.09] disabled:opacity-50">
                    Refresh Models
                </button>
                <button onClick={validateModels} disabled={busy !== null} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-[#f2f2ef] hover:bg-white/[0.09] disabled:opacity-50">
                    Validate
                </button>
                <button
                    onClick={() => smokeTest(models.find(model => model.status === 'available')?.id || models[0]?.id)}
                    disabled={busy !== null || models.length === 0}
                    className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-[#f2f2ef] hover:bg-white/[0.09] disabled:opacity-50"
                >
                    Smoke Test
                </button>
            </div>

            <div className="mt-3 text-[10px] text-[#b8b59f]">{message}</div>

            <div className="mt-3 flex flex-col gap-2">
                {models.map(model => (
                    <div key={model.id} className="rounded-lg border border-white/[0.04] bg-[#111313] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate text-[11px] font-semibold text-[#f2f2ef]">{model.filename}</div>
                                <div className="mt-1 text-[10px] text-[#7f826f]">
                                    {model.label} • {model.scale}x
                                    {model.sizeBytes ? ` • ${model.sizeBytes} bytes` : ''}
                                </div>
                            </div>
                            <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${getModelStatusTone(model.status)}`}>
                                {getModelStatusLabel(model.status)}
                            </span>
                        </div>
                        {model.message && <div className="mt-2 text-[10px] text-[#7f826f]">{model.message}</div>}
                    </div>
                ))}
                {models.length === 0 && <div className="text-[10px] text-[#7f826f]">No supported model entries were returned.</div>}
            </div>
        </div>
    );
}
