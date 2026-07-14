import React from 'react';
import { createRoot } from 'react-dom/client';
import { AsteriaShell } from '@/features/asteria/AsteriaShell';
import '@/app/globals.css';

document.documentElement.lang = 'en';
document.body.className =
  'bg-[#020303] text-on-background font-body-sm h-[100dvh] flex flex-col overflow-hidden selection:bg-primary-container selection:text-on-primary-container';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Asteria root element was not found.');
}

createRoot(root).render(
  <React.StrictMode>
    <AsteriaShell />
  </React.StrictMode>,
);
