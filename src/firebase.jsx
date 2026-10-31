import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from "firebase/firestore";
import { initializeAppCheck, CustomProvider } from "firebase/app-check";

// WebKit IndexedDB Error Recovery:
// Under WebKit (WebKitGTK on Linux / WKWebView on macOS), IndexedDB connections can be dropped
// abruptly by IDBServer or frozen during process suspension (WebKit Bug 226547 / 197050).
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || String(event.reason || "");
    if (
      reason.includes("Indexed Database server") ||
      reason.includes("without an in-progress transaction") ||
      reason.includes("Connection to Indexed Database server lost")
    ) {
      console.warn("Recovered from transient WebKit IndexedDB connection drop:", reason);
      event.preventDefault();
    }
  });
}

// Configure Firebase App Check debug token (registered in Firebase Console for fledgeportal)
const APPCHECK_DEBUG_TOKEN =
  import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;

if (typeof window !== "undefined") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with resilient local cache handling:
// WebKit (WebKitGTK in Tauri Linux & WKWebView in macOS) frequently hits IndexedDB transaction
// and lock server bugs (WebKit Bug 226547 / 197050) with persistentMultipleTabManager.
// We safely attempt persistentLocalCache and fall back gracefully to memoryLocalCache or getFirestore.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (err) {
  try {
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch (fallbackErr) {
    dbInstance = getFirestore(app);
  }
}
export const db = dbInstance;

// Initialize App Check with debug token provider for development/desktop environments
let appCheckInstance = null;
if (typeof window !== "undefined" && APPCHECK_DEBUG_TOKEN) {
  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: () => {
          return Promise.resolve({
            token: APPCHECK_DEBUG_TOKEN,
            expireTimeMillis: Date.now() + 60 * 60 * 1000,
          });
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("Firebase App Check initialization info:", err?.message || err);
  }
}
export const appCheck = appCheckInstance;

