import { LocalAiEngineInfo, LocalAiEngineKind, LocalAiEngineSettings } from '@/types/aiEngine';
import { getRuntimeCapabilities } from './runtimeService';
import { readNativeJson, writeNativeJson } from './storageService';

const AI_ENGINE_SETTINGS_KEY = 'asteria_ai_engine_settings';

export function getDefaultAiEngineSettings(): LocalAiEngineSettings {
    return {
        preferredEngine: 'browser_canvas',
        allowNativeSidecar: true, // Will be used later when sidecar is ready
        allowBrowserFallback: true
    };
}

export async function loadAiEngineSettings(): Promise<LocalAiEngineSettings> {
    return readNativeJson(AI_ENGINE_SETTINGS_KEY, getDefaultAiEngineSettings());
}

export async function saveAiEngineSettings(settings: LocalAiEngineSettings): Promise<void> {
    await writeNativeJson(AI_ENGINE_SETTINGS_KEY, settings);
}

export function getBuiltInAiEngines(): LocalAiEngineInfo[] {
    const caps = getRuntimeCapabilities();
    
    const engines: LocalAiEngineInfo[] = [
        {
            id: 'engine_browser_canvas',
            kind: 'browser_canvas',
            label: 'Browser Local Processor',
            status: 'available',
            description: 'Uses HTML5 Canvas and browser APIs. Fast but limited (no advanced AI).',
            capabilities: {
                enhance: true,
                removeBg: false,
                upscale: false,
                portrait: false,
                ue5: false,
                promptEdit: false,
                returnsImage: true,
                supportsProgress: false,
                supportsCancel: false
            }
        }
    ];

    if (caps.nativeAiSidecar) {
        engines.push({
            id: 'engine_tauri_sidecar',
            kind: 'tauri_sidecar',
            label: 'Native AI Sidecar',
            status: 'not_configured', // Not actually configured with models yet
            description: 'Runs Python/Rust local binaries for heavy AI tasks. Requires setup.',
            capabilities: {
                enhance: false,
                removeBg: false,
                upscale: false,
                portrait: false,
                ue5: false,
                promptEdit: false,
                returnsImage: true,
                supportsProgress: false,
                supportsCancel: false
            },
            message: 'Waiting for Native AI Core initialization.'
        });
    }

    return engines;
}

export async function getActiveEngine(): Promise<LocalAiEngineInfo> {
    const settings = await loadAiEngineSettings();
    const engines = getBuiltInAiEngines();
    
    // Attempt preferred
    const preferred = engines.find(e => e.kind === settings.preferredEngine);
    if (preferred) {
        const checked = await checkEngineAvailability(preferred);
        if (checked.status === 'available') return checked;
    }

    // Attempt sidecar
    const sidecarEngine = engines.find(e => e.kind === 'tauri_sidecar' || e.kind === 'python_sidecar');
    if (settings.allowNativeSidecar && sidecarEngine) {
        const checked = await checkEngineAvailability(sidecarEngine);
        if (checked.status === 'available') return checked;
        // Even if not available, if it's the only one and configured to trigger, we might return it.
        // Actually, let's keep searching.
    }
    
    // Attempt fallback
    if (settings.allowBrowserFallback) {
         const fallback = engines.find(e => e.kind === 'browser_canvas');
         if (fallback) {
             const checked = await checkEngineAvailability(fallback);
             if (checked.status === 'available') return checked;
         }
    }

    // Still try to return sidecar to show status if not available
    if (sidecarEngine) {
        return await checkEngineAvailability(sidecarEngine);
    }

    return {
        id: 'engine_none',
        kind: 'none',
        label: 'No Engine Available',
        status: 'unavailable',
        capabilities: {
            enhance: false, removeBg: false, upscale: false, portrait: false, ue5: false, promptEdit: false, returnsImage: false, supportsProgress: false, supportsCancel: false
        }
    };
}

export async function checkEngineAvailability(engine: LocalAiEngineInfo): Promise<LocalAiEngineInfo> {
    if (engine.kind === 'tauri_sidecar' || engine.kind === 'python_sidecar') {
        try {
            const { checkPythonSidecar, getPythonSidecarCapabilities } = await import('./tauriBridge');
            const [health, caps] = await Promise.all([
                checkPythonSidecar(),
                getPythonSidecarCapabilities()
            ]);
            
            if (health && health.ok) {
                return {
                    ...engine,
                    kind: 'python_sidecar',
                    label: 'Python Sidecar',
                    status: 'available',
                    message: health.message || 'Python sidecar is available.',
                    capabilities: {
                        ...engine.capabilities,
                        ...(caps?.capabilities || {})
                    }
                };
            } else {
                return { 
                     ...engine, 
                     kind: 'python_sidecar',
                     label: 'Python Sidecar',
                     status: 'not_configured', 
                     message: 'Native AI sidecar is not configured or not running.' 
                };
            }
        } catch (e) {
            return { 
                 ...engine, 
                 kind: 'python_sidecar',
                 label: 'Python Sidecar',
                 status: 'unavailable', 
                 message: 'Could not communicate with Python sidecar.' 
            };
        }
    }
    return engine;
}
