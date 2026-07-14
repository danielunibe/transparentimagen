export function isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

export async function invokeNative(command: string, payload?: any): Promise<any> {
    if (!isTauriAvailable()) {
        console.warn(`[Tauri Bridge] Attempted to invoke ${command} but Tauri is not available.`);
        return null;
    }
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke(command, payload);
    } catch (err) {
        console.error(`[Tauri Bridge] Error invoking ${command}:`, err);
        throw err;
    }
}

export async function getRuntimeInfo(): Promise<string> {
    if (!isTauriAvailable()) return 'browser';
    try {
        return await invokeNative('get_runtime_info');
    } catch {
        return 'unknown';
    }
}

export async function tauriMinimizeWindow(): Promise<void> {
    if (!isTauriAvailable()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
}

export async function tauriToggleMaximizeWindow(): Promise<void> {
    if (!isTauriAvailable()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().toggleMaximize();
    const { saveWindowState, StateFlags } = await import('@tauri-apps/plugin-window-state');
    await saveWindowState(StateFlags.ALL);
}

export async function tauriCloseWindow(): Promise<void> {
    if (!isTauriAvailable()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const { saveWindowState, StateFlags } = await import('@tauri-apps/plugin-window-state');
    await saveWindowState(StateFlags.ALL);
    await getCurrentWindow().close();
}

export async function showItemInFolder(path: string): Promise<void> {
    if (!isTauriAvailable()) return;
    return await invokeNative('show_item_in_folder', { path });
}

export async function openPath(path: string): Promise<void> {
    if (!isTauriAvailable()) return;
    return await invokeNative('open_path', { path });
}

export async function selectDirectory(options?: any): Promise<string | null> {
    if (!isTauriAvailable()) return null;
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({ directory: true, multiple: false, ...options });
    if (Array.isArray(selected)) {
        return selected.length > 0 ? selected[0] : null;
    }
    return selected;
}

export async function writeBinaryFile(path: string, bytes: Uint8Array): Promise<void> {
    if (!isTauriAvailable()) throw new Error("Tauri not available");
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(path, bytes);
}

export async function writeTextFile(path: string, text: string): Promise<void> {
    if (!isTauriAvailable()) throw new Error("Tauri not available");
    const { writeTextFile: writeText } = await import('@tauri-apps/plugin-fs');
    await writeText(path, text);
}

export async function readBinaryFile(path: string): Promise<Uint8Array> {
    if (!isTauriAvailable()) throw new Error("Tauri not available");
    const { readFile } = await import('@tauri-apps/plugin-fs');
    return await readFile(path);
}

export async function removeFile(path: string): Promise<void> {
    if (!isTauriAvailable()) return;
    try {
        const { remove } = await import('@tauri-apps/plugin-fs');
        await remove(path);
    } catch (e) {
         console.warn(`Failed to remove file ${path}:`, e);
    }
}

export async function appCacheDir(): Promise<string> {
    if (!isTauriAvailable()) throw new Error("Tauri not available");
    const { appCacheDir } = await import('@tauri-apps/api/path');
    const { exists, mkdir } = await import('@tauri-apps/plugin-fs');
    const cachePath = await appCacheDir();
    try {
        const doesExist = await exists(cachePath);
        if (!doesExist) {
            await mkdir(cachePath, { recursive: true });
        }
    } catch (e) {
        // ignore
    }
    return cachePath;
}

export async function joinPath(base: string, filename: string): Promise<string> {
    if (!isTauriAvailable()) return `${base}/${filename}`;
    const { join } = await import('@tauri-apps/api/path');
    return await join(base, filename);
}

export function ensureSafeFilename(filename: string): string {
    return filename.replace(/[\/\\?%*:|"<>]/g, '-');
}

export async function checkPythonSidecar(): Promise<any> {
    if (!isTauriAvailable()) return null;
    try {
        const resultString = await invokeNative('check_python_sidecar');
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("checkPythonSidecar failed:", e);
        return null;
    }
}

export async function getPythonSidecarCapabilities(): Promise<any> {
    if (!isTauriAvailable()) return null;
    try {
        const resultString = await invokeNative('get_python_sidecar_capabilities');
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("getPythonSidecarCapabilities failed:", e);
        return null;
    }
}

export async function listPythonModels(): Promise<any> {
    if (!isTauriAvailable()) return { ok: false, status: 'unsupported', message: 'Local model management requires desktop mode.' };
    try {
        const resultString = await invokeNative('list_python_models');
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("listPythonModels failed:", e);
        return parseNativeError(e);
    }
}

export async function validatePythonModels(): Promise<any> {
    if (!isTauriAvailable()) return { ok: false, status: 'unsupported', message: 'Local model management requires desktop mode.' };
    try {
        const resultString = await invokeNative('validate_python_models');
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("validatePythonModels failed:", e);
        return parseNativeError(e);
    }
}

export async function smokeTestPythonUpscaleModel(modelId: string): Promise<any> {
    if (!isTauriAvailable()) return { ok: false, status: 'unsupported', message: 'Local model management requires desktop mode.' };
    try {
        const resultString = await invokeNative('smoke_test_python_upscale_model', { modelId });
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("smokeTestPythonUpscaleModel failed:", e);
        return parseNativeError(e);
    }
}

export async function openModelsFolder(): Promise<any> {
    if (!isTauriAvailable()) return { ok: false, status: 'unsupported', message: 'Local model management requires desktop mode.' };
    try {
        await invokeNative('open_models_folder');
        return { ok: true, status: 'opened' };
    } catch (e) {
        console.error("openModelsFolder failed:", e);
        return parseNativeError(e);
    }
}

export async function runPythonRemoveBg(inputPath: string, outputPath: string): Promise<any> {
    if (!isTauriAvailable()) return null;
    try {
        const resultString = await invokeNative('run_python_remove_bg', { inputPath, outputPath });
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("runPythonRemoveBg failed:", e);
        return { ok: false, error: String(e) };
    }
}

export async function runPythonEnhance(inputPath: string, outputPath: string): Promise<any> {
    if (!isTauriAvailable()) return null;
    try {
        const resultString = await invokeNative('run_python_enhance', { inputPath, outputPath });
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("runPythonEnhance failed:", e);
        return parseNativeError(e);
    }
}

export async function runPythonUpscale(
    inputPath: string,
    outputPath: string,
    options: {
        scale: number;
        engine?: 'auto' | 'pillow' | 'real-esrgan' | 'real_esrgan';
        qualityPreset?: 'fast' | 'balanced' | 'quality' | 'max';
        tileSize?: 64 | 128 | 192 | 256;
        tilePad?: 4 | 8 | 12 | 16;
        modelId?: string;
    }
): Promise<any> {
    if (!isTauriAvailable()) return null;
    try {
        const resultString = await invokeNative('run_python_upscale', {
            inputPath,
            outputPath,
            scale: options.scale,
            engine: options.engine || 'auto',
            quality: options.qualityPreset || 'balanced',
            tileSize: options.tileSize,
            tilePad: options.tilePad,
            model: options.modelId || null
        });
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("runPythonUpscale failed:", e);
        return parseNativeError(e);
    }
}

export async function runPythonResize(inputPath: string, outputPath: string, options: { width?: number; height?: number }): Promise<any> {
    if (!isTauriAvailable()) return null;
    try {
        const resultString = await invokeNative('run_python_resize', {
            inputPath,
            outputPath,
            width: options.width,
            height: options.height
        });
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("runPythonResize failed:", e);
        return parseNativeError(e);
    }
}

export async function runPythonConvert(inputPath: string, outputPath: string, options: { format: 'png' | 'jpeg' | 'jpg' | 'webp' }): Promise<any> {
    if (!isTauriAvailable()) return null;
    try {
        const resultString = await invokeNative('run_python_convert', {
            inputPath,
            outputPath,
            format: options.format
        });
        return JSON.parse(resultString as string);
    } catch (e) {
        console.error("runPythonConvert failed:", e);
        return parseNativeError(e);
    }
}

function parseNativeError(error: unknown): any {
    const raw = typeof error === 'string' ? error : String(error);
    try {
        return JSON.parse(raw);
    } catch {
        return { ok: false, status: 'failed', message: raw };
    }
}
