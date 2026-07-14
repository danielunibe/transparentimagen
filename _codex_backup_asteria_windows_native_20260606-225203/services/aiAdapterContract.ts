import { AiAdapterInfo, AiProcessRequest, AiProcessResult } from '@/types/asteria';

export interface AiProcessingAdapter {
  info: AiAdapterInfo;
  checkAvailability(): Promise<AiAdapterInfo>;
  process(request: AiProcessRequest): Promise<AiProcessResult>;
  cancel?(jobId: string): Promise<void>;
}
