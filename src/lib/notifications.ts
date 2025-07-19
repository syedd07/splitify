import { messaging } from "./firebase";
import { getToken, isSupported } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

// Ask user for permission & return their FCM token (FCM for all platforms)
export const requestNotificationPermission = async (): Promise<{ token: string | null, tokenType: 'fcm' | null }> => {
  // Check if Firebase Messaging is supported
  const supported = await isSupported();
  if (!supported) {
    console.warn("Firebase Messaging not supported on this browser.");
    return { token: null, tokenType: null };
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Permission denied for notifications.");
    return { token: null, tokenType: null };
  }

  // Get FCM token for all platforms (including iOS)
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
     // console.log("FCM token received:", token.substring(0, 20) + "...");
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
export async function saveUserPushToken(userId: string, token: string, tokenType: 'fcm') {
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
  
  //console.log("FCM token saved successfully for user:", userId);
  return true;
}
