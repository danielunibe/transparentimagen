# Tauri Implementation Guide

Because Asteria needs to maintain compatibility with web preview environments (like Google AI Studio), Tauri scaffolding is paused until standard Next.js building can happen outside the preview ecosystem.

## Steps to Enable Tauri

1. **Install Prerequisites**:
   Ensure Rust toolchain (`cargo`, `rustc`) and `tauri-cli` are available.

2. **Adjust Next.js Config**:
   Update `next.config.ts`:
   ```typescript
   export default {
     output: 'export',
     images: { unoptimized: true }, // Tauri doesn't run the Next.js image optimization server
     // ...
   }
   ```
   *WARNING: Doing this will break the default standalone AI Studio Preview runner!*

3. **Initialize Tauri**:
   Run `npx tauri init` and configure your bundle names.

4. **Implement Commands (`src-tauri/src/main.rs`)**:
   Create safe handlers for the bridge:
   - `show_item_in_folder(path)`
   - `save_file(data, suggested_path)`
   - `open_directory()`

5. **Wire the Bridge (`window.asteriaNative`)**:
   Instead of using direct invoke calls everywhere, initialize the bridge at runtime:
   ```typescript
   // In a top-level layout or Tauri startup script:
   import { invoke } from '@tauri-apps/api/core';
   
   window.asteriaNative = {
     window: {
       minimize: () => invoke('plugin:window|minimize'),
       toggleMaximize: () => invoke('plugin:window|toggle_maximize'),
       close: () => invoke('plugin:window|close')
     },
     file: {
       showItemInFolder: (path) => invoke('show_item_in_folder', { path }),
       // ...
     }
   };
   ```
