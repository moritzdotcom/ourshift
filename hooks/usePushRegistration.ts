import { useCallback, useEffect, useState } from 'react';
import { getFirebaseMessaging } from '@/lib/firebase/client';
import { getToken, isSupported, onMessage } from 'firebase/messaging';
import { showInfo } from '@/lib/toast';

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

export function usePushRegistration() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const sup = await isSupported().catch(() => false);
      if (!mounted) return;
      setSupported(!!sup);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(window.Notification.permission);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const register = useCallback(async () => {
    try {
      if (!supported) return false;
      if (typeof window === 'undefined' || !('Notification' in window))
        return false;
      if (!('serviceWorker' in navigator)) return false;

      // SW Registrierung sicherstellen
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/' }
        );
      }

      // Permission nur anfragen, wenn noch nicht granted
      let status: NotificationPermission =
        window.Notification.permission ?? 'default';
      if (status !== 'granted') {
        status = await window.Notification.requestPermission();
        setPermission(status);
        if (status !== 'granted') return false;
      } else {
        setPermission(status);
      }

      // Token holen (an diese SW-Registration binden)
      const messaging = getFirebaseMessaging();
      const t = await getToken(messaging, {
        vapidKey: VAPID,
        serviceWorkerRegistration: registration,
      }).catch(() => null);
      if (!t) return false;

      setToken(t);

      // Server registrieren
      await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: t,
          platform: 'web',
          ua: navigator.userAgent,
        }),
      });

      return true;
    } catch (e) {
      console.error('[push] register error', e);
      return false;
    }
  }, [supported]);

  // Optional: Foreground-Listener
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (!supported || typeof window === 'undefined') return;
      const messaging = getFirebaseMessaging();
      unsub = onMessage(messaging, (payload) => {
        const msg = payload.notification?.title;
        if (msg) showInfo(msg);
        console.debug('Push foreground:', payload);
      });
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [supported]);

  return { supported, permission, token, register };
}
