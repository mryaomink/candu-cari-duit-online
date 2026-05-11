'use client';
import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { db, functions } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { logError } from '@/lib/logger';
import type { CloudinaryImage } from '@/types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: EditModalProps) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const showToast = useAppStore((s) => s.showToast);

  const [bio, setBio] = useState(user?.bio || '');
  const [skillsInput, setSkillsInput] = useState(user?.skills?.join(', ') || '');
  const [price, setPrice] = useState(user?.hourlyRate || 0);
  
  // Modern states for advanced capabilities
  const [isAvailable, setIsAvailable] = useState<boolean>(user && 'isAvailable' in user ? (user as any).isAvailable : true);
  const [portfolioImages, setPortfolioImages] = useState<CloudinaryImage[]>(user?.portfolioImages || []);
  
  const [loading, setLoading] = useState(false);
  const [enhancingBio, setEnhancingBio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  // AI Copilot for Bio Generation
  const handleEnhanceBio = async () => {
    if (!bio.trim() || bio.length < 10) {
      showToast('Masukkan minimal 10 karakter tentang diri Anda terlebih dahulu.', 'error');
      return;
    }
    
    setEnhancingBio(true);
    try {
      const enhanceFunc = httpsCallable<{ text: string, displayName?: string, city?: string, skills?: string }, { enhancedText: string }>(functions, 'enhanceBio');
      const result = await enhanceFunc({ 
        text: bio,
        displayName: user.displayName,
        city: user.city,
        skills: skillsInput
      });
      if (result.data?.enhancedText) {
        setBio(result.data.enhancedText);
        showToast('Sip! Bio kamu sudah diperbaiki.', 'success');
      }
    } catch (err) {
      console.error("AI bio fail:", err);
      showToast('Oops, asisten pintar sedang sibuk. Coba tulis sendiri dulu ya.', 'error');
    } finally {
      setEnhancingBio(false);
    }
  };

  // Cloudinary Secure Client-Server Pipeline
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedFiles: CloudinaryImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Network error during upload');
        
        const image: CloudinaryImage = await response.json();
        uploadedFiles.push(image);
      }

      setPortfolioImages((prev) => [...prev, ...uploadedFiles]);
      showToast(`${uploadedFiles.length} foto berhasil diunggah!`, 'success');
    } catch (err) {
      logError('CLOUDINARY_UPLOAD_FAILED', 'Failed uploading image', { err });
      showToast('Gagal mengunggah foto. Pastikan koneksi stabil dan coba lagi.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const skillsArr = skillsInput.split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const docRef = doc(db, 'users', user.uid);
      const updatePayload = {
        bio,
        skills: skillsArr,
        hourlyRate: Number(price),
        portfolioImages: portfolioImages,
        isAvailable: isAvailable, // Now dynamic
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, updatePayload);
      
      const creatorRef = doc(db, 'creators', user.uid);
      const embeddingText = `${user.displayName} | ${bio} | ${skillsArr.join(', ')} | Lokasi: ${user.city}, ${user.province}`;

      await updateDoc(creatorRef, {
        ...updatePayload,
        portfolioEmbeddingText: embeddingText,
      }).catch(async (e) => {
        await setDoc(creatorRef, {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          city: user.city,
          province: user.province,
          avgRating: 0,
          totalProjects: 0,
          ...updatePayload,
          portfolioEmbeddingText: embeddingText,
        });
      });

      setUser({
        ...user,
        ...updatePayload,
        updatedAt: Timestamp.now(),
      } as any);

      showToast('Sip! Profil kamu sudah diperbarui.', 'success');
      onClose();
    } catch (err) {
      logError('FIRESTORE_WRITE_ERROR', 'Save profile failed', { err });
      showToast('Gagal menyimpan data. Coba beberapa saat lagi ya.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="glass-strong animate-slide-up" style={{ width: '100%', maxWidth: 550, padding: 'var(--space-6)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🔧</span> Profil Saya
          </h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ minWidth: 'unset', padding: '4px 8px' }}>✕</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          
          {/* Availability Switcher */}
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: 'var(--space-3) var(--space-4)', 
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: isAvailable ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: isAvailable ? '#4ade80' : '#f87171', fontSize: 'var(--text-sm)' }}>
                📡 Status Pencarian: {isAvailable ? 'Aktif & Siap Menerima Klien' : 'Tersembunyi / Tidak Menerima Klien'}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Pilih apakah kamu ingin tampil dan dicari oleh klien.</div>
            </div>
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
              <input 
                type="checkbox" 
                checked={isAvailable} 
                onChange={(e) => setIsAvailable(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isAvailable ? '#22c55e' : '#4b5563',
                transition: '.4s', borderRadius: 34
              }}>
                <span style={{
                  position: 'absolute', height: 18, width: 18, left: isAvailable ? 22 : 4, bottom: 3,
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>

          {/* Bio with AI Assist */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Ceritakan Tentang Jasa Kamu
              </label>
              <button 
                type="button" 
                onClick={handleEnhanceBio} 
                disabled={enhancingBio}
                className="btn-secondary"
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'linear-gradient(45deg, #7c3aed, #ec4899)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', opacity: enhancingBio ? 0.7 : 1 }}
              >
                {enhancingBio ? '🪄 Sedang Menulis...' : '✨ Bantu Tulis Otomatis'}
              </button>
            </div>
            <textarea
              className="glass"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan sedikit tentang apa yang bisa kamu lakukan..."
              required
              style={{ width: '100%', minHeight: 100, padding: 'var(--space-3)', resize: 'vertical', color: '#fff', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                KEAHLIAN (Pisahkan Koma)
              </label>
              <input
                type="text"
                className="glass"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Foto, Video..."
                style={{ width: '100%', padding: 'var(--space-3)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                PERKIRAAN HARGA (Rp/Jam)
              </label>
              <input
                type="number"
                className="glass"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                style={{ width: '100%', padding: 'var(--space-3)', color: '#fff' }}
              />
            </div>
          </div>

          {/* Portfolio Grid */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
              Galeri Karya (Portofolio)
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10, marginBottom: 12 }}>
              {portfolioImages.length === 0 && (
                 <div className="animate-pulse" style={{ gridColumn: '1 / -1', padding: 'var(--space-4)', textAlign: 'center', color: '#9ca3af', fontSize: 'var(--text-sm)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>
                    Belum ada karya yang diunggah. Tambahkan beberapa foto agar klien lebih yakin!
                 </div>
              )}
              {portfolioImages.map((img, i) => (
                <div key={img.publicId || i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                  {img.format === 'pdf' ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                      <span style={{ fontSize: 28 }}>📄</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>PDF</span>
                    </div>
                  ) : (
                    <img src={img.thumbnailUrl || img.url} alt="Portofolio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <button 
                    type="button"
                    onClick={() => removeImage(i)}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <button 
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  aspectRatio: '1', borderRadius: 8, border: '2px dashed rgba(255,255,255,0.2)', 
                  background: 'transparent', color: '#9ca3af', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4
                }}
              >
                <span style={{ fontSize: 20 }}>{uploading ? '⌛' : '+'}</span>
                <span style={{ fontSize: 9 }}>{uploading ? 'Mengunggah' : 'Tambah'}</span>
              </button>
            </div>

            <input 
              type="file" 
              multiple 
              accept="image/*,application/pdf" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }} 
            />
          </div>

          <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Menyimpan Data...' : '🔥 Simpan Perubahan'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
