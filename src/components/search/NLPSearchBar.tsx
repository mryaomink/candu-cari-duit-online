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
      const { nodes: allNodes, insights, intent } = await nlpSearch(searchPrompt, effectiveLat, effectiveLng, effectiveCity, firebaseUser.uid);

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
  }, [firebaseUser, lat, lng, city, setIsSearching, setSearchError, setNodes, setAiInsights, setLastSearchAt, setParsedIntent, showToast, setAuthModalOpen, setView]);

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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        width: '100%',
        position: 'relative'
      }}
    >
      {/* Main Search Group */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          transition: 'all var(--transition-fast)',
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
          }}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Loading / Submit */}
        {isSearching ? (
          <span className="animate-spin" style={{ fontSize: 20, color: 'var(--color-primary)', flexShrink: 0 }}>⟳</span>
        ) : (
          <button
            onClick={() => handleSearch(prompt)}
            disabled={!prompt.trim() || isSearching}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, padding: '6px 16px', borderRadius: 'var(--radius-full)' }}
            aria-label="Cari"
            id="search-submit-btn"
          >
            Cari
          </button>
        )}
      </div>

      {/* AI Processing Indicator */}
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
            background: 'var(--color-primary-dim)',
            border: '1px solid rgba(0,216,255,0.2)',
            whiteSpace: 'nowrap',
          }}
          role="status"
          aria-live="polite"
        >
          <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>
            AI sedang memindai kreator terdekat...
          </span>
        </div>
      )}

      {/* Error */}
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
            paddingLeft: 'var(--space-4)',
          }}
        >
          {searchError}
        </p>
      )}

      {/* Example Prompt Chips */}
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
            zIndex: 20,
            borderRadius: 'var(--radius-lg)',
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
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-hover)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
