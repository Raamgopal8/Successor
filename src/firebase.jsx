import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
} from "firebase/firestore";

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

// Initialize Firestore
export const db = getFirestore(app);


