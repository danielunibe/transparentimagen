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
}

export async function tauriCloseWindow(): Promise<void> {
    if (!isTauriAvailable()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
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
