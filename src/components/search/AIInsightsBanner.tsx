'use client';
import { useSearchState, useAppStore } from '@/store/useAppStore';

export default function AIInsightsBanner() {
  const { aiInsights, isSearching } = useSearchState();
  const { setAiInsights } = useAppStore();

  if (isSearching || !aiInsights) return null;

  return (
    <div className="animate-fade-in" style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: 340,
      background: 'rgba(13, 19, 33, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(0, 216, 255, 0.2)',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 10px 40px rgba(0,0,0,0.4), 0 0 20px rgba(0,216,255,0.1)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }}></div>
          <span className="mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: 1 }}>VERTEX AI INSIGHTS</span>
        </div>
        <button 
          onClick={() => setAiInsights(null)}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 24, height: 24, borderRadius: '50%', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ×
        </button>
      </div>

      {/* Industry & Trends Grid */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Sektor Bisnis Lokal
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
          {aiInsights.detectedIndustry}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {aiInsights.trends?.map((trend: string, i: number) => (
            <div key={i} style={{ 
              fontSize: 12, 
              padding: '6px 12px', 
              borderRadius: 8, 
              background: 'rgba(0, 216, 255, 0.08)', 
              border: '1px solid rgba(0, 216, 255, 0.1)',
              color: '#fff',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ fontSize: 14 }}>📈</span> {trend}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)' }}></div>

      {/* Match Reasoning */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Rekomendasi AI:</div>
        <div style={{ 
          fontSize: 14, 
          lineHeight: 1.5,
          color: '#a78bfa', 
          background: 'rgba(167, 139, 250, 0.05)',
          padding: 12,
          borderRadius: 12,
          borderLeft: '3px solid #7C3AED',
          fontStyle: 'italic'
        }}>
          "{aiInsights.matchReasoning}"
        </div>
      </div>
    </div>
  );
}
