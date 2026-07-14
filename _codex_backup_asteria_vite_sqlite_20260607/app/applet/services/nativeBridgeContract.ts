export interface NativeWindowBridge {
  minimize(): Promise<void> | void;
  toggleMaximize(): Promise<void> | void;
  close(): Promise<void> | void;
}

export interface NativeSaveFileParams {
  filename: string;
  mimeType: string;
  data?: Blob;
  suggestedPath?: string;
}

export interface NativeSaveFileResult {
  ok: boolean;
  path?: string;
  message?: string;
}

export interface NativeFileBridge {
  showItemInFolder(path: string): Promise<void>;
  saveFile(params: NativeSaveFileParams): Promise<NativeSaveFileResult>;
  openDirectory(path?: string): Promise<void>;
}

export interface AsteriaNativeBridge {
  window?: NativeWindowBridge;
  file?: NativeFileBridge;
}
