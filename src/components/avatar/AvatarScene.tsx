'use client';
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import GaussianAvatar from './GaussianAvatar';
import InteractiveNodes from './InteractiveNodes';
import AvatarCreatorNodes from './AvatarCreatorNodes';
import dynamic from 'next/dynamic';
import { useUIState } from '@/store/useAppStore';

const NLPSearchBar = dynamic(() => import('@/components/search/NLPSearchBar'), { ssr: false });

export default function AvatarScene() {
  const { view, isPortfolioOpen, isAuthModalOpen } = useUIState();
  
  // Hide full HUD when modal is open to avoid messy visual collisions
  const isHUDVisible = view === 'avatar' && !isPortfolioOpen && !isAuthModalOpen;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050012', position: 'relative', overflow: 'hidden' }}>
      
      {/* ─── 3D CANVAS ───────────────────────────────────────────── */}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050012']} />
        <fog attach="fog" args={['#050012', 5, 15]} />

        <ambientLight intensity={0.2} color="#7C3AED" />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#FFB800" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#7C3AED" />

        <Suspense fallback={null}>
          <GaussianAvatar position={[0, -0.5, 0]} />
          <AvatarCreatorNodes />
        </Suspense>

        <EffectComposer>
          <Bloom 
            luminanceThreshold={0.25} 
            luminanceSmoothing={0.9} 
            intensity={2.2} 
            mipmapBlur 
          />
          <ChromaticAberration 
            blendFunction={BlendFunction.NORMAL} 
            offset={new THREE.Vector2(0.0015, 0.0015)} 
          />
        </EffectComposer>

        <OrbitControls 
          makeDefault
          enableZoom={false} enablePan={false} 
          maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.1}
          maxAzimuthAngle={0.2} minAzimuthAngle={-0.2}
          enableDamping dampingFactor={0.05}
          enabled={isHUDVisible} // Freeze camera motion if modal is open
        />
      </Canvas>
      
      {/* ─── 2D HUD OVERLAYS ──────────────────────────────────────── */}
      
      {isHUDVisible && (
        <>
          {/* Top Center Header */}
          <div style={{
            position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)',
            textAlign: 'center', zIndex: 10, pointerEvents: 'none', width: '100%', maxWidth: '600px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            animation: 'fadeIn 0.3s ease'
          }}>
            <h1 style={{ 
              fontSize: '48px', fontWeight: 300, letterSpacing: '12px', margin: 0,
              background: 'linear-gradient(180deg, #FFB800 0%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontFamily: 'var(--font-sans)', textTransform: 'uppercase'
            }}>
              CANDU
            </h1>
            <div style={{
              marginTop: '4px', marginBottom: '24px', fontSize: '12px', color: '#FFB800', fontFamily: 'var(--font-mono)',
              letterSpacing: '2px', opacity: 0.8
            }}>
              [SYSTEM STATUS: ONLINE]
            </div>
            
            {/* Search Box integrated seamlessly */}
            <div style={{
              pointerEvents: 'auto', width: '100%', padding: '12px 24px',
              background: 'rgba(10, 5, 20, 0.6)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 184, 0, 0.2)', borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <NLPSearchBar />
            </div>
          </div>

          {/* Left Menu Stack */}
          <InteractiveNodes />

          {/* Right Circular HUD */}
          <div style={{
            position: 'absolute', right: '60px', top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', pointerEvents: 'none',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              width: '200px', height: '200px', borderRadius: '50%',
              border: '1px solid rgba(255, 184, 0, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', boxShadow: '0 0 30px rgba(255, 184, 0, 0.1)'
            }}>
              {/* Inner rings */}
              <div style={{
                position: 'absolute', inset: '10px', borderRadius: '50%',
                border: '1px dashed rgba(124, 58, 237, 0.5)', animation: 'spin 20s linear infinite'
              }}></div>
              <div style={{
                position: 'absolute', inset: '20px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,184,0,0.1) 0%, transparent 70%)'
              }}></div>
              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <div style={{ fontSize: '10px', color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                  NEURAL MAP INTEGRITY:
                </div>
                <div style={{ fontSize: '12px', color: '#FFB800', fontWeight: 700, letterSpacing: '2px', marginTop: '4px' }}>
                  SECURE
                </div>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#7C3AED', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
              SCAN STREAM: ACTIVE
            </div>
          </div>
        </>
      )}
    </div>
  );
}
