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

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const data = payload.data || {};
  // Support for webpush.fcmOptions.link via data.link
  const options = {
    body: n.body,
    icon: n.icon || '/icons/favicon-192x192.png',
    badge: n.badge || '/icons/badge-72.png',
    tag: data.tag || undefined,
    renotify: true,
    data: { link: data.link || '/' },
  };
  self.registration.showNotification(n.title || 'Benachrichtigung', options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/';
  event.waitUntil(self.clients.openWindow(link));
});
