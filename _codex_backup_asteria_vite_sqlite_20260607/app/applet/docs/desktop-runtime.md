# Asteria Desktop Runtime

Asteria is primarily intended to be a local-first application. While it can run perfectly fine in a modern web browser, desktop mode unlocks direct file-system capabilities, native window frames, and local AI model integration.

## Technical Decision: Tauri-First

Asteria has adopted a **Tauri-First** strategy for native packaging.
Why Tauri over Electron?
1. **Lightweight**: Asteria relies on modern web technologies. Tauri leverages the OS webview instead of shipping a full Chromium binary.
2. **Security**: Tauri provides a tighter, safer bridge between the UI and system APIs.
3. **Local-First**: Perfect match for local metadata and upcoming Rust-based bindings for AI model inference or heavy image processing.

*(Note: Electron remains completely viable via `nativeBridgeContract`, but Tauri is the official target.)*

## Current Architecture Status

The application is structured to gracefully adapt to its environment:
- **`services/runtimeService.ts`**: Safely detects whether it's running in Web Preview, Tauri, Electron, or a Custom Native Bridge. Exposes `RuntimeCapabilities`.
- **`services/nativeBridgeContract.ts`**: Defines pure interfaces for desktop commands (`minimize`, `showItemInFolder`, etc).
- **`services/nativeActionsService.ts`**: Implements the actions using the contracts (e.g. Locate via file manager) and gracefully falls back to web patterns.
- **`services/windowControls.ts`**: Detects if we are in a frameless native shell to display window chrome.

## Fallback Mechanisms

Inside standard Web previews (like Google AI Studio):
- File selections are handled via HTML5 `showDirectoryPicker()` (File System Access API).
- Features requiring native features (like 'Locate file in File Explorer') show a clean "Available in desktop mode" status message, maintaining UX without erroring.
- Save actions fall back to browser `Blob` downloads instead of native file-save dialogs.

## Roadmap for Packaging

1. Install Tauri CLI and configure `src-tauri`.
2. Map Rust commands to `window.asteriaNative`.
3. Switch Next.js to `output: 'export'` mode (which requires caution if dynamic SSR API endpoints are present).
