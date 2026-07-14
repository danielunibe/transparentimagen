import React from 'react';
import { createRoot } from 'react-dom/client';
import { AsteriaShell } from '@/features/asteria/AsteriaShell';
import { initializePersistence } from '@/services/persistenceService';
import { runLegacyStorageMigration } from '@/services/repositories/migrationService';
import { isTauriAvailable } from '@/services/tauriBridge';
import { initializeOrganizationStorage } from '@/services/organizationStorageService';
import { initializeMaterialStorage } from '@/services/materialStorageService';
import '@/app/globals.css';

document.documentElement.lang = 'en';
document.body.className =
  'bg-[#020303] text-on-background font-body-sm h-[100dvh] flex flex-col overflow-hidden selection:bg-primary-container selection:text-on-primary-container';

async function bootstrap(): Promise<void> {
  const root = document.getElementById('root');
  if (!root) throw new Error('Asteria root element was not found.');
  if (!isTauriAvailable()) {
    root.innerHTML = '<main style="padding:24px;font-family:system-ui;color:#f2f2ef;background:#020303;min-height:100vh">Asteria requiere la aplicacion nativa para Windows.</main>';
    return;
  }

  await initializePersistence();
  await runLegacyStorageMigration();
  await Promise.all([initializeOrganizationStorage(), initializeMaterialStorage()]);
  createRoot(root).render(
    <React.StrictMode>
      <AsteriaShell />
    </React.StrictMode>,
  );
}

void bootstrap().catch((error) => {
  console.error('[Bootstrap] Native initialization failed:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '<main style="padding:24px;font-family:system-ui;color:#f2f2ef;background:#020303;min-height:100vh">No se pudo iniciar el almacenamiento nativo de Asteria.</main>';
  }
});
