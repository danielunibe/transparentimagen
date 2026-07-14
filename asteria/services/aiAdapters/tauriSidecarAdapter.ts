import { AiProcessingAdapter } from '../aiAdapterContract';
import { AiAdapterInfo, AiProcessRequest, AiProcessResult } from '@/types/asteria';
import { getRuntimeCapabilities } from '../runtimeService';
import { collectRuntimeCapabilitySnapshot } from '../capabilityStatusService';
import { getRuntimeFeatureStatus } from '../runtimeCapabilityService';

export const tauriSidecarAdapter: AiProcessingAdapter = {
  info: {
    id: 'tauri_sidecar',
    kind: 'tauri_sidecar',
    label: 'Native AI Sidecar',
    status: 'checking',
    capabilities: {
      enhance: false,
      removeBg: false,
      upscale: false,
      portrait: false,
      ue5: false,
      promptEdit: false,
      returnsImage: true,
      supportsProgress: false,
      supportsCancel: false,
    },
    message: 'Checking for Tauri bridge...'
  },
  
  async checkAvailability(): Promise<AiAdapterInfo> {
    const caps = getRuntimeCapabilities();
    if (caps.runtime === 'native-bridge' || caps.runtime === 'tauri') {
       try {
           const { checkPythonSidecar, getPythonSidecarCapabilities } = await import('../tauriBridge');
           const [health, sidecarCaps] = await Promise.all([
               checkPythonSidecar(),
               getPythonSidecarCapabilities()
           ]);
           const snapshot = await collectRuntimeCapabilitySnapshot();
           const realEsrgan = getRuntimeFeatureStatus(snapshot, 'upscale_real_esrgan');
           const rembg = getRuntimeFeatureStatus(snapshot, 'rembg');
           
           if (health && health.ok) {
               this.info.status = 'available';
               this.info.message = realEsrgan && !realEsrgan.available
                   ? realEsrgan.message
                   : rembg && !rembg.available
                       ? rembg.message
                       : health.message || 'Python sidecar available.';
               this.info.capabilities = {
                   ...this.info.capabilities,
                   ...(sidecarCaps?.capabilities || {})
               };
           } else {
               this.info.status = 'not_configured';
               this.info.message = 'Native AI sidecar is not configured yet.';
           }
       } catch (e) {
           this.info.status = 'unavailable';
           this.info.message = 'Native AI sidecar communication failed.';
       }
    } else {
       this.info.status = 'unavailable';
       this.info.message = 'Not running in a native environment.';
    }
    return this.info;
  },
  
  async process(request: AiProcessRequest): Promise<AiProcessResult> {
    if (request.mode === 'remove_bg' || request.mode === 'enhance' || request.mode === 'upscale') {
        try {
            const snapshot = await collectRuntimeCapabilitySnapshot();
            if (request.mode === 'remove_bg') {
                const rembg = getRuntimeFeatureStatus(snapshot, 'rembg');
                if (rembg && !rembg.available) {
                    return { ok: false, status: 'failed', message: rembg.message || 'Remove BG requires rembg in the Python sidecar.' };
                }
            }
            if (request.mode === 'upscale' && (request.engine === 'real_esrgan' || request.engine === 'real-esrgan')) {
                const realEsrgan = getRuntimeFeatureStatus(snapshot, 'upscale_real_esrgan');
                if (realEsrgan && !realEsrgan.available) {
                    return { ok: false, status: 'failed', message: realEsrgan.message || 'Real-ESRGAN model is missing.' };
                }
            }
            const {
                prepareNativeImageInput,
                createNativeOutputPath,
                runNativeEnhance,
                runNativeRemoveBg,
                runNativeUpscale,
                readNativeOutputAsBlob,
                cleanupTempFiles
            } = await import('../nativeImagePipelineService');
            
            const inputPath = await prepareNativeImageInput(request.assetId, request.objectUrl, request.file);
            const suffix = request.mode === 'remove_bg' ? 'rembg' : request.mode === 'upscale' ? 'upscale' : 'enhance';
            const outputPath = await createNativeOutputPath(request.assetId, suffix);
            
            const upscaleScale = request.scale || 2;
            const upscaleEngine = request.engine === 'real_esrgan' || request.engine === 'real-esrgan'
                ? 'real-esrgan'
                : request.engine === 'pillow'
                    ? 'pillow'
                    : 'auto';
            const upscaleQualityPreset = request.qualityPreset || 'balanced';
            const result = request.mode === 'remove_bg'
                ? await runNativeRemoveBg(inputPath, outputPath)
                : request.mode === 'upscale'
                    ? await runNativeUpscale(inputPath, outputPath, {
                        scale: upscaleScale,
                        engine: upscaleEngine,
                        qualityPreset: upscaleQualityPreset,
                        tileSize: request.tileSize as 64 | 128 | 192 | 256 | undefined,
                        tilePad: request.tilePad as 4 | 8 | 12 | 16 | undefined,
                        modelId: request.modelId
                    })
                    : await runNativeEnhance(inputPath, outputPath);
            
            if (result && result.ok) {
                const outputBlob = await readNativeOutputAsBlob(outputPath);
                const outputObjectUrl = URL.createObjectURL(outputBlob);
                await cleanupTempFiles([inputPath, outputPath]);
                return {
                    ok: true,
                    status: 'completed',
                    message: result.message || (request.mode === 'remove_bg' ? 'Background removed successfully' : 'Image enhanced successfully'),
                    outputBlob,
                    outputObjectUrl,
                    outputMimeType: 'image/png',
                    outputFilename: `${request.mode === 'remove_bg' ? 'cutout' : request.mode === 'upscale' ? `upscaled_${result.scale || upscaleScale}x` : 'enhanced'}_${request.assetName}`,
                    outputWidth: result.width,
                    outputHeight: result.height,
                    scale: request.mode === 'upscale' ? (result.scale || upscaleScale) : undefined,
                    engine: request.mode === 'upscale' ? (result.actualEngine || result.engine || 'pillow_lanczos') : undefined,
                    qualityPreset: request.mode === 'upscale' ? (result.qualityPreset || upscaleQualityPreset) : undefined,
                    tileSize: request.mode === 'upscale' ? result.tileSize : undefined,
                    tilePad: request.mode === 'upscale' ? result.tilePad : undefined,
                    requestedEngine: request.mode === 'upscale' ? (result.requestedEngine || upscaleEngine) : undefined,
                    actualEngine: request.mode === 'upscale' ? (result.actualEngine || result.engine || 'pillow_lanczos') : undefined,
                    fallbackFrom: request.mode === 'upscale' ? result.fallbackFrom : undefined,
                    realEsrganStatus: request.mode === 'upscale' ? result.realEsrganStatus : undefined,
                    modelId: request.mode === 'upscale' ? result.modelId : undefined,
                    modelStatus: request.mode === 'upscale' ? result.modelStatus : undefined,
                    memoryMode: request.mode === 'upscale' ? result.memoryMode : undefined,
                    estimatedCost: request.mode === 'upscale' ? result.estimatedCost : undefined
                };
            } else {
                return {
                    ok: false,
                    status: 'failed',
                    message: result?.message || result?.error || 'Native image operation is not available.'
                };
            }
        } catch (e: any) {
            return {
                ok: false,
                status: 'failed',
                message: `Native pipeline failed: ${e.message || String(e)}`
            };
        }
    }

    return {
      ok: false,
      status: 'failed',
      message: 'Python sidecar is available but no image model is configured yet.'
    };
  }
};
