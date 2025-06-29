import { messaging } from "./firebase";
import { getToken, isSupported } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

// Helper to detect iOS Safari PWA
function isIosPwa(): boolean {
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true;
  return isIos && isStandalone;
}

// Ask user for permission & return their FCM token
export const requestNotificationPermission = async (): Promise<{ token: string | null, tokenType: 'fcm' | 'apns' | null }> => {
  const supported = await isSupported();
  if (!supported && !isIosPwa()) {
    console.warn("Notifications not supported on this browser.");
    return { token: null, tokenType: null };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Permission denied for notifications.");
    return { token: null, tokenType: null };
  }

  // iOS PWA (APNs)
  if (isIosPwa() && 'serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // Use your VAPID key here
      });
      // Store the endpoint as the APNs token
      return { token: sub.endpoint, tokenType: 'apns' };
    } catch (err) {
      console.error("Error getting APNs push subscription", err);
      return { token: null, tokenType: null };
    }
  }

  // FCM (Android/Web)
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      return { token, tokenType: 'fcm' };
    } else {
      console.warn("No FCM token received");
      return { token: null, tokenType: null };
    }
  } catch (err) {
    console.error("Error getting FCM token", err);
    return { token: null, tokenType: null };
  }
};

// Save or update the user's push token in the database
export async function saveUserPushToken(userId: string, token: string, tokenType: 'fcm' | 'apns') {
  if (!userId || !token || !tokenType) return;

  const { error } = await supabase
    .from('user_tokens')
    .upsert(
      {
        user_id: userId,
        fcm_token: token,
        token_type: tokenType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,fcm_token' }
    );

  if (error) {
    console.error("Failed to save push token:", error);
    return false;
  }
  return true;
}
