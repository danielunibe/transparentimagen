import { AiProcessingAdapter } from './aiAdapterContract';
import { placeholderAdapter } from './aiAdapters/placeholderAdapter';
import { browserWorkerAdapter } from './aiAdapters/browserWorkerAdapter';
import { tauriSidecarAdapter } from './aiAdapters/tauriSidecarAdapter';
import { AiProcessingMode } from '@/types/asteria';

class AiAdapterRegistry {
  private adapters: Map<string, AiProcessingAdapter> = new Map();
  
  constructor() {
    this.register(placeholderAdapter);
    this.register(browserWorkerAdapter);
    this.register(tauriSidecarAdapter);
  }
  
  register(adapter: AiProcessingAdapter) {
    this.adapters.set(adapter.info.id, adapter);
  }
  
  async checkAdapters() {
    for (const adapter of this.adapters.values()) {
      await adapter.checkAvailability();
    }
  }
  
  getAvailableAdapters(): AiProcessingAdapter[] {
    return Array.from(this.adapters.values()).filter(a => a.info.status === 'available');
  }
  
  getDefaultAdapter(): AiProcessingAdapter {
    const available = this.getAvailableAdapters();
    
    // Priority: tauri sidecar > browser worker > placeholder
    const tauri = available.find(a => a.info.id === 'tauri_sidecar');
    if (tauri) return tauri;
    
    const browser = available.find(a => a.info.id === 'browser_worker');
    if (browser) return browser;
    
    return placeholderAdapter; 
  }
  
  getAdapterById(id: string): AiProcessingAdapter | null {
    return this.adapters.get(id) || null;
  }
  
  resolveAdapterForMode(mode: AiProcessingMode): AiProcessingAdapter {
    const available = this.getAvailableAdapters();
    
    const tauri = available.find(a => a.info.id === 'tauri_sidecar');
    if (tauri) {
        if (tauri.info.capabilities[this.mapModeToCapability(mode)]) return tauri;
        
        // Special case: if it's remove_bg and the pipeline is ready, let tauri adapter handle it
        // so it can return an honest "model missing" error instead of falling back to placeholder.
        if (mode === 'remove_bg' && (tauri.info.capabilities as any).removeBgPipelineReady) {
            return tauri;
        }
    }
    
    const browser = available.find(a => a.info.id === 'browser_worker');
    if (browser && browser.info.capabilities[this.mapModeToCapability(mode)]) return browser;
    
    return placeholderAdapter;
  }
  
  private mapModeToCapability(mode: AiProcessingMode): keyof typeof placeholderAdapter.info.capabilities {
      switch (mode) {
          case 'enhance': return 'enhance';
          case 'remove_bg': return 'removeBg';
          case 'portrait': return 'portrait';
          case 'ue5': return 'ue5';
          case 'prompt_edit': return 'promptEdit';
          default: return 'enhance'; // fallback
      }
  }
}

export const aiAdapterRegistry = new AiAdapterRegistry();
