/* global self */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAs6UfiPVVk7a43OEz5AQuZF8UJeWnwO_M",
  authDomain: "splitify-07.firebaseapp.com",
  projectId: "splitify-07",
  storageBucket: "splitify-07.firebasestorage.app",
  messagingSenderId: "462588696899",
  appId: "1:462588696899:web:fb169b71bc97faf7b077f6"
});

const messaging = firebase.messaging();

self.addEventListener("push", (event) => {
  console.log("[firebase-messaging-sw.js] Push received.");
});