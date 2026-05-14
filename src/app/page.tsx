'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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

const AvatarScene = dynamic(() => import('@/components/avatar/AvatarScene'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'fixed', inset: 0, background: '#050012', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ fontSize: 40, color: '#7C3AED' }}>⟳</div>
    </div>
  ),
});

// ─── Location Bootstrap ───────────────────────────────────────────────────────
function LocationBootstrap() {
  const { setLocation, setLocationLoading, setLocationDenied } = useAppStore();
  const showToast = useAppStore((s) => s.showToast);
  useEffect(() => {
    setLocationLoading(true);
    getCurrentLocation().then(async (coords) => {
      if (coords.lat === null || coords.lng === null) {
        const code = coords.error;
        if (code === 1) {
          showToast('Akses lokasi ditolak. Menampilkan radar default Indonesia.', 'info');
        } else if (code === 2) {
          showToast('Lokasi tidak tersedia saat ini. Menggunakan radar default.', 'info');
        } else if (code === 3) {
          showToast('Permintaan lokasi melebihi batas waktu. Menggunakan radar default.', 'info');
        } else if (code === 0) {
          showToast('Browser tidak mendukung geolocation. Menggunakan radar default.', 'info');
        }
        logError('LOCATION_DENIED', 'Geolocation failed', { code });
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
  }, [setLocation, setLocationLoading, setLocationDenied, showToast]);
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { view, webglSupported, isPortfolioOpen, isAuthModalOpen } = useUIState();
  const setView = useAppStore((s) => s.setView);

  return (
    <AppProvider>
      <LocationBootstrap />
      
      {/* Base 3D Layer */}
      <AvatarScene />

      {/* Overlay Layers */}
      {view === 'radar' && webglSupported && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#050012' }}>
          <button 
            onClick={() => setView('avatar')}
            style={{
              position: 'absolute', top: 32, left: 32, zIndex: 60,
              background: 'rgba(26, 11, 46, 0.8)', border: '1px solid rgba(124, 58, 237, 0.5)',
              color: '#fff', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
              backdropFilter: 'blur(8px)', fontWeight: 600
            }}
          >
            ← Kembali ke Hub
          </button>
          <RadarCanvas />
        </div>
      )}

      {view === 'list' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(5, 0, 18, 0.8)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'
        }}>
          <button 
            onClick={() => setView('avatar')}
            style={{
              position: 'absolute', top: 32, right: 32,
              background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
            }}
          >
            ×
          </button>
          
          <div className="glass-strong" style={{ width: '100%', maxWidth: 1000, height: '100%', maxHeight: '800px', overflowY: 'auto', padding: '32px' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>Daftar Talenta</h2>
              <p style={{ color: 'var(--color-primary)', fontSize: 16 }}>Jelajahi direktori kreator di sekitarmu</p>
            </div>
            <CreatorListView />
          </div>
        </div>
      )}

      {/* Global Modals */}
      {isPortfolioOpen && <PortfolioModal />}
      {isAuthModalOpen && <AuthModal />}
      <OnboardingFlow />
    </AppProvider>
  );
}
