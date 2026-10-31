import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableNetwork, doc, getDocFromServer, Firestore } from 'firebase/firestore';

// Default configuration from provisioned Firebase project
// Fallback to environment variables if provided
import appletConfig from '../../firebase-applet-config.json';

interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export const targetDatabaseId = appletConfig.firestoreDatabaseId || 'ai-studio-7049e193-0b31-400e-a46c-4163cfd4f315';

function isValidApiKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length > 20 && !trimmed.toLowerCase().includes('placeholder') && trimmed !== 'apiKey';
}

export function getFirebaseConfig(): FirebaseConfigOptions | null {
  // 1. Authoritative configuration from provisioned firebase-applet-config.json
  if (appletConfig && isValidApiKey(appletConfig.apiKey) && appletConfig.projectId) {
    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      firestoreDatabaseId: appletConfig.firestoreDatabaseId || targetDatabaseId,
    };
  }

  // 2. Fallback to valid environment variables if provided (filtering out container dummy placeholders like 'apiKey')
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (isValidApiKey(envApiKey) && envProjectId && envProjectId !== 'projectId') {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      firestoreDatabaseId: targetDatabaseId,
    };
  }

  return null;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

const config = getFirebaseConfig();

if (config) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
    authInstance = getAuth(appInstance);

    // Initialize Firestore with standard settings and ignoreUndefinedProperties
    const dbId = config.firestoreDatabaseId || targetDatabaseId;
    try {
      dbInstance = initializeFirestore(
        appInstance,
        {
          ignoreUndefinedProperties: true,
        },
        dbId
      );
    } catch {
      dbInstance = getFirestore(appInstance, dbId);
    }

    // Warm up / test connection to Firestore as required by Firebase integration specifications
    (async () => {
      try {
        if (dbInstance) {
          await getDocFromServer(doc(dbInstance, 'test', 'connection'));
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn('[Firestore] Please check your Firebase configuration: client is offline.');
        }
      }
    })();
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
}

let lastNetworkEnableAttempt = 0;

/**
 * Re-enables network connection for Firestore if needed (throttled to avoid connection thrashing)
 */
export async function enableFirestoreNetwork(): Promise<void> {
  if (dbInstance) {
    const now = Date.now();
    if (now - lastNetworkEnableAttempt < 5000) {
      return;
    }
    lastNetworkEnableAttempt = now;
    try {
      await enableNetwork(dbInstance);
    } catch (err: any) {
      console.warn('[Firestore] enableNetwork notice:', err?.message || err);
    }
  }
}

export const reconnectFirestore = enableFirestoreNetwork;

export const isFirebaseReady = Boolean(appInstance && authInstance && dbInstance);
export const firebaseApp = appInstance;
export const auth = authInstance;
export const db = dbInstance;


