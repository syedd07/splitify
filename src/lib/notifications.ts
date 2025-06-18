import { messaging } from "./firebase";
import { getToken, isSupported } from "firebase/messaging";

// Ask user for permission & return their FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  const supported = await isSupported();
  if (!supported) {
    console.warn("Notifications not supported on this browser.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Permission denied for notifications.");
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log("FCM Token:", token);
      return token;
    } else {
      console.warn("No token received");
      return null;
    }
  } catch (err) {
    console.error("Error getting FCM token", err);
    return null;
  }
};
