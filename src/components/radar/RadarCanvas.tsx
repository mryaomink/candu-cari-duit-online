'use client';
import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useRadarNodes, useAppStore, useSearchState } from '@/store/useAppStore';
import { formatIDR, TIER_CONFIG } from '@/types';
import type { RadarNode } from '@/types';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CreatorListView from './CreatorListView';

// ─── Grid Floor DELETED ──────────────────────────────────────────────────────

// ─── Advanced Neural Processor Core ──────────────────────────────────────────
function NeuralCoreProcessor() {
  const groupRef = useRef<THREE.Group>(null);
  const outerFrameRef = useRef<THREE.Mesh>(null);
  const innerFrameRef = useRef<THREE.Mesh>(null);
  const crystalRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Subtle rhythmic hovering
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.15;
    }

    if (outerFrameRef.current) {
      outerFrameRef.current.rotation.y = t * 0.15;
      outerFrameRef.current.rotation.z = t * 0.05;
    }

    if (innerFrameRef.current) {
      innerFrameRef.current.rotation.y = -t * 0.25;
      innerFrameRef.current.rotation.x = t * 0.1;
    }

    if (crystalRef.current) {
      crystalRef.current.rotation.x = t * 0.4;
      const pulse = 1 + Math.sin(t * 4) * 0.05;
      crystalRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Central Floating Quantum Crystal */}
      <mesh ref={crystalRef}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color="#00D8FF"
          emissive="#00D8FF"
          emissiveIntensity={15}
          toneMapped={false}
          roughness={0}
        />
      </mesh>

      {/* 2. Inner Sub-Grid Skeleton (Rapid rotation) */}
      <mesh ref={innerFrameRef}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshBasicMaterial
          color="#00D8FF"
          wireframe
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Outer High-Tech Geo-Cage (Slow majestic rotation) */}
      <mesh ref={outerFrameRef}>
        <dodecahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial
          color="#7C3AED"
          wireframe
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
        />
      </mesh>



      {/* Core localized Glow Sprite */}
      <pointLight intensity={2} distance={8} color="#00D8FF" />
    </group>
  );
}

// ─── Dynamic Radar Scanning Pulse ──────────────────────────────────────────
function RadarScanWave() {
  const ringRef = useRef<THREE.Mesh>(null);
  const isSearching = useAppStore((s) => s.isSearching);

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.getElapsedTime();
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;

    if (isSearching) {
      const loopT = (t % 1.2) / 1.2;
      const currentScale = 0.5 + loopT * 18;
      ringRef.current.scale.set(currentScale, currentScale, 1);
      mat.opacity = (1 - loopT) * 0.6;
    } else {
      const idleScale = 4 + Math.sin(t * 0.5) * 0.5;
      ringRef.current.scale.lerp(new THREE.Vector3(idleScale, idleScale, 1), 0.05);
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.05, 0.05);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <ringGeometry args={[0.98, 1.0, 64]} />
      <meshBasicMaterial color="#00D8FF" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ─── Single Creator Node ──────────────────────────────────────────────────────
function CreatorNode({ node }: { node: RadarNode }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { setSelectedNode, setPortfolioOpen, hoveredNodeId, setHoveredNodeId, showToast, prompt } = useAppStore();
  const isHovered = hoveredNodeId === node.creatorId;
  const tierCfg = TIER_CONFIG[node.creator.tier];

  // 🤖 AI DRIVEN DYNAMICS (Once in Radar Archive, they are PERMANENTLY unlocked)
  const isIdentified = true; 
  const isAiMatch = node.matchScore > 0.6;

  // Scale expands exponentially up to 3x based on vector similarity
  const aiScaleMultiplier = isAiMatch ? 1 + (node.matchScore - 0.6) * 3 : 1;
  const color = new THREE.Color(node.glowColor); 

  const sizeMap = { small: 0.12, medium: 0.18, large: 0.25 };
  const baseSize = sizeMap[node.creator.nodeSize];
  const finalSize = baseSize * aiScaleMultiplier;

  const orbitRef = useRef<THREE.Group>(null);
  // Matching nodes orbit slightly faster to catch attention
  const orbitSpeed = useMemo(() => {
    const base = (Math.random() * 0.04 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
    return isAiMatch ? base * 1.5 : base;
  }, [isAiMatch]);

  const handleClick = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    // Access is permanent once node exists in archive.
    setSelectedNode(node);
    setPortfolioOpen(true);
  };

  useFrame((state, delta) => {
    if (orbitRef.current && !isHovered) {
      orbitRef.current.rotation.y += orbitSpeed * delta;
    }
    if (!meshRef.current) return;

    const t = state.clock.getElapsedTime();
    // High matches get a dynamic heartbeat pulse rhythm
    const pulseScale = isAiMatch ? 1 + Math.sin(t * 5) * 0.05 : 1;

    // Floating hover idle animation
    meshRef.current.position.y = Math.sin(t * 1.5 + node.creatorId.charCodeAt(0)) * 0.06;

    const targetScale = isHovered ? 1.4 * pulseScale : 1 * pulseScale;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
  });

  return (
    <group ref={orbitRef}>
      <group position={node.position3D}>
        {/* Dynamic AI Glow Ring */}
        {isAiMatch && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[finalSize * 1.8, 0.015, 16, 50]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={10}
              toneMapped={false}
              transparent
              opacity={0.7}
            />
          </mesh>
        )}

        {/* Glow halo */}
        <mesh>
          <sphereGeometry args={[finalSize * 2.5, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isHovered ? 0.12 : (isAiMatch ? 0.08 : 0.04) * node.creator.nodeGlowIntensity}
          />
        </mesh>

        {/* Main sphere */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={() => setHoveredNodeId(node.creatorId)}
          onPointerOut={() => setHoveredNodeId(null)}
          castShadow
        >
          <sphereGeometry args={[finalSize, 24, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isHovered ? 8 : (isIdentified ? (isAiMatch ? 5 : 3) * node.creator.nodeGlowIntensity : 1)}
            roughness={0}
            metalness={0.8}
            toneMapped={false}
          />
        </mesh>

        {/* Line connection REMOVED as per user request for WOW clean factor */}

        {/* Persistent Basic Label (Visible always, expands on hover) */}
        <Html center distanceFactor={8} zIndexRange={[1, 5]} position={[0, finalSize + 0.2, 0]}>
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
            onClick={handleClick}
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

// ─── Synapse Connections (Links between creators) ──────────────────────────────
function SynapseConnections({ nodes }: { nodes: RadarNode[] }) {
  const linePositions = useMemo(() => {
    const positions: number[] = [];
    // Connect nodes that are physically close in 3D space
    for (let i = 0; i < nodes.length; i++) {
      let connectCount = 0;
      const posA = new THREE.Vector3(...nodes[i].position3D);
      for (let j = i + 1; j < nodes.length; j++) {
        const posB = new THREE.Vector3(...nodes[j].position3D);
        if (posA.distanceTo(posB) < 10 && connectCount < 2) {
          positions.push(...nodes[i].position3D);
          positions.push(...nodes[j].position3D);
          connectCount++;
        }
      }
    }
    return new Float32Array(positions);
  }, [nodes]);

  if (linePositions.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={linePositions.length / 3}
          itemSize={3}
          args={[linePositions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00D8FF" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

// ─── All Creator Nodes ────────────────────────────────────────────────────────
function CreatorNodes() {
  const nodes = useRadarNodes();
  const { activeSearchResults } = useSearchState();

  const filteredNodes = activeSearchResults === null 
    ? nodes 
    : nodes.filter(n => activeSearchResults.includes(n.creatorId));

  if (filteredNodes.length === 0) return null;

  return (
    <group>
      <SynapseConnections nodes={filteredNodes} />
      {filteredNodes.map((node) => (
        <CreatorNode key={node.creatorId} node={node} />
      ))}
    </group>
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

// ─── Neural Lattice Background ─────────────────────────────────────────────────
function NeuralLattice({ count = 60 }) {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < count; i++) {
      p.push(new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20 + 2,
        (Math.random() - 0.5) * 30
      ));
    }
    return p;
  }, [count]);

  const lineSegments = useMemo(() => {
    const positions: number[] = [];
    // Loop to create connection lines based on proximity to mimic neural network
    for (let i = 0; i < points.length; i++) {
      let connects = 0;
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < 8 && connects < 3) {
          positions.push(points[i].x, points[i].y, points[i].z);
          positions.push(points[j].x, points[j].y, points[j].z);
          connects++;
        }
      }
    }
    return new Float32Array(positions);
  }, [points]);

  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <group ref={ref}>
      {/* The ambient neurons/nodes */}
      <points>
        <bufferGeometry>
          <float32BufferAttribute
            attach="attributes-position"
            count={points.length}
            itemSize={3}
            args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.15} color="#00D8FF" transparent opacity={0.4} sizeAttenuation blending={THREE.AdditiveBlending} />
      </points>

      {/* The neural connecting strands */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lineSegments.length / 3}
            itemSize={3}
            args={[lineSegments, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#7C3AED" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// ─── Scene Lighting ───────────────────────────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.2} />
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
          <color attach="background" args={['#010208']} />
          <fog attach="fog" args={['#010208', 10, 40]} />

          <Suspense fallback={null}>
            <SceneLighting />
            <NeuralCoreProcessor />
            <RadarScanWave />
            <NeuralLattice count={80} />
            <CreatorNodes />
            <CameraRig />
            <OrbitControls
              enablePan={false}
              maxPolarAngle={Math.PI / 1.8}
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
