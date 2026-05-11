'use client';
import { useState } from 'react';
import { signInWithGoogle } from '@/lib/authService';
import { useAppStore } from '@/store/useAppStore';

import Link from 'next/link';

const GOOGLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal() {
  const { setAuthModalOpen, setOnboarding, showToast } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { isNew } = await signInWithGoogle();
      setAuthModalOpen(false);
      if (isNew) {
        setOnboarding(true); // Trigger onboarding flow
      } else {
        showToast('Selamat datang kembali!', 'success');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code !== 'auth/popup-closed-by-user') {
        showToast('Gagal masuk. Coba lagi.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setAuthModalOpen(false)} role="dialog" aria-modal="true" aria-label="Masuk ke CANDU">
      <div
        className="glass-strong animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, padding: 'var(--space-10)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-8)' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
            <span className="text-gradient-primary">C A N D U</span>
          </div>
          <div className="mono uppercase-tracked" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
            Hyperlocal Creator Radar
          </div>
        </div>

        {/* Value prop */}
        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
            Temukan Kreator Lokal
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            Masuk untuk mengakses radar talenta hyperlocal berbasis AI dan mulai berkolaborasi.
          </p>
        </div>

        {/* Divider */}
        <hr className="divider" style={{ width: '100%' }} />

        {/* Google Sign-In */}
        <button
          id="google-signin-btn"
          className="btn btn-ghost"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            height: 52,
            fontSize: 'var(--text-base)',
            gap: 'var(--space-3)',
            borderColor: 'var(--color-border-hover)',
          }}
          aria-label="Masuk dengan Google"
        >
          {loading ? (
            <span className="animate-spin" style={{ fontSize: 18 }}>⟳</span>
          ) : (
            GOOGLE_ICON
          )}
          {loading ? 'Memproses...' : 'Lanjutkan dengan Google'}
        </button>

        {/* Terms */}
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Dengan masuk, kamu menyetujui{' '}
          <Link href="/terms" onClick={() => setAuthModalOpen(false)} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Syarat & Ketentuan</Link>
          {' '}dan{' '}
          <Link href="/privacy" onClick={() => setAuthModalOpen(false)} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Kebijakan Privasi</Link>{' '}
          CANDU.
        </p>

        {/* Close */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setAuthModalOpen(false)}
          style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', padding: 'var(--space-2)', borderRadius: 'var(--radius-full)' }}
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
