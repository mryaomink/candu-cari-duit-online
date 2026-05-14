'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function GaussianAvatar({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [pixelRatio, setPixelRatio] = useState(1);

  // Set correct pixel ratio after hydration to prevent resolution mismatch
  useEffect(() => {
    setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, []);

  // Process image into highly dense particle buffer geometry
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = '/candu_avatar.png';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // MASSIVE RESOLUTION BOOST FOR SHARPNESS:
      // Increasing from 200 to 320 results in 2.5x density (~100k potential points)
      // This delivers a razor-sharp, crisp facial silhouette.
      const targetWidth = 320; 
      const scale = targetWidth / img.width;
      const width = targetWidth;
      const height = Math.floor(img.height * scale);
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height).data;

      const positions: number[] = [];
      const colors: number[] = [];
      const originalZs: number[] = [];
      
      const boxWidth = 6;
      const boxHeight = boxWidth * (height / width);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const r = imgData[index] / 255;
          const g = imgData[index + 1] / 255;
          const b = imgData[index + 2] / 255;
          const a = imgData[index + 3] / 255;

          // Ignore transparent/total black backing to keep avatar silhouette isolated
          if (a < 0.02 || (r + g + b) < 0.05) continue;

          // Map spatial coords
          const posX = (x / width - 0.5) * boxWidth;
          const posY = (0.5 - y / height) * boxHeight;

          // High Fidelity Depth: Use steeper curve to exaggerate nose/brow ridges for real 3D illusion
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          const posZ = Math.pow(luminance, 1.7) * 1.5; // Slightly deepened curve

          positions.push(posX, posY, posZ);
          colors.push(r, g, b);
          originalZs.push(posZ);
        }
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geom.setAttribute('originalZ', new THREE.Float32BufferAttribute(originalZs, 1));
      
      setGeometry(geom);
    };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: 1 },
  }), []);

  useEffect(() => {
    uniforms.uPixelRatio.value = pixelRatio;
  }, [pixelRatio, uniforms]);

  useFrame((state) => {
    if (!pointsRef.current || !geometry) return;

    const time = state.clock.getElapsedTime();
    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    
    mat.uniforms.uTime.value = time;
    
    // Smooth interpolation for organic mouse feeling
    mat.uniforms.uMouse.value.x += (state.mouse.x - mat.uniforms.uMouse.value.x) * 0.15;
    mat.uniforms.uMouse.value.y += (state.mouse.y - mat.uniforms.uMouse.value.y) * 0.15;

    // Subtle ambient idle head weave
    pointsRef.current.rotation.y = Math.sin(time * 0.25) * 0.12;
    pointsRef.current.rotation.x = Math.cos(time * 0.15) * 0.04;
  });

  if (!geometry) return null;

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          uniform float uPixelRatio;
          attribute float originalZ;
          varying vec3 vColor;
          varying float vHoverScale;
          
          void main() {
            vColor = color;
            
            vec3 pos = position;
            
            // Persistent Micro-vibrational Cyber effect
            float wave = sin(uTime * 2.0 + pos.x * 4.0) * 0.01;
            pos.z += wave;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            
            // ── ADVANCED MOUSE DISPLACEMENT LOGIC ────────────────────────
            // Target perspective accurate position mapping
            vec2 mousePos = vec2(uMouse.x * 4.5, uMouse.y * 4.5); 
            float dist = distance(vec2(mvPosition.x, mvPosition.y), mousePos);
            
            // Calculate radial force curve
            float maxDist = 1.8;
            float force = 0.0;
            
            if (dist < maxDist) {
              force = 1.0 - (dist / maxDist);
              force = pow(force, 1.5);
              
              // NO X/Y pushing to preserve facial structure (no holes)
              // Just pop particles slightly forward in Z for organic interaction
              mvPosition.z += force * 0.3;
            }
            
            vHoverScale = force;

            gl_Position = projectionMatrix * mvPosition;
            
            // Point Size dynamically shifts based on:
            // 1. Distance from camera (persepctive)
            // 2. Screen Pixel Ratio
            // 3. Mouse Proximity (Explodes particle size slightly when near)
            // 4. Baseline Resolution (shrunk from 6/14 since we have way more particles now)
            float scaleBase = mix(3.5, 8.0, originalZ); 
            float dynamicGrow = 1.0 + (force * 1.2); // Grow particles when mouse hovers over them
            
            gl_PointSize = scaleBase * dynamicGrow * uPixelRatio * (1.0 / -mvPosition.z);
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vHoverScale;
          
          void main() {
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            
            float gradient = 1.0 - (dist * 2.0);
            float strength = pow(gradient, 1.8); 
            
            // ADVANCED AURA EFFECT: Mix native color into a vibrant neon neural cyan/teal
            vec3 neuralColor = vec3(0.0, 0.85, 1.0); 
            
            // The closer the mouse, the stronger it transitions to the neural aura color palette
            vec3 auraColor = mix(vColor, neuralColor, vHoverScale * 0.75);
            
            // Boost peak intensity (bloom-friendly) based on hover proximity
            vec3 finalColor = mix(auraColor, vec3(1.0), pow(vHoverScale, 3.0));
            
            // Boost overall particle brightness/alpha density slightly on hover for that burning aura look
            float dynamicAlpha = 0.85 + (vHoverScale * 0.15);
            
            gl_FragColor = vec4(finalColor, strength * dynamicAlpha);
          }
        `}
      />
    </points>
  );
}
