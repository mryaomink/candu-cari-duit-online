'use client';
import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useRadarNodes, useAppStore, useSearchState, useUIState } from '@/store/useAppStore';
import { TIER_CONFIG } from '@/types';
import type { RadarNode } from '@/types';

function CreatorNode({ node }: { node: RadarNode }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  
  const { setSelectedNode, setPortfolioOpen, hoveredNodeId, setHoveredNodeId } = useAppStore();
  const { isPortfolioOpen } = useUIState();
  const { camera, controls } = useThree();

  // --- Visual state & properties ---
  const isHovered = hoveredNodeId === node.creatorId;
  const tierCfg = TIER_CONFIG[node.creator.tier];
  const isAiMatch = node.matchScore > 0.6;
  const color = new THREE.Color(node.glowColor); 
  
  const sizeMap = { small: 0.2, medium: 0.3, large: 0.4 };
  const baseSize = sizeMap[node.creator.nodeSize] || 0.25;
  
  const orbitSpeed = useMemo(() => {
    const base = (Math.random() * 0.05 + 0.02) * (Math.random() > 0.5 ? 1 : -1);
    return isAiMatch ? base * 1.3 : base;
  }, [isAiMatch]);

  // --- Draggable states and calculations ---
  const initialPosition = useMemo(() => {
    const pos = [...node.position3D] as [number, number, number];
    pos[0] *= 1.8; pos[1] = (pos[1] * 0.8) + 0.5; pos[2] *= 1.8;
    return pos;
  }, [node.position3D]);

  const [isDragging, setIsDragging] = useState(false);
  const [localOffset, setLocalOffset] = useState(new THREE.Vector3(0, 0, 0));
  
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const dragPoint = useMemo(() => new THREE.Vector3(), []);
  const offsetVec = useMemo(() => new THREE.Vector3(), []);

  // --- Drag Handlers ---
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as any).setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    // Temporarily disable OrbitControls to prevent camera spin while dragging node
    if (controls) (controls as any).enabled = false;
    
    // Set an intersection plane parallel to camera at the node depth
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    dragPlane.setFromNormalAndCoplanarPoint(cameraDir.negate(), e.point);
    
    // Record precise click offset relative to center of node group
    offsetVec.copy(e.point).sub(new THREE.Vector3(...initialPosition).add(localOffset));
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    // Find projected coordinates where ray hits the camera-parallel plane
    e.ray.intersectPlane(dragPlane, dragPoint);
    
    // Determine difference from starting local position and apply update
    const rawPos = dragPoint.sub(offsetVec);
    const newOffset = rawPos.clone().sub(new THREE.Vector3(...initialPosition));
    setLocalOffset(newOffset);
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as any).releasePointerCapture(e.pointerId);
    
    setIsDragging(false);
    if (controls) (controls as any).enabled = true; // Enable camera orbits again
  };

  const handleClick = (e?: any) => {
    // Only trigger click behavior if we weren't in the middle of a major drag motion
    if (isDragging) return;
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedNode(node);
    setPortfolioOpen(true);
  };

  // --- Render Loop ---
  useFrame((state, delta) => {
    // 1. Stop orbital rotation if node is being dragged for precision
    if (orbitRef.current && !isHovered && !isDragging) {
      orbitRef.current.rotation.y += orbitSpeed * delta;
    }

    const t = state.clock.getElapsedTime();

    // 2. Inner core logic
    if (meshRef.current) {
      const pulseScale = 1 + Math.sin(t * 5 + node.creatorId.charCodeAt(0)) * 0.1;
      const targetScale = (isHovered || isDragging) ? 1.6 * pulseScale : 1.0 * pulseScale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 10);
      
      // Crystal core rapid rotation
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.8;
    }

    // 3. Outer cage majestic spinning
    if (outerRef.current) {
      outerRef.current.rotation.y -= delta * 0.3;
      outerRef.current.rotation.z += delta * 0.2;
      const cagePulse = 1 + Math.sin(t * 2) * 0.05;
      outerRef.current.scale.setScalar(cagePulse);
    }
  });

  const dynamicPosition = useMemo(() => {
    return new THREE.Vector3(...initialPosition).add(localOffset);
  }, [initialPosition, localOffset]);

  return (
    <group ref={orbitRef}>
      <group 
        position={dynamicPosition}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        
        {/* AESTHETIC UPGRADE: Inner Floating Glowing Crystal Core */}
        <mesh
          ref={meshRef}
          onPointerOver={() => setHoveredNodeId(node.creatorId)}
          onPointerOut={() => setHoveredNodeId(null)}
          onClick={handleClick}
        >
          <octahedronGeometry args={[baseSize, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isDragging ? 25 : (isHovered ? 18 : (isAiMatch ? 10 : 5))}
            roughness={0.1}
            metalness={1.0}
            toneMapped={false}
          />
        </mesh>

        {/* AESTHETIC UPGRADE: Outer Sci-fi Geodesic Cage Wireframe */}
        <mesh ref={outerRef}>
          <icosahedronGeometry args={[baseSize * 1.5, 1]} />
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={isDragging ? 0.8 : (isHovered ? 0.5 : 0.25)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Decorative Outer Energy Ring for High Matching Creators */}
        {isAiMatch && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[baseSize * 2.2, 0.015, 16, 40]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={isDragging ? 0.9 : 0.5}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* Floating Holographic HTML Label attached above */}
        {!isPortfolioOpen && (
          <Html center distanceFactor={10} position={[0, baseSize * 1.8 + 0.2, 0]}>
            <div
              style={{
                background: isDragging ? 'rgba(124, 58, 237, 0.9)' : 'rgba(10, 5, 20, 0.8)',
                border: `1px solid ${node.glowColor}${isHovered || isDragging ? 'FF' : '50'}`,
                boxShadow: isHovered || isDragging ? `0 0 20px ${node.glowColor}80` : 'none',
                borderRadius: isHovered || isDragging ? 12 : 24,
                padding: isHovered || isDragging ? '12px 18px' : '5px 14px',
                backdropFilter: 'blur(12px)',
                cursor: isDragging ? 'grabbing' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isDragging ? 'scale(1.15)' : (isHovered ? 'scale(1.05)' : 'scale(1)'),
                pointerEvents: 'auto',
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
              onMouseEnter={() => setHoveredNodeId(node.creatorId)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={handleClick}
            >
              <div style={{
                fontSize: isHovered || isDragging ? 15 : 11,
                fontWeight: 900,
                color: '#fff',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {isDragging && <span style={{ fontSize: '12px' }}>✥</span>}
                {node.creator.displayName} {tierCfg.badge}
              </div>
              
              {(isHovered || isDragging) && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                   ⚡ {Math.round(node.matchScore * 100)}% MATCH • {node.distanceKm.toFixed(1)} KM
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

function SynapseConnections({ nodes }: { nodes: RadarNode[] }) {
  const linePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      let connectCount = 0;
      const posA = new THREE.Vector3(nodes[i].position3D[0] * 1.8, nodes[i].position3D[1] * 0.8 + 0.5, nodes[i].position3D[2] * 1.8);
      for (let j = i + 1; j < nodes.length; j++) {
        const posB = new THREE.Vector3(nodes[j].position3D[0] * 1.8, nodes[j].position3D[1] * 0.8 + 0.5, nodes[j].position3D[2] * 1.8);
        if (posA.distanceTo(posB) < 15 && connectCount < 2) {
          positions.push(posA.x, posA.y, posA.z);
          positions.push(posB.x, posB.y, posB.z);
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
      <lineBasicMaterial color="#7C3AED" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

export default function AvatarCreatorNodes() {
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
