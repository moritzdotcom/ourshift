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
    console.log('[fb cfg]', {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      sender: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      vapid: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.slice(0, 8) + '…',
    });
    try {
      if (!supported) return false;
      if (typeof window === 'undefined' || !('Notification' in window))
        return false;
      if (!('serviceWorker' in navigator)) return false;

      // 1) SW sicher registrieren
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/' }
        );
      }

      // 2) Permission anfragen
      const status = await window.Notification.requestPermission();
      setPermission(status);
      if (status !== 'granted') return false;

      // 3) Token holen (an *diese* Registrierung binden)
      const messaging = getFirebaseMessaging();
      const t = await getToken(messaging, {
        vapidKey: VAPID,
        serviceWorkerRegistration: registration,
      });
      if (!t) return false;

      setToken(t);

      // 4) Registrieren
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
    } catch (err) {
      console.error('[push] register error', err);
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
