import { LocalUpscaleModelInfo, LocalUpscaleModelStatus } from '@/types/asteria';
import { isTauriAvailable, listPythonModels, openModelsFolder, smokeTestPythonUpscaleModel, validatePythonModels } from './tauriBridge';

const DESKTOP_ONLY_MESSAGE = 'Local model management requires desktop mode.';

export interface LocalModelListResult {
    ok: boolean;
    status?: string;
    message?: string;
    modelsDir?: string;
    models: LocalUpscaleModelInfo[];
    realEsrganStatus?: string;
}

function createUnsupportedResult(): LocalModelListResult {
    return {
        ok: false,
        status: 'unsupported',
        message: DESKTOP_ONLY_MESSAGE,
        models: []
    };
}

export async function listLocalModels(): Promise<LocalModelListResult> {
    if (!isTauriAvailable()) return createUnsupportedResult();
    const result = await listPythonModels();
    return {
        ok: !!result?.ok,
        status: result?.status,
        message: result?.message,
        modelsDir: result?.modelsDir,
        models: Array.isArray(result?.models) ? result.models : [],
        realEsrganStatus: result?.realEsrganStatus
    };
}

export async function validateLocalModels(): Promise<LocalModelListResult> {
    if (!isTauriAvailable()) return createUnsupportedResult();
    const result = await validatePythonModels();
    return {
        ok: !!result?.ok,
        status: result?.status,
        message: result?.message,
        modelsDir: result?.modelsDir,
        models: Array.isArray(result?.models) ? result.models : [],
        realEsrganStatus: result?.realEsrganStatus
    };
}

export async function smokeTestUpscaleModel(modelId: string): Promise<any> {
    if (!isTauriAvailable()) return { ok: false, status: 'unsupported', message: DESKTOP_ONLY_MESSAGE };
    return await smokeTestPythonUpscaleModel(modelId);
}

export async function openLocalModelsFolder(): Promise<any> {
    if (!isTauriAvailable()) return { ok: false, status: 'unsupported', message: DESKTOP_ONLY_MESSAGE };
    return await openModelsFolder();
}

export function getModelStatusLabel(status?: string): string {
    switch (status) {
        case 'available': return 'Available';
        case 'missing': return 'Missing';
        case 'invalid': return 'Invalid';
        case 'untested': return 'Untested';
        case 'dependency_missing': return 'Dependency Missing';
        case 'inference_failed': return 'Inference Failed';
        case 'model_missing': return 'Model Missing';
        case 'model_invalid': return 'Model Invalid';
        default: return status || 'Unknown';
    }
}

export function getModelStatusTone(status?: string): string {
    switch (status as LocalUpscaleModelStatus | string | undefined) {
        case 'available': return 'text-[#4de082] bg-[#4de082]/10';
        case 'missing':
        case 'untested':
        case 'model_missing':
            return 'text-[#7f826f] bg-white/[0.04]';
        case 'dependency_missing':
        case 'invalid':
        case 'model_invalid':
        case 'inference_failed':
            return 'text-[#f59e0b] bg-[#f59e0b]/10';
        default:
            return 'text-[#7f826f] bg-white/[0.04]';
    }
}
