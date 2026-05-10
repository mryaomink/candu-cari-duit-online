'use client';
import { useState } from 'react';
import { useAppStore, useLocation, useFirebaseUser } from '@/store/useAppStore';
import { updateUserProfile, getAppUser } from '@/lib/authService';
import { logError } from '@/lib/logger';
import { GeoPoint } from 'firebase/firestore';

export default function OnboardingFlow() {
  const { isOnboarding, setOnboarding, setUser, showToast } = useAppStore();
  const firebaseUser = useFirebaseUser();
  const location = useLocation();
  
  const [role, setRole] = useState<'client' | 'creator'>('client');
  const [loading, setLoading] = useState(false);

  if (!isOnboarding || !firebaseUser) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const userLoc = location.lat && location.lng 
        ? new GeoPoint(location.lat, location.lng) 
        : null;

      await updateUserProfile(firebaseUser.uid, {
        role,
        city: location.city || 'Unknown',
        province: location.province || '',
        location: userLoc,
      });

      // Re-hydrate zustand with completed profile
      const updated = await getAppUser(firebaseUser.uid);
      setUser(updated);
      
      setOnboarding(false);
      showToast(`Profil berhasil dibuat sebagai ${role}!`, 'success');
    } catch (err) {
      logError('FIRESTORE_WRITE_ERROR', 'Onboarding step failure', { err }, firebaseUser.uid);
      showToast('Gagal menyimpan profil. Silakan coba sesaat lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="glass-strong animate-slide-up" style={{ width: '100%', maxWidth: 460, padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Selesaikan Profilmu</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Halo {firebaseUser.displayName?.split(' ')[0]}, apa tujuan utamamu di CANDU?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Option: Client */}
          <div 
            onClick={() => setRole('client')}
            className="glass"
            style={{
              padding: 'var(--space-5)',
              cursor: 'pointer',
              border: `2px solid ${role === 'client' ? 'var(--color-primary)' : 'transparent'}`,
              background: role === 'client' ? 'var(--color-primary-dim)' : 'var(--color-surface)',
              transition: 'all var(--transition-fast)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 24 }}>🤝</span>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>Saya Mencari Kreator</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Saya mewakili bisnis/event yang butuh jasa konten.
                </p>
              </div>
            </div>
          </div>

          {/* Option: Creator */}
          <div 
            onClick={() => setRole('creator')}
            className="glass"
            style={{
              padding: 'var(--space-5)',
              cursor: 'pointer',
              border: `2px solid ${role === 'creator' ? 'var(--color-primary)' : 'transparent'}`,
              background: role === 'creator' ? 'var(--color-primary-dim)' : 'var(--color-surface)',
              transition: 'all var(--transition-fast)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 24 }}>🎨</span>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>Saya Adalah Kreator</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Ingin menawarkan jasa fotografi, video, atau desain.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detected Location Confirmation */}
        <div style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-4)',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>📍 Lokasi terdeteksi:</span>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {location.city || 'Indonesia'}
            </div>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: location.lat ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {location.lat ? 'Presisi Aktif' : 'Lokasi Default'}
          </span>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 'var(--space-6)', height: 48 }}
        >
          {loading ? <span className="animate-spin">⟳</span> : 'Mulai Eksplorasi'}
        </button>
      </div>
    </div>
  );
}
