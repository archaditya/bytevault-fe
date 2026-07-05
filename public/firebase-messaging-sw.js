importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase App in service worker
// Replace configurations with your web application credentials
firebase.initializeApp({
  apiKey: "AIzaSyChZWOdVLldTcr6KOeSFZipoq5J66E43zo",
  authDomain: "personal-project-933.firebaseapp.com",
  projectId: "personal-project-933",
  messagingSenderId: "988246309508",
  appId: "1:988246309508:web:b07e3bcc9639e7f964e0d1"
});

const messaging = firebase.messaging();

// Handle background notification triggers
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
