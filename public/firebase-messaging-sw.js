/* global self, importScripts, firebase */

importScripts(
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'AIzaSyCxfhwzM7l5glofyhk_cvBc1dVOjRIUH-c',
  authDomain: 'ourshift-19.firebaseapp.com',
  projectId: 'ourshift-19',
  messagingSenderId: '248471371427',
  appId: '1:248471371427:web:d6e34d2fd3542d705e4916',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(({ data }) => {
  const title = data?.title || 'Benachrichtigung';
  const body = data?.body || '';
  const link = data?.link || '/';
  const tag = data?.tag || undefined;

  self.registration.showNotification(title, {
    body,
    icon: '/icons/push-192.png',
    badge: '/icons/badge-72.png',
    tag, // gleicher tag => ersetzt statt duplizieren
    renotify: true,
    data: { link },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/';
  event.waitUntil(self.clients.openWindow(link));
});
