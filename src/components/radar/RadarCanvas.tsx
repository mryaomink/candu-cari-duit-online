'use client';
import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useRadarNodes, useAppStore } from '@/store/useAppStore';
import { formatIDR, TIER_CONFIG } from '@/types';
import type { RadarNode } from '@/types';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CreatorListView from './CreatorListView';

// ─── Grid Floor DELETED ──────────────────────────────────────────────────────

// ─── Central Core Sun ──────────────────────────────────────────────────────────
function CenterPulse() {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (coreRef.current && glowRef.current) {
      const t = state.clock.getElapsedTime();
      const scale = 1 + 0.05 * Math.sin(t * 2);
      coreRef.current.scale.setScalar(scale);
      glowRef.current.rotation.y = t * 0.2;
      glowRef.current.rotation.z = t * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Core glowing Sun */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color="#00D8FF"
          emissive="#00D8FF"
          emissiveIntensity={5}
          toneMapped={false}
        />
      </mesh>
      {/* Surrounding Halo */}
      <mesh ref={glowRef}>
        <torusGeometry args={[1.4, 0.05, 16, 100]} />
        <meshBasicMaterial color="#00D8FF" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[1.6, 0.02, 16, 100]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// ─── Single Creator Node ──────────────────────────────────────────────────────
function CreatorNode({ node }: { node: RadarNode }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { setSelectedNode, setPortfolioOpen, hoveredNodeId, setHoveredNodeId } = useAppStore();
  const isHovered = hoveredNodeId === node.creatorId;
  const tierCfg = TIER_CONFIG[node.creator.tier];

  const color = new THREE.Color(node.glowColor);
  const sizeMap = { small: 0.12, medium: 0.18, large: 0.25 };
  const size = sizeMap[node.creator.nodeSize];

  const orbitRef = useRef<THREE.Group>(null);
  // Random orbit speed based on ID string
  const orbitSpeed = useMemo(() => (Math.random() * 0.05 + 0.01) * (Math.random() > 0.5 ? 1 : -1), []);

  useFrame((state, delta) => {
    if (orbitRef.current && !isHovered) {
      orbitRef.current.rotation.y += orbitSpeed * delta;
    }
    if (!meshRef.current) return;
    const t = Date.now() * 0.002;
    meshRef.current.position.y = Math.sin(t + node.creatorId.charCodeAt(0)) * 0.05;
    
    if (isHovered) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.4, 1.4, 1.4), delta * 8);
    } else {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 8);
    }
  });

  return (
    <group ref={orbitRef}>
      <group position={node.position3D}>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHovered ? 0.08 : 0.04 * node.creator.nodeGlowIntensity}
        />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={() => {
          setSelectedNode(node);
          setPortfolioOpen(true);
        }}
        onPointerOver={() => setHoveredNodeId(node.creatorId)}
        onPointerOut={() => setHoveredNodeId(null)}
        castShadow
      >
        <sphereGeometry args={[size, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 6 : 3 * node.creator.nodeGlowIntensity}
          roughness={0}
          metalness={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Line connection REMOVED as per user request for WOW clean factor */}

      {/* Persistent Basic Label (Visible always, expands on hover) */}
      <Html center distanceFactor={8} zIndexRange={[1, 5]} position={[0, size + 0.2, 0]}>
        <div
          style={{
            background: isHovered ? 'rgba(10, 15, 30, 0.95)' : 'rgba(10, 15, 30, 0.5)',
            border: `1px solid ${node.glowColor}${isHovered ? '80' : '30'}`,
            borderRadius: isHovered ? 8 : 20,
            padding: isHovered ? '8px 14px' : '3px 8px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered ? 'scale(1.05)' : 'scale(0.9)',
            boxShadow: isHovered ? `0 0 15px ${node.glowColor}33` : 'none',
            pointerEvents: 'auto'
          }}
          onPointerOver={() => setHoveredNodeId(node.creatorId)}
          onPointerOut={() => setHoveredNodeId(null)}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode(node);
            setPortfolioOpen(true);
          }}
        >
          <div style={{ 
            fontSize: isHovered ? 13 : 10, 
            fontWeight: 700, 
            color: isHovered ? '#fff' : node.glowColor, 
            fontFamily: 'Space Grotesk, sans-serif',
            letterSpacing: '0.02em'
          }}>
            {node.creator.displayName} {tierCfg.badge}
          </div>
          
          {isHovered && (
            <div className="animate-fade-in" style={{ marginTop: 4 }}>
              <div style={{ fontSize: 10, color: '#94A3B8', display: 'flex', gap: 6 }}>
                {node.creator.skills.slice(0, 2).map((s, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>{s}</span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: node.glowColor, marginTop: 4, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>{Math.round(node.matchScore * 100)}% Match</span>
                <span>{node.distanceKm.toFixed(1)} km</span>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
    </group>
  );
}

// ─── All Creator Nodes ────────────────────────────────────────────────────────
function CreatorNodes() {
  const nodes = useRadarNodes();

  if (nodes.length === 0) return null;

  return (
    <>
      {nodes.map((node) => (
        <CreatorNode key={node.creatorId} node={node} />
      ))}
    </>
  );
}

// ─── Camera Rig (smooth pan to selected node) ─────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  const cameraTarget = useAppStore((s) => s.cameraTarget);
  const targetVec = useMemo(() => new THREE.Vector3(...cameraTarget), [cameraTarget]);

  // CameraRig disabled to permit unfettered user OrbitControls zooming/rotation.

  return null;
}

// ─── Floating Dust Particles (Filling static space) ───────────────────────────
function SpaceDust({ count = 1000 }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20 + 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    const t = state.clock.getElapsedTime() * 0.05;
    points.current.rotation.y = t;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <float32BufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00D8FF"
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scene Lighting ───────────────────────────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#00D8FF" />
      <pointLight position={[5, 3, 5]} intensity={0.3} color="#7C3AED" />
      <pointLight position={[-5, 3, -5]} intensity={0.2} color="#FFB800" />
    </>
  );
}

// ─── Main Radar Canvas ────────────────────────────────────────────────────────
export default function RadarCanvas() {
  return (
    <ErrorBoundary is3DContext fallback={<CreatorListView />}>
      <div className="radar-host">
        <Canvas
          camera={{ position: [0, 6, 14], fov: 55, near: 0.1, far: 1000 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          shadows={false}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#02050e']} />
          <fog attach="fog" args={['#02050e', 15, 50]} />

          <Suspense fallback={null}>
            <SceneLighting />
            <CenterPulse />
            <CreatorNodes />
            <SpaceDust />
            <Stars radius={100} depth={60} count={3000} factor={4} fade speed={1} />
            <CameraRig />
            <OrbitControls
              enablePan={false}
              maxPolarAngle={Math.PI / 2.15}
              minDistance={4}
              maxDistance={22}
              enableDamping
              dampingFactor={0.05}
              makeDefault
            />
            <EffectComposer>
              <Bloom
                intensity={1.8}
                luminanceThreshold={0.15}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <ChromaticAberration offset={[0.0008, 0.0008]} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}
