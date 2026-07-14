import { AiProcessingAdapter } from '../aiAdapterContract';
import { AiAdapterInfo, AiProcessRequest, AiProcessResult } from '@/types/asteria';

export const placeholderAdapter: AiProcessingAdapter = {
  info: {
    id: 'placeholder_engine',
    kind: 'placeholder',
    label: 'Placeholder Engine',
    status: 'available',
    capabilities: {
      enhance: false,
      removeBg: false,
      upscale: false,
      portrait: false,
      ue5: false,
      promptEdit: false,
      returnsImage: false,
      supportsProgress: false,
      supportsCancel: false,
    },
    message: 'No real image output is available for this action.'
  },
  
  async checkAvailability(): Promise<AiAdapterInfo> {
    return this.info;
  },
  
  async process(request: AiProcessRequest): Promise<AiProcessResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          status: 'placeholder',
          message: 'This action is not available in the current runtime.'
        });
      }, 1200);
    });
  }
};
