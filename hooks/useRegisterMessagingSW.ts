import { useEffect } from 'react';

export function useRegisterMessagingSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Wichtig: exakte URL & Scope
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', { scope: '/' })
      .then((reg) => {
        console.info('[SW] registered', reg.scope);
      })
      .catch((err) => {
        console.error('[SW] register failed', err);
      });
  }, []);
}
