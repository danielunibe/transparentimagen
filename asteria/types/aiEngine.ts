import { AiAdapterCapabilities } from './asteria';

export type LocalAiEngineKind =
  | 'none'
  | 'browser_canvas'
  | 'tauri_sidecar'
  | 'python_sidecar'
  | 'comfyui_local'
  | 'onnx_runtime'
  | 'wasm_model';

export type LocalAiEngineStatus =
  | 'available'
  | 'unavailable'
  | 'not_configured'
  | 'checking'
  | 'error';

export interface LocalAiEngineInfo {
  id: string;
  kind: LocalAiEngineKind;
  label: string;
  status: LocalAiEngineStatus;
  description?: string;
  version?: string;
  endpoint?: string;
  capabilities: AiAdapterCapabilities;
  message?: string;
  error?: string;
}

export interface LocalAiEngineSettings {
  preferredEngine: LocalAiEngineKind;
  allowNativeSidecar: boolean;
  allowBrowserFallback: boolean;
  endpoint?: string;
}
