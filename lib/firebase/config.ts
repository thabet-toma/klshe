import { initializeApp, getApps } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseAuth = getAuth(app);

// Use localStorage persistence instead of sessionStorage to avoid
// "missing initial state" errors in WebViews and partitioned storage environments.
if (typeof window !== "undefined") {
  void setPersistence(firebaseAuth, browserLocalPersistence);
  clearFirebaseRedirectState();
}

/** Scrub any stale Firebase redirect state from sessionStorage. */
export function clearFirebaseRedirectState(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith("firebase:") || key.startsWith("auth/") || key.startsWith("redirect:"))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // sessionStorage inaccessible
  }
}

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
);
