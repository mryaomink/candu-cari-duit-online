'use client';
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatIDR, TIER_CONFIG } from '@/types';
import EditProfileModal from './EditProfileModal';

export default function CreatorDashboard() {
  const appUser = useAppStore((s) => s.user);
  const [showEdit, setShowEdit] = useState(false);

  const tier = appUser?.tier || 'free';
  const cfg = TIER_CONFIG[tier];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* High End Hero Grid Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: 24 
      }}>
        
        {/* Left Panel: Creator Profile Status Card */}
        <div className="glass-strong animate-fade-in" style={{ 
          padding: '32px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          background: 'linear-gradient(145deg, rgba(15, 22, 41, 0.9), rgba(3, 7, 18, 0.95))',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Glow Orbs */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'var(--color-primary)', filter: 'blur(60px)', opacity: 0.15 }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: 16, 
              background: 'var(--color-primary-dim)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: 'var(--color-primary)',
              border: '1px solid rgba(0,216,255,0.3)',
              boxShadow: 'var(--glow-primary)'
            }}>
              {appUser?.displayName?.charAt(0) || 'C'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{appUser?.displayName}</h2>
                <span className="badge badge-secondary" style={{ fontSize: 10 }}>{cfg.badge} {cfg.label}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                📍 {appUser?.city || 'Lokasi belum diset'}
              </p>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: 12, 
            padding: '16px',
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>KAPASITAS RADAR</span>
              <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 700 }}>PRO</span>
            </div>
            <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '75%', background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))', borderRadius: 3 }} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setShowEdit(true)} style={{ width: '100%', padding: '14px' }}>
            ⚡ Edit Pengaturan Radar
          </button>
        </div>

        {/* Right Panel: Metric Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="glass glass-hover animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', animationDelay: '0.1s' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              💰
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Saldo Aktif</span>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: 'var(--color-success)' }}>
              {formatIDR(appUser?.balance || 0)}
            </h3>
          </div>

          <div className="glass glass-hover animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', animationDelay: '0.2s' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              🚀
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Proyek Berjalan</span>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: '#fff' }}>
              0
            </h3>
          </div>

          <div className="glass glass-hover animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', animationDelay: '0.3s', gridColumn: 'span 2' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Jangkauan Pencarian AI</span>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#fff' }}>Sangat Optimal</h3>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--color-primary)' }}>
                  100
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Secondary Dashboard Section: Latest Activity / Promotion */}
      <div className="glass animate-slide-up" style={{ 
        padding: '40px 24px', 
        textAlign: 'center', 
        borderStyle: 'dashed', 
        borderColor: 'rgba(255,255,255,0.1)',
        animationDelay: '0.4s'
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Tunggu Sinyal Masuk</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto 24px' }}>
          Profil Anda sedang dipindai oleh mesin pencari Hyperlocal AI kami. Klien akan segera menghubungi Anda melalui radar.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <div className="badge badge-primary" style={{ animation: 'pulse 2s infinite' }}>Radar ON</div>
          <div className="badge badge-success">Live Data</div>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal isOpen={showEdit} onClose={() => setShowEdit(false)} />
      )}

    </div>
  );
}
