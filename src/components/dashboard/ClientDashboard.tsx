'use client';
import { useRouter } from 'next/navigation';

export default function ClientDashboard() {
  const router = useRouter();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      
      {/* Client Status Placeholder */}
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>🔍</div>
        <h2 style={{ fontSize: 'var(--text-xl)' }}>Belum ada pesanan aktif</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
          Gunakan Radar CANDU untuk menemukan kreator spesialis di sekitarmu secara instan.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/')}>Buka Radar</button>
      </div>

    </div>
  );
}
