import { AiProcessingAdapter } from '../aiAdapterContract';
import { AiAdapterInfo, AiProcessRequest, AiProcessResult } from '@/types/asteria';

export const placeholderAdapter: AiProcessingAdapter = {
  info: {
    id: 'placeholder_engine',
    kind: 'placeholder',
    label: 'Placeholder Engine',
    status: 'available',
    capabilities: {
      enhance: true,
      removeBg: true,
      portrait: true,
      ue5: true,
      promptEdit: true,
      returnsImage: false,
      supportsProgress: false,
      supportsCancel: false,
    },
    message: 'Local mock adapter for UI testing'
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
          message: 'Ready for local AI pipeline.'
        });
      }, 1200);
    });
  }
};
