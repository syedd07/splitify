/* global self */
// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAs6UfiPVVk7a43OEz5AQuZF8UJeWnwO_M",
  authDomain: "splitify-07.firebaseapp.com",
  projectId: "splitify-07",
  storageBucket: "splitify-07.firebasestorage.app",
  messagingSenderId: "462588696899",
  appId: "1:462588696899:web:fb169b71bc97faf7b077f6"
});

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages (when app is closed/minimized)
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Splitify';
  const notificationOptions = {
    body: payload.notification?.body || 'New transaction update',
    icon: '/pwa-192x192.png', // Your PWA icon
    badge: '/pwa-192x192.png',
    tag: 'splitify-notification',
    renotify: true,
    requireInteraction: false,
    data: payload.data || {}
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();
  
  // Focus or open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow('/transactions');
      }
    })
  );
});