import { AiProcessingAdapter } from '../aiAdapterContract';
import { AiAdapterInfo, AiProcessRequest, AiProcessResult } from '@/types/asteria';
import { 
    applyEnhancePreset, 
    applyPortraitPreset, 
    applyUe5PreviewPreset, 
    applyPromptPreset 
} from '../browserImageProcessingService';

export const browserWorkerAdapter: AiProcessingAdapter = {
  info: {
    id: 'browser_worker',
    kind: 'browser_worker',
    label: 'Browser Local Processor',
    status: 'checking',
    capabilities: {
      enhance: true,
      removeBg: false,
      portrait: true,
      ue5: true,
      promptEdit: true,
      returnsImage: true,
      supportsProgress: false,
      supportsCancel: false,
    },
    message: 'Local browser canvas pipeline.'
  },
  
  async checkAvailability(): Promise<AiAdapterInfo> {
    if (typeof window !== 'undefined' && window.document) {
      this.info.status = 'available';
    } else {
      this.info.status = 'unavailable';
      this.info.message = 'Not running in a browser environment.';
    }
    return this.info;
  },
  
  async process(request: AiProcessRequest): Promise<AiProcessResult> {
    if (!request.objectUrl) {
        return {
            ok: false,
            status: 'failed',
            message: 'Image required for browser processing.'
        };
    }

    try {
        let result;
        
        switch (request.mode) {
            case 'enhance':
                result = await applyEnhancePreset(request.objectUrl);
                break;
            case 'portrait':
                result = await applyPortraitPreset(request.objectUrl);
                break;
            case 'ue5':
                result = await applyUe5PreviewPreset(request.objectUrl);
                break;
            case 'prompt_edit':
                if (!request.prompt) throw new Error('Prompt required.');
                result = await applyPromptPreset(request.objectUrl, request.prompt);
                break;
            case 'remove_bg':
                return {
                    ok: true,
                    status: 'placeholder',
                    message: 'Background removal requires a model or native pipeline.'
                };
            default:
                throw new Error('Unsupported mode for browser local processor.');
        }

        return {
            ok: true,
            status: 'completed',
            message: 'Processed locally in browser.',
            outputBlob: result.blob,
            outputObjectUrl: result.objectUrl,
            outputMimeType: result.mimeType,
            outputFilename: request.assetName.replace(/\.[^/.]+$/, "") + result.filenameSuffix + ".png",
            outputWidth: result.width,
            outputHeight: result.height,
        };
    } catch (e: any) {
        if (e.message.includes('requires a configured AI model')) {
             return {
                ok: true,
                status: 'placeholder',
                message: e.message
            };
        }
        
        return {
            ok: false,
            status: 'failed',
            message: e.message || 'Error processing image in browser.'
        };
    }
  }
};
