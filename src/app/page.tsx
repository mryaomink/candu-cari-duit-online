'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/components/ui/Toast';
import { useAppStore, useUIState, useFirebaseUser, useLocation } from '@/store/useAppStore';
import { getCurrentLocation, reverseGeocode } from '@/lib/geo';
import { fetchAllCreators } from '@/lib/searchService';
import { logError } from '@/lib/logger';

// All Firebase-dependent components loaded client-side only (no SSR)
const AppProvider = dynamic(() => import('@/components/AppProvider'), { ssr: false });
const NLPSearchBar = dynamic(() => import('@/components/search/NLPSearchBar'), { ssr: false });
const PortfolioModal = dynamic(() => import('@/components/portfolio/PortfolioModal'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const OnboardingFlow = dynamic(() => import('@/components/auth/OnboardingFlow'), { ssr: false });
const CreatorListView = dynamic(() => import('@/components/radar/CreatorListView'), { ssr: false });

// R3F Canvas — client-only, no SSR
const RadarCanvas = dynamic(() => import('@/components/radar/RadarCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <div className="animate-spin" style={{ fontSize: 40, color: 'var(--color-primary)' }}>⟳</div>
      <div className="mono uppercase-tracked" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        Memuat Radar...
      </div>
    </div>
  ),
});

// ─── Unified Control Dock (Combines Nav + Search) ─────────────────────────────
import AppShell from '@/components/layout/AppShell';

// ─── Location Bootstrap ───────────────────────────────────────────────────────
function LocationBootstrap() {
  const { setLocation, setLocationLoading, setLocationDenied } = useAppStore();
  useEffect(() => {
    setLocationLoading(true);
    getCurrentLocation().then(async (coords) => {
      if (!coords) {
        setLocationDenied(true);
        setLocationLoading(false);
        setLocation(-2.5, 117.0, 'Indonesia', '');
        return;
      }
      const { city, province } = await reverseGeocode(coords.lat, coords.lng);
      setLocation(coords.lat, coords.lng, city, province);
      setLocationLoading(false);
    }).catch((err) => {
      logError('LOCATION_DENIED', 'Geolocation failed', { err });
      setLocationDenied(true);
      setLocationLoading(false);
      setLocation(-2.5, 117.0, 'Indonesia', '');
    });
  }, [setLocation, setLocationLoading, setLocationDenied]);
  return null;
}

// ─── Initial Data Loader ──────────────────────────────────────────────────────
function DataBootstrap() {
  const { lat, lng, locationLoading } = useLocation();
  const firebaseUser = useFirebaseUser();
  const setNodes = useAppStore((s) => s.setNodes);
  useEffect(() => {
    if (!locationLoading && lat !== null && lng !== null) {
      fetchAllCreators(lat, lng, firebaseUser?.uid)
        .then((liveNodes) => { setNodes(liveNodes); })
        .catch((err) => { logError('FIRESTORE_READ_ERROR', 'Failed', { err }); });
    }
  }, [lat, lng, locationLoading, setNodes]);
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { view, webglSupported, isPortfolioOpen, isAuthModalOpen } = useUIState();

  return (
    <AppProvider>
      <LocationBootstrap />
      <DataBootstrap />
      
      <AppShell showSearch={true}>
        {view === 'radar' && webglSupported ? (
          <RadarCanvas />
        ) : (
          <div style={{ height: '100%', overflowY: 'auto', padding: '40px 32px' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.5px' }}>Available Talents</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 16 }}>Jelajahi direktori kreator di sekitarmu</p>
              </div>
              <CreatorListView />
            </div>
          </div>
        )}
      </AppShell>

      {/* Global Modals */}
      {isPortfolioOpen && <PortfolioModal />}
      {isAuthModalOpen && <AuthModal />}
      <OnboardingFlow />
      <Toast />
    </AppProvider>
  );
}
