import {
    isTauriAvailable,
    joinPath,
    runPythonConvert,
    runPythonEnhance,
    runPythonRemoveBg,
    runPythonResize,
    runPythonUpscale,
    appCacheDir,
    writeBinaryFile,
    readBinaryFile,
    removeFile
} from './tauriBridge';

export async function prepareNativeImageInput(assetId: string, objectUrl?: string, file?: File): Promise<string> {
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    
    let buffer: ArrayBuffer;
    if (file) {
        buffer = await file.arrayBuffer();
    } else if (objectUrl) {
        const response = await fetch(objectUrl);
        buffer = await response.arrayBuffer();
    } else {
        throw new Error("No image data provided to native pipeline.");
    }
    
    const cacheDir = await appCacheDir();
    const inputPath = await joinPath(cacheDir, `input_${assetId}_${Date.now()}.png`);
    await writeBinaryFile(inputPath, new Uint8Array(buffer));
    
    return inputPath;
}

export async function createNativeOutputPath(assetId: string, suffix: string): Promise<string> {
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    const cacheDir = await appCacheDir();
    return await joinPath(cacheDir, `output_${assetId}_${suffix}_${Date.now()}.png`);
}

export async function runNativeRemoveBg(inputPath: string, outputPath: string): Promise<any> {
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    return await runPythonRemoveBg(inputPath, outputPath);
}

export async function runNativeEnhance(inputPath: string, outputPath: string): Promise<any> {
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    return await runPythonEnhance(inputPath, outputPath);
}

export async function runNativeUpscale(
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
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    return await runPythonUpscale(inputPath, outputPath, options);
}

export async function runNativeResize(inputPath: string, outputPath: string, options: { width?: number; height?: number }): Promise<any> {
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    return await runPythonResize(inputPath, outputPath, options);
}

export async function runNativeConvert(inputPath: string, outputPath: string, options: { format: 'png' | 'jpeg' | 'jpg' | 'webp' }): Promise<any> {
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    return await runPythonConvert(inputPath, outputPath, options);
}

export async function readNativeOutputAsBlob(outputPath: string): Promise<Blob> {
    if (!isTauriAvailable()) throw new Error("Native pipeline requires Tauri");
    const bytes = await readBinaryFile(outputPath);
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' });
}

export async function cleanupTempFiles(paths: string[]): Promise<void> {
    if (!isTauriAvailable()) return;
    for (const path of paths) {
        await removeFile(path);
    }
}
