'use client';
import { useAppStore, useUIState, useFirebaseUser } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';

interface MenuBoxProps {
  label: string;
  subLabel: string;
  icon: string;
  onClick: () => void;
  active?: boolean;
}

function MenuBox({ label, subLabel, icon, onClick, active }: MenuBoxProps) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        width: '300px',
        padding: '12px 16px',
        background: active ? 'rgba(255, 184, 0, 0.1)' : 'rgba(10, 5, 20, 0.5)',
        border: '1px solid ' + (active ? '#FFB800' : 'rgba(124, 58, 237, 0.3)'),
        borderLeft: '4px solid ' + (active ? '#FFB800' : 'transparent'),
        backdropFilter: 'blur(10px)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        marginBottom: '8px',
        color: '#fff',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 184, 0, 0.05)';
        e.currentTarget.style.borderColor = 'rgba(255, 184, 0, 0.5)';
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(10, 5, 20, 0.5)';
          e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)';
        }
      }}
    >
      <div style={{
        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.2)', fontSize: '14px', color: active ? '#FFB800' : '#7C3AED'
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '12px', letterSpacing: '1px', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>{subLabel}</span>
      </div>
    </button>
  );
}

export default function InteractiveNodes() {
  const { setView, setAuthModalOpen, showToast, clearNodes, nodes, setActiveSearchResults } = useAppStore();
  const { view } = useUIState();
  const firebaseUser = useFirebaseUser();
  const router = useRouter();

  const handleShowRadar = () => {
    setView('avatar'); // Stay or return to the central view
    setActiveSearchResults(null); // Clear filters so all archived nodes appear orbiting
  };

  const handleResetArchive = () => {
    if (nodes.length === 0) {
      showToast('Radar Anda sudah kosong.', 'info');
      return;
    }
    const yes = window.confirm('Apakah Anda yakin ingin menghapus seluruh arsip radar Anda?');
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

  return (
    <div style={{
      position: 'absolute',
      left: '40px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
        {">"} NAVIGASI SISTEM
      </div>

      <MenuBox 
        label="RADAR KREATOR" 
        subLabel="[EKSPLORASI VISUAL]"
        icon="🌐"
        onClick={handleShowRadar}
        active={view === 'avatar' && nodes.length > 0}
      />
      
      <MenuBox 
        label="DAFTAR TALENTA" 
        subLabel="[DIREKTORI GLOBAL]"
        icon="📋"
        onClick={() => setView('list')}
        active={view === 'list'}
      />

      {firebaseUser && (
        <MenuBox 
          label="DASHBOARD SAYA" 
          subLabel="[PANEL KONTROL]"
          icon="📊"
          onClick={() => router.push('/dashboard')}
        />
      )}

      <div style={{ height: '20px' }} />

      <div style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
        {">"} STATUS PENGGUNA
      </div>

      {!firebaseUser ? (
        <MenuBox 
          label="MASUK / DAFTAR" 
          subLabel="[MEMERLUKAN AUTENTIKASI]"
          icon="👤"
          onClick={() => setAuthModalOpen(true)}
        />
      ) : (
        <div style={{
          width: '300px', padding: '16px', background: 'rgba(124, 58, 237, 0.1)',
          border: '1px solid rgba(124, 58, 237, 0.4)',
          backdropFilter: 'blur(10px)', display: 'flex', gap: '16px', alignItems: 'center',
          marginBottom: '8px'
        }}>
          <img 
            src={firebaseUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #7C3AED' }}
            alt="Profile"
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {firebaseUser.displayName || 'Pengguna'}
            </div>
            <button 
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: '10px', color: '#FF5555', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}
            >
              [ Keluar Sesi ]
            </button>
          </div>
        </div>
      )}

      {/* Functional Reset Logic */}
      <button 
        onClick={handleResetArchive}
        style={{
          width: '300px', marginTop: '8px', padding: '10px',
          background: 'transparent', border: '1px dashed rgba(255, 50, 50, 0.3)',
          color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontFamily: 'var(--font-mono)',
          cursor: 'pointer', textAlign: 'center', letterSpacing: '1px', transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5555'; e.currentTarget.style.borderColor = 'rgba(255, 50, 50, 0.6)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'; e.currentTarget.style.borderColor = 'rgba(255, 50, 50, 0.3)'; }}
      >
        🗑️ BERSIHKAN ARSIP RADAR
      </button>
    </div>
  );
}
