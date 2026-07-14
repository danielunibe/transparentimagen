export type JobLifecycleDomain = 'export' | 'batch' | 'ai' | 'package' | 'report';

export type JobLifecycleState =
  | 'draft'
  | 'queued'
  | 'preparing'
  | 'running'
  | 'processing'
  | 'exporting'
  | 'available'
  | 'checking'
  | 'not_configured'
  | 'unavailable'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial'
  | 'skipped'
  | 'unsupported'
  | 'placeholder'
  | 'error'
  | 'idle';

export type JobLifecycleTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger' | 'muted' | 'info';

export interface JobLifecycleSnapshot {
  domain: JobLifecycleDomain;
  state: JobLifecycleState | string;
  label: string;
  tone: JobLifecycleTone;
  isTerminal: boolean;
  isActive: boolean;
  isSuccess: boolean;
  isFailure: boolean;
}
