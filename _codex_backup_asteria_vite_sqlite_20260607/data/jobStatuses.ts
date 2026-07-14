import type { JobLifecycleDomain, JobLifecycleState, JobLifecycleTone, JobLifecycleSnapshot } from '@/types/domains/jobs';

export type { JobLifecycleDomain, JobLifecycleState, JobLifecycleTone };
export interface JobLifecycleDescriptor extends JobLifecycleSnapshot {}

export const JOB_ACTIVE_STATES: JobLifecycleState[] = ['queued', 'preparing', 'running', 'processing', 'exporting', 'checking'];
export const JOB_SUCCESS_STATES: JobLifecycleState[] = ['completed', 'available', 'partial', 'skipped'];
export const JOB_FAILURE_STATES: JobLifecycleState[] = ['failed', 'cancelled', 'unsupported', 'not_configured', 'unavailable', 'error'];
export const JOB_TERMINAL_STATES: JobLifecycleState[] = [
  'completed',
  'failed',
  'cancelled',
  'partial',
  'skipped',
  'unsupported',
  'available',
  'not_configured',
  'unavailable',
  'error',
];

const LABELS: Partial<Record<JobLifecycleState, string>> = {
  draft: 'Draft',
  queued: 'Queued',
  preparing: 'Preparing...',
  running: 'Running',
  processing: 'Processing',
  exporting: 'Exporting...',
  available: 'Available',
  checking: 'Checking...',
  not_configured: 'Not configured',
  unavailable: 'Unavailable',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  partial: 'Partial Success',
  skipped: 'Skipped',
  unsupported: 'Unsupported',
  placeholder: 'Ready',
  error: 'Error',
  idle: 'Idle',
};

export function getJobLifecycleLabel(state: string): string {
  return LABELS[state as JobLifecycleState] || state;
}

export function isJobLifecycleActive(state: string): boolean {
  return JOB_ACTIVE_STATES.includes(state as JobLifecycleState);
}

export function isJobLifecycleTerminal(state: string): boolean {
  return JOB_TERMINAL_STATES.includes(state as JobLifecycleState);
}

export function getJobLifecycleTone(state: string): JobLifecycleTone {
  if (JOB_SUCCESS_STATES.includes(state as JobLifecycleState)) return 'success';
  if (JOB_FAILURE_STATES.includes(state as JobLifecycleState)) return 'danger';
  if (state === 'placeholder') return 'info';
  if (isJobLifecycleActive(state)) return 'active';
  return 'neutral';
}

export function describeJobLifecycle(domain: JobLifecycleDomain, state: string): JobLifecycleDescriptor {
  return {
    domain,
    state,
    label: getJobLifecycleLabel(state),
    tone: getJobLifecycleTone(state),
    isTerminal: isJobLifecycleTerminal(state),
    isActive: isJobLifecycleActive(state),
    isSuccess: JOB_SUCCESS_STATES.includes(state as JobLifecycleState),
    isFailure: JOB_FAILURE_STATES.includes(state as JobLifecycleState),
  };
}
