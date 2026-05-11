'use client';
import { useState } from 'react';
import { useSearchState, useAppStore } from '@/store/useAppStore';

export default function AIInsightsBanner() {
  const { aiInsights, isSearching } = useSearchState();
  const { setAiInsights } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  if (isSearching || !aiInsights) return null;

  const hasDetails = !!(aiInsights.strategicTip || aiInsights.marketPulse);

  return (
    <div className="animate-fade-in" style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: 360,
      background: 'linear-gradient(165deg, rgba(13, 24, 42, 0.92) 0%, rgba(7, 13, 24, 0.95) 100%)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(0, 216, 255, 0.25)',
      borderRadius: 20,
      padding: 0,
      boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,216,255,0.05)',
      zIndex: 50,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Header Bar */}
      <div style={{ 
        background: 'rgba(0, 216, 255, 0.06)', 
        padding: '12px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 216, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D8FF', boxShadow: '0 0 12px #00D8FF' }} />
          <span className="mono" style={{ fontSize: 11, fontWeight: 900, color: '#00D8FF', letterSpacing: 1.5 }}>AI INTELLIGENCE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {aiInsights.marketPulse && (
            <div style={{ 
              fontSize: 9, 
              fontWeight: 800, 
              background: 'rgba(255,255,255,0.1)', 
              color: '#fff', 
              padding: '3px 8px', 
              borderRadius: 6, 
              border: '1px solid rgba(255,255,255,0.1)' 
            }}>
              PULSA: {aiInsights.marketPulse.toUpperCase()}
            </div>
          )}
          <button 
            onClick={() => setAiInsights(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Context Cluster */}
        <div style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>
            Sektor Teridentifikasi
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {aiInsights.detectedIndustry}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}>
              {expanded ? 'Ringkas' : 'Detail'}
            </div>
          </div>
        </div>

        {/* Realtime Trends */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {aiInsights.trends?.map((trend: string, i: number) => (
            <div key={i} style={{ 
              fontSize: 12, 
              padding: '6px 12px', 
              borderRadius: 8, 
              background: 'rgba(0, 216, 255, 0.08)', 
              border: '1px solid rgba(0, 216, 255, 0.15)',
              color: '#e2e8f0',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flex: '1 0 45%'
            }}>
              <span style={{ fontSize: 14 }}>⚡</span> {trend}
            </div>
          ))}
        </div>

        {/* Expanded Knowledge Deep Dive */}
        {expanded && (
          <div className="animate-slide-down" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
            
            {/* Matching Logic */}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600 }}>ANALISIS KECOCOKAN:</div>
              <div style={{ 
                fontSize: 13, 
                lineHeight: 1.6,
                color: '#a78bfa', 
                background: 'rgba(167, 139, 250, 0.08)',
                padding: '12px 14px',
                borderRadius: 12,
                borderLeft: '3px solid #7C3AED',
              }}>
                "{aiInsights.matchReasoning}"
              </div>
            </div>

            {/* Strategic Insight */}
            {aiInsights.strategicTip && (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600 }}>SARAN STRATEGIS:</div>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 500,
                  color: '#fcd34d', 
                  background: 'rgba(252, 211, 77, 0.08)',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(252, 211, 77, 0.1)',
                }}>
                  💡 {aiInsights.strategicTip}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grounding Footer */}
        <div style={{ 
          marginTop: 4, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          fontSize: 10, 
          color: 'rgba(255,255,255,0.35)',
          fontWeight: 500
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          Terverifikasi oleh Google Search Live Grounding
        </div>
      </div>
    </div>
  );
}
