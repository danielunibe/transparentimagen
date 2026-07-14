import { AsteriaNativeBridge } from '@/services/nativeBridgeContract';

export interface ElectronAPI {
  minimize?: () => void | Promise<void>;
  toggleMaximize?: () => void | Promise<void>;
  close?: () => void | Promise<void>;
  showItemInFolder?: (path: string) => Promise<void>;
}

export interface NativeWindow {
  minimize?: () => void | Promise<void>;
  toggleMaximize?: () => void | Promise<void>;
  close?: () => void | Promise<void>;
  showItemInFolder?: (path: string) => Promise<void>;
}

declare global {
  interface Window {
    __TAURI__?: unknown;
    electronAPI?: ElectronAPI;
    nativeWindow?: NativeWindow;
    asteriaNative?: AsteriaNativeBridge;
    showDirectoryPicker?: any;
    showOpenFilePicker?: any;
    showSaveFilePicker?: any;
  }
}
