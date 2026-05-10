'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { subscribeToAuth, getAppUser } from '@/lib/authService';
import { getFeatureFlags } from '@/lib/featureFlags';
import Toast from '@/components/ui/Toast';

// Silence harmless upstream Three.js deprecation warnings leaking into console
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
      return;
    }
    originalWarn(...args);
  };
}

/**
 * AppProvider — Invisible provider component that bootstraps:
 * 1. Firebase Auth listener → Zustand store
 * 2. Feature flags fetch
 * 3. WebGL detection
 */
export default function AppProvider({ children }: { children: React.ReactNode }) {
  const {
    setFirebaseUser,
    setUser,
    setAuthLoading,
    setWebglSupported,
    setFeatureFlags,
    setView,
  } = useAppStore();

  // ─── WebGL Detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const supported =
      !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    setWebglSupported(supported);
    if (!supported) setView('list');
  }, [setWebglSupported, setView]);

  // ─── Feature Flags ─────────────────────────────────────────────────────────
  useEffect(() => {
    getFeatureFlags().then(setFeatureFlags).catch(() => {});
  }, [setFeatureFlags]);

  // ─── Auth Listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      if (fbUser) {
        setFirebaseUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        });
        const appUser = await getAppUser(fbUser.uid);
        setUser(appUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, [setAuthLoading, setFirebaseUser, setUser]);

  return (
    <>
      {children}
      <Toast />
    </>
  );
}
