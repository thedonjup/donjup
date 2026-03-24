import { initializeApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo",
};

let auth: Auth;
let db: Firestore;

try {
  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
} catch {
  // Firebase 초기화 실패 시 빌드가 멈추지 않도록 방어
  const app = getApps().length > 0 ? getApps()[0] : initializeApp({ ...firebaseConfig, apiKey: "dummy" });
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
