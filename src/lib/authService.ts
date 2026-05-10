import { auth, db } from '@/lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  GeoPoint,
} from 'firebase/firestore';
import type { AppUser, UserRole } from '@/types';
import { logError, logInfo } from '@/lib/logger';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// ─── Sign In with Google ──────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<{ user: User; isNew: boolean }> {
  try {
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;

    // Check if user doc exists
    const docRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(docRef);
    const isNew = !snap.exists();

    if (isNew) {
      // Create base user doc — role set in onboarding
      await setDoc(docRef, {
        uid: fbUser.uid,
        email: fbUser.email ?? '',
        displayName: fbUser.displayName ?? '',
        photoURL: fbUser.photoURL ?? '',
        role: 'client', // default — changed in onboarding
        tier: 'free',
        tierExpiresAt: null,
        location: null,
        city: '',
        province: '',
        balance: 1000000, // IDR 1.000.000 dummy balance for demo
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      logInfo('API_INFO', `New user created: ${fbUser.uid}`); 
    }

    return { user: fbUser, isNew };
  } catch (err) {
    await logError('AUTH_FAILED', 'Google sign-in failed', { err });
    throw err;
  }
}

// ─── Sign Out ──────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    await logError('AUTH_FAILED', 'Sign out failed', { err });
    throw err;
  }
}

// ─── Get App User from Firestore ──────────────────────────────────────────────
export async function getAppUser(uid: string): Promise<AppUser | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as AppUser;
  } catch (err) {
    await logError('FIRESTORE_READ_ERROR', 'Failed to fetch user doc', { uid, err });
    return null;
  }
}

// ─── Update User Role & Location (onboarding) ────────────────────────────────
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<AppUser, 'role' | 'city' | 'province' | 'location'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    await logError('FIRESTORE_WRITE_ERROR', 'Failed to update user profile', { uid, err });
    throw err;
  }
}

// ─── Subscribe to Auth State ──────────────────────────────────────────────────
export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
