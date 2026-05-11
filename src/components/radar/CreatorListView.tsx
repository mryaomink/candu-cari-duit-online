'use client';
import { useRadarNodes, useAppStore, useSearchState } from '@/store/useAppStore';
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
              <span style={{ fontSize: 12 }} title={tierCfg.label}>{tierCfg.badge}</span>
            )}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {node.creator.city}, {node.creator.province}
          </div>
        </div>
      </div>

      {/* Core Stats & Match */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-2) 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Peringkat</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#FBBF24' }}>★ {node.creator.avgRating.toFixed(1)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Jarak</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{node.distanceKm.toFixed(1)} km</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: node.glowColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Match</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: node.glowColor }}>{Math.round(node.matchScore * 100)}%</div>
        </div>
      </div>

      {/* Skills Overview */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {node.creator.skills.slice(0, 3).map((skill, i) => (
          <span key={i} className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', fontSize: 11, padding: '3px 8px' }}>
            {skill}
          </span>
        ))}
        {node.creator.skills.length > 3 && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>+{node.creator.skills.length - 3} more</span>
        )}
      </div>

      {/* Footer Action */}
      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {node.creator.hourlyRate > 0 ? `${formatIDR(node.creator.hourlyRate)}/jam` : 'Rate Menyesuaikan'}
        </div>
        <div style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          Buka Profil <span style={{ fontSize: 16 }}>→</span>
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
  const { activeSearchResults } = useSearchState();

  const filteredNodes = activeSearchResults === null 
    ? nodes 
    : nodes.filter(n => activeSearchResults.includes(n.creatorId));

  // STATE 1: ACTIVE SEARCHING SKELETON
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

  // STATE 2: IF WE HAVE FILTERED RESULTS -> RENDER THEM
  if (filteredNodes.length > 0) {
    // Execution falls through to bottom return
  } 
  // STATE 3: NO RESULTS FOUND FOR ACTIVE QUERY
  else if (prompt.trim() || activeSearchResults !== null) {
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
  // STATE 4: ABSOLUTE ZERO STATE -> Show Robot Onboarding Splash
  else {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 'var(--space-20) var(--space-6)', 
        textAlign: 'center',
        minHeight: '60vh'
      }} className="animate-scale-in">
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(0, 216, 255, 0.05)',
          border: '1px solid rgba(0, 216, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          marginBottom: 'var(--space-6)',
          boxShadow: '0 0 40px rgba(0, 216, 255, 0.1)',
        }} className="animate-pulse-slow">
          🤖
        </div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-3)', letterSpacing: '-0.02em' }}>
          Pustaka Talenta Anda Masih Kosong
        </h2>
        <p style={{ maxWidth: 480, color: 'var(--color-text-muted)', fontSize: 'var(--text-base)', lineHeight: 1.6, marginBottom: 'var(--space-8)' }}>
          Mulailah menjelajah dengan mengetikkan kebutuhan proyek Anda. Setiap talenta relevan yang ditemukan oleh radar AI akan ditambahkan ke koleksi permanen Anda di sini.
        </p>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '100%', marginBottom: 8, letterSpacing: 1 }}>Cobalah ketik untuk membuka 'Fog of War':</div>
          <span className="glass" style={{ padding: '8px 16px', borderRadius: 20, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => document.getElementById('nlp-search-input')?.focus()}>"Fotografer wedding minimalis"</span>
          <span className="glass" style={{ padding: '8px 16px', borderRadius: 20, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => document.getElementById('nlp-search-input')?.focus()}>"Jasa Desain Logo UMKM"</span>
        </div>
      </div>
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
        {filteredNodes.map((node) => (
          <div key={node.creatorId} role="listitem">
            <CreatorCard node={node} />
          </div>
        ))}
      </div>
    </div>
  );
}
