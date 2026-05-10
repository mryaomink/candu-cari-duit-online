import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getRemoteConfig } from 'firebase/remote-config';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Placeholder config used during SSR/build when env vars are not set
const firebaseConfig = {
  apiKey: apiKey ?? 'build-placeholder-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'placeholder.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'placeholder',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'placeholder.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:0000000000000000000000',
};

// Guard: skip real initialization during SSR build without real keys
const isConfigured = !!apiKey && apiKey !== 'your_api_key_here';

// ─── Initialize Firebase App (singleton) ──────────────────────────────────────
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ─── Firestore — named database: "candu" with offline persistence ─────────────
let db: ReturnType<typeof getFirestore>;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, 'candu'); // ← named database
} catch {
  // Already initialized (hot reload in dev)
  db = getFirestore(app, 'candu');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const auth = getAuth(app);

// ─── Cloud Functions ──────────────────────────────────────────────────────────
const functions = getFunctions(app, 'asia-southeast2'); // Jakarta region

// ─── Remote Config ────────────────────────────────────────────────────────────
let remoteConfig: ReturnType<typeof getRemoteConfig> | null = null;
if (typeof window !== 'undefined') {
  remoteConfig = getRemoteConfig(app);
  remoteConfig.settings.minimumFetchIntervalMillis = 5 * 60 * 1000; // 5 min cache
  remoteConfig.defaultConfig = {
    use_vertex_rag: 'true',
    radar_bloom_variant: 'A',
    show_escrow: 'true',
    max_search_radius_km: '50',
    maintenance_mode: 'false',
    creator_tier_enabled: 'true',
  };
}

// ─── Emulator (dev only) ──────────────────────────────────────────────────────
if (
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { app, db, auth, functions, remoteConfig };
