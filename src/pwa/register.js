export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[pwa] échec d\'enregistrement du service worker', err);
    });
  });
}

/** Capture l'évènement d'installation PWA pour proposer un bouton "Installer l'application". */
export function setupInstallPrompt() {
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.dispatchEvent(new CustomEvent('pwa:installable', { detail: true }));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.dispatchEvent(new CustomEvent('pwa:installed'));
  });
  return {
    promptInstall: async () => {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return choice.outcome === 'accepted';
    },
    isAvailable: () => !!deferredPrompt,
  };
}
