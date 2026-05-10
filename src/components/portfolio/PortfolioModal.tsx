'use client';
import { useState, useEffect } from 'react';
import { useAppStore, useUIState } from '@/store/useAppStore';
import { PortfolioModalSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatIDR, TIER_CONFIG } from '@/types';
import { db } from '@/lib/firebase';
import { doc, runTransaction, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';

export default function PortfolioModal() {
  const { isPortfolioOpen } = useUIState();
  const selectedNode = useAppStore((s) => s.selectedNode);
  const { setPortfolioOpen, setSelectedNode, showToast, firebaseUser, setAuthModalOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState<'info' | 'works' | 'stats'>('info');
  const [ratingHover, setRatingHover] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);

  // Load existing user review for this creator when modal opens
  useEffect(() => {
    const loadReview = async () => {
      if (!firebaseUser || !selectedNode?.creator) return;
      try {
        const rDoc = await getDoc(doc(db, 'reviews', `${firebaseUser.uid}_${selectedNode.creator.uid}`));
        if (rDoc.exists()) {
          setExistingRating(rDoc.data().rating);
        } else {
          setExistingRating(null);
        }
      } catch (e) { console.error(e); }
    };
    if (isPortfolioOpen) loadReview();
  }, [isPortfolioOpen, selectedNode?.creator?.uid, firebaseUser?.uid]);

  if (!isPortfolioOpen) return null;

  const creator = selectedNode?.creator;
  const node = selectedNode;
  const tierCfg = creator ? TIER_CONFIG[creator.tier] : null;

  const handleRate = async (stars: number) => {
    if (!firebaseUser) {
      setAuthModalOpen(true);
      return;
    }
    if (!creator) return;

    setSubmittingRating(true);
    try {
      const creatorRef = doc(db, 'creators', creator.uid);
      // Deterministic locked ID ensures ONE review per user/creator pair.
      const reviewId = `${firebaseUser.uid}_${creator.uid}`;
      const reviewRef = doc(db, 'reviews', reviewId);
      
      await runTransaction(db, async (transaction) => {
        const cDoc = await transaction.get(creatorRef);
        const rDoc = await transaction.get(reviewRef);
        
        if (!cDoc.exists()) throw new Error("Creator doesn't exist!");
        
        const cData = cDoc.data();
        const hasReviewedBefore = rDoc.exists();
        
        let currentTotal = cData.totalProjects || 0;
        let currentSum = (cData.avgRating || 0) * currentTotal;

        let newTotal = currentTotal;
        let newSum = currentSum;

        if (hasReviewedBefore) {
          // Scenario A: User REVISING their previous vote
          const oldRating = rDoc.data().rating || 0;
          newSum = (currentSum - oldRating) + stars;
          // totalProjects does NOT increase
        } else {
          // Scenario B: First time voting
          newTotal = currentTotal + 1;
          newSum = currentSum + stars;
        }

        const newAvg = newTotal > 0 ? (newSum / newTotal) : 0;

        // 1. Persist new creator stats securely
        transaction.update(creatorRef, {
          totalProjects: newTotal,
          avgRating: newAvg,
          updatedAt: serverTimestamp()
        });

        // 2. Save/Overwite the individual review document
        transaction.set(reviewRef, {
          creatorId: creator.uid,
          reviewerId: firebaseUser.uid,
          rating: stars,
          updatedAt: serverTimestamp(),
          createdAt: hasReviewedBefore ? rDoc.data().createdAt : serverTimestamp()
        }, { merge: true });
      });

      showToast(`Penilaian Anda berhasil disimpan!`, 'success');
      setExistingRating(stars); // Lock it instantly in local UI
      
      // Optimistic local state sync for instantaneous visual updates
      if (selectedNode) {
        // Refetch fresh simulation
        const snapshot = await import('firebase/firestore').then(m => m.getDoc(creatorRef));
        if (snapshot.exists()) {
          setSelectedNode({
            ...selectedNode,
            creator: { ...selectedNode.creator, ...snapshot.data() } as any
          });
        }
      }
    } catch (err) {
      console.error("Rating fail:", err);
      showToast('Gagal memproses penilaian.', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleHire = () => {
    if (!firebaseUser) {
      setAuthModalOpen(true);
      return;
    }
    showToast('🔒 Menyiapkan Transaksi Kontrak Aman (Escrow)...', 'success');
  };

  const handleClose = () => {
    setPortfolioOpen(false);
    setTimeout(() => {
      setSelectedNode(null);
      setActiveTab('info');
      setRatingHover(0);
      setExistingRating(null);
    }, 300);
  };

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" style={{ backdropFilter: 'blur(12px)' }}>
      <div
        className="glass-strong animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 600,
          borderRadius: 24,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: `0 30px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px ${node?.glowColor}1a`
        }}
      >
        {/* Aesthetic Decorative Banner Backdrop */}
        <div style={{ 
          height: 120, 
          width: '100%', 
          background: `linear-gradient(to bottom, ${node?.glowColor}33, transparent), url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop) center/cover no-repeat`, 
          position: 'relative' 
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, #030712 100%)' }} />
          <button
            onClick={handleClose}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--space-6) var(--space-6)', marginTop: -40, position: 'relative' }}>
          {!creator ? (
            <PortfolioModalSkeleton />
          ) : (
            <>
              {/* ─── Profile Intro ───────────────────────────────────────────────── */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: `linear-gradient(135deg, ${node?.glowColor}50, ${node?.glowColor}10)`,
                  border: `2px solid ${node?.glowColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 800, color: '#fff', flexShrink: 0,
                  boxShadow: `0 10px 25px ${node?.glowColor}40`,
                  transform: 'translateZ(0)'
                }}>
                  {creator.displayName.charAt(0)}
                </div>
                <div style={{ paddingBottom: 5 }}>
                  <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
                    {creator.displayName}
                  </h2>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>📍 {creator.city}</span>
                    <span style={{ width: 3, height: 3, background: '#4b5563', borderRadius: '50%' }} />
                    <span style={{ fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, background: 'currentColor', borderRadius: '50%' }} /> Tersedia
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Advanced Tab System ────────────────────────────────────────── */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, gap: 24 }}>
                {[
                  { id: 'info', label: 'Profil' },
                  { id: 'works', label: 'Galeri Karya' },
                  { id: 'stats', label: 'Ulasan & Metrik' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      background: 'none', border: 'none', padding: '0 0 12px 0',
                      color: activeTab === tab.id ? node?.glowColor : 'var(--color-text-muted)',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      borderBottom: `2px solid ${activeTab === tab.id ? node?.glowColor : 'transparent'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ─── CONTENT: Profil ─── */}
              {activeTab === 'info' && (
                <div className="animate-fade-in">
                  <p style={{ lineHeight: 1.7, color: '#cbd5e1', fontSize: 15, marginBottom: 24 }}>
                    "{creator.bio || 'Kreator profesional lokal siap melayani kebutuhan visual Anda.'}"
                  </p>
                  
                  <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    Spesialisasi Utama
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {creator.skills.length > 0 ? creator.skills.map(s => (
                      <span key={s} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 8, fontSize: 13, color: '#e2e8f0' }}>
                        {s}
                      </span>
                    )) : <span style={{ fontSize: 13, color: 'gray' }}>Belum memasukkan skill</span>}
                  </div>
                </div>
              )}

              {/* ─── CONTENT: Galeri ─── */}
              {activeTab === 'works' && (
                <div className="animate-fade-in">
                  {creator.portfolioImages && creator.portfolioImages.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      {creator.portfolioImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <img src={img.url} alt="Work" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.9)' }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 32, color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                      <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>🖼️</span>
                      Belum ada gambar portofolio resmi.
                    </div>
                  )}
                </div>
              )}

              {/* ─── CONTENT: Stats ─── */}
              {activeTab === 'stats' && (
                <div className="animate-fade-in" style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24' }}>
                        ⭐ {(creator.totalProjects && creator.totalProjects > 0) ? creator.avgRating.toFixed(1) : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}>
                        Avg Rating ({creator.totalProjects || 0})
                      </div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: node?.glowColor }}>{Math.round(node?.matchScore ? node.matchScore * 100 : 0)}%</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}>Kesesuaian Radar</div>
                    </div>
                  </div>

                  {/* Dynamic Star Evaluator */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#f1f5f9' }}>
                      {existingRating ? 'Ulasan Anda Telah Tercatat' : 'Beri Penilaian Cepat'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isLocked = existingRating !== null;
                        const isActive = isLocked 
                          ? (existingRating >= star) 
                          : (ratingHover >= star || (!ratingHover && creator.totalProjects > 0 && Math.round(creator.avgRating) >= star));

                        return (
                          <button
                            key={star}
                            disabled={submittingRating || isLocked}
                            onClick={() => handleRate(star)}
                            onMouseEnter={() => !isLocked && setRatingHover(star)}
                            onMouseLeave={() => !isLocked && setRatingHover(0)}
                            style={{
                              background: 'none', border: 'none', fontSize: 28, 
                              cursor: (submittingRating || isLocked) ? 'default' : 'pointer',
                              transition: 'transform 0.1s ease',
                              transform: (!isLocked && ratingHover >= star) ? 'scale(1.2)' : 'scale(1)',
                              opacity: (submittingRating) ? 0.5 : 1,
                              color: isLocked ? '#f59e0b' : 'inherit' // gold lock
                            }}
                          >
                            {isActive ? '★' : '☆'}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                      {submittingRating ? 'Mengirim skor...' : 
                        existingRating ? 'Terima kasih telah berpartisipasi dalam sistem reputasi.' : 'Klik bintang untuk mengirim rating instan Anda.'}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── PREMIUM CTA FOOTER ─── */}
        {creator && (
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            backdropFilter: 'blur(20px)', 
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Estimasi Tarif</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{formatIDR(creator.hourlyRate)}<span style={{ fontSize: 12, color: 'gray' }}>/jam</span></div>
            </div>
            <button
              onClick={handleHire}
              style={{
                background: `linear-gradient(to right, ${node?.glowColor}, ${node?.glowColor}dd)`,
                border: 'none',
                color: '#000',
                padding: '12px 28px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: `0 10px 20px ${node?.glowColor}4d`
              }}
            >
              Hire {creator.displayName.split(' ')[0]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
