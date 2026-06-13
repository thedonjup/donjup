import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

function getServiceAccount(): ServiceAccount | null {
  const raw =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

function initAdmin() {
  if (adminApp) return;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    adminAuth = getAuth(adminApp);
    adminFirestore = getFirestore(adminApp);
    return;
  }

  const sa = getServiceAccount();
  if (!sa) {
    // No service account — graceful degradation
    return;
  }

  try {
    adminApp = initializeApp({ credential: cert(sa) });
    adminAuth = getAuth(adminApp);
    adminFirestore = getFirestore(adminApp);
  } catch {
    // Initialization failed — graceful degradation
    adminApp = null;
    adminAuth = null;
    adminFirestore = null;
  }
}

export function getAdminAuth(): Auth | null {
  initAdmin();
  return adminAuth;
}

export function getAdminFirestore(): Firestore | null {
  initAdmin();
  return adminFirestore;
}
