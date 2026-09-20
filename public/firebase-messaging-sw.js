importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

// Force immediate activation upon service worker installation
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Firebase config — matches frontend .env / lib/firebase.ts
firebase.initializeApp({
  apiKey: 'AIzaSyBPhZ-DQAPwGZAZn-SHObvyygv5QmZX3i0',
  authDomain: 'bytevault-cd41f.firebaseapp.com',
  projectId: 'bytevault-cd41f',
  storageBucket: 'bytevault-cd41f.firebasestorage.app',
  messagingSenderId: '830532298839',
  appId: '1:830532298839:web:9e353a91df24173a735b12'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/PushPostVault-icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
