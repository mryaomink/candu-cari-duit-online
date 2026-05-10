'use client';
import { useRadarNodes, useAppStore } from '@/store/useAppStore';
import EmptyState from '@/components/ui/EmptyState';
import { CreatorCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatIDR, TIER_CONFIG } from '@/types';
import type { RadarNode } from '@/types';

function CreatorCard({ node }: { node: RadarNode }) {
  const { setSelectedNode, setPortfolioOpen } = useAppStore();
  const tierCfg = TIER_CONFIG[node.creator.tier];

  return (
    <article
      className="card glass-hover"
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      onClick={() => { setSelectedNode(node); setPortfolioOpen(true); }}
      role="button"
      tabIndex={0}
      aria-label={`Lihat profil ${node.creator.displayName}`}
      onKeyDown={(e) => e.key === 'Enter' && (setSelectedNode(node), setPortfolioOpen(true))}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${node.glowColor}40, ${node.glowColor}10)`,
            border: `2px solid ${node.glowColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {node.creator.displayName.charAt(0)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              {node.creator.displayName}
            </h3>
            {node.creator.isVerified && (
              <span className="badge badge-primary" style={{ fontSize: 10 }}>✓ Terverifikasi</span>
            )}
            {node.creator.tier !== 'free' && (
              <span className="badge badge-secondary" style={{ fontSize: 10 }}>
                {tierCfg.badge} {tierCfg.label}
              </span>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>📍</span> {node.creator.city} · {node.distanceKm.toFixed(1)} km
          </p>
        </div>

        {/* Match score */}
        <div
          style={{
            textAlign: 'center',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: `${node.glowColor}15`,
            border: `1px solid ${node.glowColor}30`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: node.glowColor }}>
            {Math.round(node.matchScore * 100)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>match</div>
        </div>
      </div>

      {/* Bio */}
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {node.creator.bio}
      </p>

      {/* Skills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {node.creator.skills.map((skill) => (
          <span key={skill} className="skill-chip">{skill}</span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
        <div>
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {formatIDR(node.creator.hourlyRate)}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>/jam</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {node.creator.totalProjects > 0 
              ? `⭐ ${node.creator.avgRating.toFixed(1)}` 
              : '✨ Baru'
            } · {node.creator.totalProjects} proyek
          </span>
          <span
            className="status-dot"
            style={{ background: node.creator.isAvailable ? 'var(--color-success)' : 'var(--color-text-muted)' }}
          />
        </div>
      </div>
    </article>
  );
}

export default function CreatorListView() {
  const nodes = useRadarNodes();
  const isSearching = useAppStore((s) => s.isSearching);
  const prompt = useAppStore((s) => s.prompt);
  const setView = useAppStore((s) => s.setView);

  if (isSearching) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
          padding: 'var(--space-4)',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => <CreatorCardSkeleton key={i} />)}
      </div>
    );
  }

  if (nodes.length === 0 && prompt.trim()) {
    return (
      <EmptyState
        icon="🔭"
        title="Tidak ada kreator ditemukan"
        description={`Tidak ada kreator yang cocok untuk "${prompt}". Coba perluas radius atau ubah kriteria pencarian.`}
        action={{ label: 'Perluas Radius', onClick: () => useAppStore.getState().setRadiusKm(100) }}
        secondaryAction={{ label: 'Bersihkan Pencarian', onClick: () => useAppStore.getState().setPrompt('') }}
      />
    );
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon="✨"
        title="Belum ada kreator di radarmu"
        description="Ketik apa yang kamu butuhkan di kotak pencarian di atas untuk menemukan kreator lokal terbaik."
        action={{ label: 'Coba Radar 3D', onClick: () => setView('radar') }}
      />
    );
  }

  return (
    <div>
      <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          {nodes.length} kreator ditemukan
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setView('radar')} id="switch-to-radar-btn">
          🌐 Tampilan Radar
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
          padding: 'var(--space-4)',
        }}
        role="list"
        aria-label="Daftar kreator"
      >
        {nodes.map((node) => (
          <div key={node.creatorId} role="listitem">
            <CreatorCard node={node} />
          </div>
        ))}
      </div>
    </div>
  );
}
