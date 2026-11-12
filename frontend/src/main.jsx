import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

// Service worker (PWA). En desarrollo no se usa: se anula y se limpian sus cachés.
if ('serviceWorker' in navigator) {
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (import.meta.env.DEV || isLocal) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  } else {
    // Recargar una sola vez cuando un SW nuevo toma el control (sin bucles).
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded || sessionStorage.getItem('sw-reloaded')) return;
      reloaded = true;
      sessionStorage.setItem('sw-reloaded', '1');
      location.reload();
    });
    window.addEventListener('load', () => {
      sessionStorage.removeItem('sw-reloaded');
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update())
        .catch(() => {});
    });
  }
}
