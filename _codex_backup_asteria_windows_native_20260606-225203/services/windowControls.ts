import { getRuntimeCapabilities, getRuntimeKind, RuntimeCapabilities, hasTauri } from './runtimeService';
import '@/types/nativeRuntime';
import { tauriMinimizeWindow, tauriToggleMaximizeWindow, tauriCloseWindow } from './tauriBridge';

export type WindowControlAction = 'minimize' | 'maximize' | 'restore' | 'toggleMaximize' | 'close';

export interface WindowControlsCapabilities {
  canMinimize: boolean;
  canMaximize: boolean;
  canClose: boolean;
  isNativeShell: boolean;
}

let _isMaximized = false;

export function getWindowControlsCapabilities(): WindowControlsCapabilities {
  if (typeof window === 'undefined') {
    return { isNativeShell: false, canMinimize: false, canMaximize: false, canClose: false };
  }
  
  const caps = getRuntimeCapabilities();
  const isNativeShell = caps.canControlWindow;

  return {
    isNativeShell,
    canMinimize: isNativeShell,
    canMaximize: isNativeShell,
    canClose: true
  };
}

export function minimizeWindow(): void {
  const caps = getWindowControlsCapabilities();
  if (caps.isNativeShell) {
    if (hasTauri()) tauriMinimizeWindow().catch(console.error);
    else if (window.asteriaNative?.window?.minimize) window.asteriaNative.window.minimize();
    else if (window.electronAPI?.minimize) window.electronAPI.minimize();
    else if (window.nativeWindow?.minimize) window.nativeWindow.minimize();
    console.log("[WindowControls] minimize called in native shell.");
  } else {
    console.info("Minimize is available in desktop mode.");
  }
}

export function toggleMaximizeWindow(): boolean {
  const caps = getWindowControlsCapabilities();
  if (caps.isNativeShell) {
    if (hasTauri()) tauriToggleMaximizeWindow().catch(console.error);
    else if (window.asteriaNative?.window?.toggleMaximize) window.asteriaNative.window.toggleMaximize();
    else if (window.electronAPI?.toggleMaximize) window.electronAPI.toggleMaximize();
    else if (window.nativeWindow?.toggleMaximize) window.nativeWindow.toggleMaximize();
    _isMaximized = !_isMaximized;
    console.log("[WindowControls] toggleMaximize called in native shell.");
    return _isMaximized;
  } else {
    console.info("Maximize/Restore is available in desktop mode.");
    _isMaximized = !_isMaximized;
    return _isMaximized;
  }
}

export function closeWindow(): void {
  const caps = getWindowControlsCapabilities();
  if (caps.isNativeShell) {
    if (hasTauri()) tauriCloseWindow().catch(console.error);
    else if (window.asteriaNative?.window?.close) window.asteriaNative.window.close();
    else if (window.electronAPI?.close) window.electronAPI.close();
    else if (window.nativeWindow?.close) window.nativeWindow.close();
    console.log("[WindowControls] close called in native shell.");
  } else {
    try {
      window.close();
      console.info("Close action attempted. May be blocked by browser security.");
    } catch (e) {
      console.warn("Close window failed. Desktop controls are available in native builds.");
    }
  }
}
