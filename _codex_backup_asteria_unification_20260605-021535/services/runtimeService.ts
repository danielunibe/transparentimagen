import { isTauriAvailable } from './tauriBridge';

export type RuntimeKind = 'web' | 'tauri' | 'electron' | 'native-bridge' | 'unknown';

export interface RuntimeCapabilities {
  runtime: RuntimeKind;
  canUseFileSystemAccess: boolean;
  canPickDirectory: boolean;
  canSaveFileNatively: boolean;
  canLocateFile: boolean;
  canControlWindow: boolean;
  canUsePersistentHandles: boolean;
  nativeAiSidecar: boolean;
  nativeAiProcessing: boolean;
  localModelSupport: boolean;
}

export function getRuntimeKind(): RuntimeKind {
  if (typeof window === 'undefined') return 'unknown';
  if (isTauriAvailable()) return 'tauri';
  if (!!window.__TAURI__) return 'tauri';
  if (!!window.asteriaNative) return 'native-bridge';
  if (!!window.electronAPI) return 'electron';
  if (!!window.nativeWindow) return 'native-bridge';
  return 'web';
}

export function hasTauri(): boolean {
  return getRuntimeKind() === 'tauri';
}

export function hasElectron(): boolean {
  return getRuntimeKind() === 'electron';
}

export function hasNativeBridge(): boolean {
  return getRuntimeKind() === 'native-bridge';
}

export function supportsFileSystemAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return 'showDirectoryPicker' in window;
}

export function getRuntimeCapabilities(): RuntimeCapabilities {
  const kind = getRuntimeKind();
  const fsAccess = supportsFileSystemAccess();
  const isDesktop = kind === 'tauri' || kind === 'electron' || kind === 'native-bridge';

  return {
    runtime: kind,
    canUseFileSystemAccess: fsAccess,
    canPickDirectory: fsAccess || isDesktop,
    canSaveFileNatively: isDesktop,
    canLocateFile: isDesktop,
    canControlWindow: isDesktop,
    canUsePersistentHandles: fsAccess || isDesktop,
    nativeAiSidecar: isDesktop, // Currently available as a structural adapter, but maybe not configured
    nativeAiProcessing: false,
    localModelSupport: isDesktop
  };
}
