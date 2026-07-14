import { AiProcessingAdapter } from '../aiAdapterContract';
import { AiAdapterInfo, AiProcessRequest, AiProcessResult } from '@/types/asteria';
import { getRuntimeCapabilities } from '../runtimeService';

export const tauriSidecarAdapter: AiProcessingAdapter = {
  info: {
    id: 'tauri_sidecar',
    kind: 'tauri_sidecar',
    label: 'Native AI Sidecar',
    status: 'checking',
    capabilities: {
      enhance: true,
      removeBg: true,
      portrait: true,
      ue5: true,
      promptEdit: true,
      returnsImage: true,
      supportsProgress: true,
      supportsCancel: true,
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
           
           if (health && health.ok) {
               this.info.status = 'available';
               this.info.message = health.message || 'Python sidecar available but no model configured.';
               // Even though available, capabilities are all false in MVP
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
    if (request.mode === 'remove_bg') {
        try {
            const { prepareNativeImageInput, createNativeOutputPath, runNativeRemoveBg, readNativeOutputAsBlob, cleanupTempFiles } = await import('../nativeImagePipelineService');
            
            // 1. Prepare pipeline
            const inputPath = await prepareNativeImageInput(request.assetId, request.objectUrl, request.file);
            const outputPath = await createNativeOutputPath(request.assetId, 'rembg');
            
            // 2. Call sidecar
            const result = await runNativeRemoveBg(inputPath, outputPath);
            
            if (result && result.ok) {
                // Phase 26B: The model successfully wrote the output file
                const outputBlob = await readNativeOutputAsBlob(outputPath);
                const outputObjectUrl = URL.createObjectURL(outputBlob);
                await cleanupTempFiles([inputPath, outputPath]);
                return {
                    ok: true,
                    status: 'completed',
                    message: 'Background removed successfully',
                    outputBlob,
                    outputObjectUrl,
                    outputMimeType: 'image/png',
                    outputFilename: `cutout_${request.assetName}`
                };
            } else {
                // Phase 26A: model_not_installed or other error
                return {
                    ok: false,
                    status: 'failed',
                    message: result?.message || result?.error || 'Background removal model is not installed yet.'
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
