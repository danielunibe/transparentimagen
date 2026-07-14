import { AiProcessingJob, AiProcessingMode, AiJobStatus, AssetVariantKind, GalleryImageItem } from '@/types/asteria';

export function createAiJob(params: Partial<AiProcessingJob> & { assetId: string, assetName: string, mode: AiProcessingMode }): AiProcessingJob {
  const now = new Date().toISOString();
  return {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    ...params
  };
}

export function updateAiJob(job: AiProcessingJob, patch: Partial<AiProcessingJob>): AiProcessingJob {
  return {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString()
  };
}

export function getAiModeLabel(mode: AiProcessingMode): string {
  switch (mode) {
    case 'enhance': return 'Enhance';
    case 'remove_bg': return 'Remove BG';
    case 'portrait': return 'Portrait';
    case 'ue5': return 'UE5 Asset';
    case 'prompt_edit': return 'Prompt Edit';
    default: return 'AI Action';
  }
}

export function getAiStatusLabel(status: AiJobStatus): string {
  switch (status) {
    case 'queued': return 'Queued';
    case 'preparing': return 'Preparing...';
    case 'processing': return 'Processing';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'cancelled': return 'Cancelled';
    case 'placeholder': return 'Ready for AI Pipeline';
    default: return 'Unknown';
  }
}

export function shouldCreateVariantForMode(mode: AiProcessingMode): boolean {
  return true;
}

export function mapModeToVariantKind(mode: AiProcessingMode): AssetVariantKind {
  switch (mode) {
    case 'enhance': return 'enhanced';
    case 'remove_bg': return 'cutout';
    case 'portrait': return 'portrait';
    case 'ue5': return 'ue5';
    case 'prompt_edit': return 'ai_preview';
    default: return 'ai_preview';
  }
}

export function getVariantLabelForMode(mode: AiProcessingMode): string {
  switch (mode) {
    case 'enhance': return 'Enhanced Preview';
    case 'remove_bg': return 'Cutout Preview';
    case 'portrait': return 'Portrait Preview';
    case 'ue5': return 'UE5 Asset Preview';
    case 'prompt_edit': return 'Prompt Preview';
    default: return 'AI Preview';
  }
}
