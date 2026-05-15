'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore, useLocation, useSearchState } from '@/store/useAppStore';
import { nlpSearch } from '@/lib/searchService';
import { logError } from '@/lib/logger';

export default function NLPSearchBar() {
  const { prompt, isSearching, searchError, aiInsights } = useSearchState();
  const { lat, lng, city, locationLoading, locationDenied } = useLocation();
  const currentCity = city || 'daerah Anda';

  const dynamicExamples = [
    `Cari fotografer untuk acara di ${currentCity}`,
    `Jasa videografer cinematic area ${currentCity}`,
    `Desain logo UMKM lokal di ${currentCity}`,
    `Ahli IT / programmer panggilan di ${currentCity}`,
  ];
  const {
    setPrompt,
    setIsSearching,
    setSearchError,
    setNodes,
    setLastSearchAt,
    setParsedIntent,
    showToast,
    setAuthModalOpen,
    firebaseUser,
    setAiInsights,
    setActiveSearchResults,
    setView
  } = useAppStore();
  const { activeSearchResults } = useSearchState();

  const [focused, setFocused] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show examples when focused and prompt is empty
  useEffect(() => {
    setShowExamples(focused && prompt.trim().length === 0);
  }, [focused, prompt]);

  const handleSearch = useCallback(async (searchPrompt: string) => {
    if (!searchPrompt.trim()) return;
    if (!firebaseUser) {
      setAuthModalOpen(true);
      return;
    }
    // FALLBACK LOKASI: Jika browser menolak akses lokasi, gunakan koordinat Barabai/HST sebagai default
    // Ini mencegah error "LOCATION_DENIED" memblokir keseluruhan aplikasi
    const effectiveLat = lat || -2.5833;
    const effectiveLng = lng || 115.3833;
    const effectiveCity = city || 'Hulu Sungai Tengah';

    setIsSearching(true);
    setSearchError(null);
    const startTime = Date.now();

    try {
      // CALL REAL VERTEX SEARCH WITH RAG CONTEXT
      const { nodes: allNodes, insights, intent } = await nlpSearch(
        searchPrompt, 
        effectiveLat, 
        effectiveLng, 
        effectiveCity, 
        firebaseUser.uid,
        onlyVerified
      );

      // TRUST THE BACKEND RERANKER: Do not arbitrarily discard nodes the AI already approved!
      const relevantNodes = allNodes; // Fully open, 100% backend reliance.

      setNodes(relevantNodes);
      setActiveSearchResults(relevantNodes.map(n => n.creatorId));
      setAiInsights(insights);
      setLastSearchAt(Date.now());

      if (relevantNodes.length === 0) {
        showToast('Tidak ditemukan kreator yang benar-benar cocok dengan permintaan Anda.', 'info');
      }

      // MAP INTELLIGENTLY FROM GEMINI EXTRACTED INTENT
      setParsedIntent({
        skills: intent?.skills || [],
        context: intent?.industry || 'Umum',
        raw: searchPrompt,
      });

      const latencyMs = Date.now() - startTime;
      if (latencyMs > 2500) {
        logError('AI_UNAVAILABLE', 'Search exceeded 2.5s target', { latencyMs }, firebaseUser.uid, 'warn');
      }
    } catch (err) {
      setSearchError('Pencarian gagal. Coba lagi.');
      showToast('Pencarian gagal. Periksa koneksi internet.', 'error');
      logError('AI_PARSE_ERROR', 'Search failed', { err, prompt: searchPrompt }, firebaseUser.uid);
    } finally {
      setIsSearching(false);
    }
  }, [firebaseUser, lat, lng, city, setIsSearching, setSearchError, setNodes, setAiInsights, setLastSearchAt, setParsedIntent, showToast, setAuthModalOpen, setView, onlyVerified]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrompt(val);
    setSearchError(null);
    if (val.trim() === '') {
      setActiveSearchResults(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(prompt);
    }
    if (e.key === 'Escape') inputRef.current?.blur();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {/* Row 1: Search Bar + Location + Absolute AI Overlays */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          width: '100%',
          position: 'relative'
        }}
      >
        {/* Main Search Input Group */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            transition: 'all var(--transition-fast)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 6px 4px 4px',
          }}
        >
          {/* Location indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: locationDenied ? 'rgba(239,68,68,0.1)' : 'var(--color-primary-dim)',
              border: `1px solid ${locationDenied ? 'rgba(239,68,68,0.2)' : 'rgba(0,216,255,0.2)'}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            title={locationDenied ? 'Lokasi tidak diizinkan' : `Lokasimu: ${city}`}
          >
            <span style={{ fontSize: 12 }}>{locationDenied ? '⚠️' : '📍'}</span>
            <span
              className="hide-on-mobile"
              style={{
                fontSize: 'var(--text-xs)',
                color: locationDenied ? 'var(--color-error)' : 'var(--color-primary)',
                fontWeight: 600,
                maxWidth: 100,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {locationLoading ? '...' : locationDenied ? 'Denied' : city || 'Indonesia'}
            </span>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            id="nlp-search-input"
            type="text"
            value={prompt}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Butuh kreator untuk apa hari ini?"
            aria-label="Cari kreator lokal"
            aria-describedby={searchError ? 'search-error' : undefined}
            disabled={isSearching}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-base)',
              padding: '8px 4px',
            }}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Loading / Submit */}
          {isSearching ? (
            <span className="animate-spin" style={{ fontSize: 20, color: 'var(--color-primary)', marginRight: 8 }}>⟳</span>
          ) : (
            <button
              onClick={() => handleSearch(prompt)}
              disabled={!prompt.trim() || isSearching}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, padding: '6px 20px', borderRadius: 'var(--radius-full)' }}
              aria-label="Cari"
              id="search-submit-btn"
            >
              Cari
            </button>
          )}
        </div>

        {/* AI Processing Indicator (Absolute Overlay) */}
        {isSearching && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(0, 216, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,216,255,0.2)',
              whiteSpace: 'nowrap',
              zIndex: 30,
            }}
            role="status"
            aria-live="polite"
          >
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
              AI sedang memindai kreator terdekat...
            </span>
          </div>
        )}

        {/* Error (Absolute Overlay) */}
        {searchError && !isSearching && (
          <p
            id="search-error"
            role="alert"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              fontSize: 'var(--text-xs)',
              color: 'var(--color-error)',
              padding: '4px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 4,
              zIndex: 30,
            }}
          >
            {searchError}
          </p>
        )}

        {/* Example Prompt Chips (Absolute Overlay) */}
        {showExamples && !isSearching && (
          <div
            className="glass animate-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              left: 0,
              right: 0,
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              zIndex: 40,
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)', paddingLeft: 'var(--space-1)' }}>
              💡 Contoh permintaan:
            </span>
            {dynamicExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setPrompt(ex);
                  setShowExamples(false);
                  handleSearch(ex);
                }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 216, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: AI-Verified Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
          <div 
            onClick={() => setOnlyVerified(!onlyVerified)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 12,
              background: onlyVerified ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
              position: 'relative',
              transition: 'all 0.3s ease',
              boxShadow: onlyVerified ? '0 0 10px rgba(0, 216, 255, 0.3)' : 'none'
            }}
          >
            <div style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: 3,
              left: onlyVerified ? 19 : 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }} />
          </div>
          <span style={{ 
            fontSize: 10, 
            fontWeight: 800, 
            color: onlyVerified ? 'var(--color-primary)' : 'var(--color-text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em',
            transition: 'color 0.3s'
          }}>
            {onlyVerified ? '✓ Hanya Terverifikasi AI (Eksklusif)' : 'Tampilkan Semua Hasil'}
          </span>
        </label>
      </div>
    </div>
  );
}
