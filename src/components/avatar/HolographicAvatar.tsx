'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export default function HolographicAvatar({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const texture = useTexture('/candu_avatar.png');
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uColorPrimary: { value: new THREE.Color('#FFB800') }, // Gold
      uColorSecondary: { value: new THREE.Color('#7C3AED') } // Purple
    }),
    [texture]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (groupRef.current) {
      // Parallax effect based on mouse
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (state.pointer.x * Math.PI) / 8, 0.1);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -(state.pointer.y * Math.PI) / 12, 0.1);
      // Gentle floating
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={new THREE.Vector3(...position)}>
      <mesh>
        <planeGeometry args={[4, 4, 32, 32]} />
        <shaderMaterial
          ref={materialRef}
          transparent={true}
          side={THREE.DoubleSide}
          uniforms={uniforms}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform sampler2D uTexture;
            varying vec2 vUv;

            void main() {
              vec4 texColor = texture2D(uTexture, vUv);
              
              // Discard transparent pixels for clean edges
              if (texColor.a < 0.05) discard;

              gl_FragColor = texColor;
            }
          `}
        />
      </mesh>
      
    </group>
  );
}
