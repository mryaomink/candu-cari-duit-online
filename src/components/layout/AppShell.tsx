'use client';
import { useAppStore, useUIState, useFirebaseUser } from '@/store/useAppStore';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const NLPSearchBar = dynamic(() => import('@/components/search/NLPSearchBar'), { ssr: false });

export function Sidebar() {
  const { view, webglSupported } = useUIState();
  const { setView, setAuthModalOpen, showToast, clearNodes, nodes } = useAppStore();
  const firebaseUser = useFirebaseUser();
  const router = useRouter();

  const handleResetArchive = () => {
    if (nodes.length === 0) {
      showToast('Radar Anda sudah kosong.', 'info');
      return;
    }
    
    const yes = window.confirm('Apakah Anda yakin ingin menghapus seluruh arsip radar Anda? Tindakan ini akan mengosongkan kembali peta eksplorasi talenta Anda.');
    if (yes) {
      clearNodes();
      showToast('Radar telah dibersihkan secara permanen.', 'success');
    }
  };

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/authService');
    await signOut();
    showToast('Berhasil keluar.', 'info');
  };

  const pathname = usePathname();
  const isAtHome = pathname === '/';
  const isAtDashboard = pathname?.includes('dashboard') || false;

  return (
    <aside className="hide-on-mobile" style={{
      width: 280,
      height: '100vh',
      background: 'rgba(10, 15, 30, 0.6)',
      borderRight: '1px solid var(--color-border)',
      backdropFilter: 'blur(24px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      flexShrink: 0,
      zIndex: 100,
      position: 'relative',
    }}>
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => router.push('/')}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, var(--color-primary), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff' }}>C</div>
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>CANDU</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, letterSpacing: 1 }}>JELAJAH</div>
        <NavButton 
          active={isAtHome && view === 'radar' && webglSupported} 
          onClick={() => { router.push('/'); setTimeout(() => setView('radar'), 50); }} 
          icon="🌐" label="Radar Kreator" 
        />
        <NavButton 
          active={isAtHome && (view === 'list' || !webglSupported)} 
          onClick={() => { router.push('/'); setTimeout(() => setView('list'), 50); }} 
          icon="☰" label="Daftar Talenta" 
        />
        
        <div className="mono" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 24, marginBottom: 8, letterSpacing: 1 }}>MANAJEMEN</div>
        <NavButton 
          active={isAtDashboard} 
          onClick={() => router.push('/dashboard')} 
          icon="📊" label="Dashboard Saya" 
        />

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <button 
            onClick={handleResetArchive}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px dashed rgba(239, 68, 68, 0.2)',
              background: 'transparent',
              color: 'rgba(239, 68, 68, 0.8)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(239, 68, 68, 0.8)';
            }}
          >
            <span>🗑️</span> Reset Arsip Radar
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
        {firebaseUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={firebaseUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} width={40} height={40} style={{ borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }} alt="User" />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firebaseUser.displayName}</div>
              <button onClick={handleSignOut} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--color-error)', cursor: 'pointer', opacity: 0.8 }}>Keluar</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAuthModalOpen(true)}>Masuk Akun</button>
        )}
      </div>
    </aside>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
      background: active ? 'rgba(0, 216, 255, 0.1)' : 'transparent',
      color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
      transition: 'all 0.2s ease',
      textAlign: 'left', width: '100%', fontWeight: 600, fontSize: 15,
      outline: 'none'
    }} className="nav-btn-hover">
      <span style={{ fontSize: 18, filter: active ? 'none' : 'grayscale(100%) opacity(0.7)' }}>{icon}</span>
      {label}
      <style jsx>{`
        .nav-btn-hover:hover {
          background: ${active ? 'rgba(0, 216, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
          color: ${active ? 'var(--color-primary)' : '#fff'};
        }
      `}</style>
    </button>
  );
}

import AIInsightsBanner from '@/components/search/AIInsightsBanner';

export default function AppShell({ children, showSearch = true }: { children: React.ReactNode, showSearch?: boolean }) {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--color-bg)', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Header Bar */}
        <header style={{
          height: 70,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(5, 10, 20, 0.5)',
          backdropFilter: 'blur(12px)',
          zIndex: 80,
          flexShrink: 0
        }}>
          {showSearch ? (
            <div style={{ width: '100%', maxWidth: 700 }}>
              <NLPSearchBar />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>Panel Kendali</div>
            </div>
          )}
        </header>

        {/* Scaled Viewport content */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {showSearch && <AIInsightsBanner />}
          {children}
        </div>
      </main>
    </div>
  );
}
