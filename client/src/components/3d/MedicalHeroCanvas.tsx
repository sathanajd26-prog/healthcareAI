import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { isWebGLAvailable, prefersReducedMotion, isMobileDevice } from '../../utils/webgl';
import { ShieldCheck, Sparkles, Activity, HeartPulse } from 'lucide-react';
import { MedicalHeroFallback } from './MedicalHeroFallback';

export const MedicalHeroCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const supported = isWebGLAvailable();
    const noMotion = prefersReducedMotion();
    setWebglSupported(supported);
    setReducedMotion(noMotion);

    if (!supported || noMotion || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 450;
    const height = container.clientHeight || 450;
    const isMobile = isMobileDevice();

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear previous children and mount
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x0f766e, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x34d399, 3.2, 10);
    rimLight.position.set(-4, -2, 2);
    scene.add(rimLight);

    // 3. Central Crystalline Medical Core (Holographic Torus Knot)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const knotGeometry = new THREE.TorusKnotGeometry(1.2, 0.32, 120, 24, 2, 3);
    const knotMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      metalness: 0.35,
      roughness: 0.25,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(knotGeometry, knotMaterial);
    coreGroup.add(coreMesh);

    // Secondary Wireframe Halo Overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const wireframeMesh = new THREE.Mesh(knotGeometry, wireframeMaterial);
    wireframeMesh.scale.set(1.02, 1.02, 1.02);
    coreGroup.add(wireframeMesh);

    // 4. Gyroscopic Telemetry Orbit Rings
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.45,
    });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.02, 16, 80), ringMaterial);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.015, 16, 80), new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
    }));
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // 5. Bioluminescent Medical Particle Nebula
    const particleCount = isMobile ? 70 : 160;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2.2 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      // Gradient between teal, sky blue, and white
      colors[i] = 0.2 + Math.random() * 0.3; // R
      colors[i + 1] = 0.8 + Math.random() * 0.2; // G
      colors[i + 2] = 0.9 + Math.random() * 0.1; // B
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.06 : 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 6. Interactive Pointer Damping
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.45;
      targetY = y * 0.45;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });

    // 7. Render Loop with Visibility Optimization
    let animationFrameId: number;
    let isVisible = true;
    let clock = new THREE.Clock();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return; // Pause GPU cycles when off-screen

      const elapsedTime = clock.getElapsedTime();

      // Smooth pointer lerp
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Rotations
      coreGroup.rotation.y = elapsedTime * 0.25 + mouseX;
      coreGroup.rotation.x = Math.sin(elapsedTime * 0.3) * 0.15 + mouseY;

      // Floating oscillation
      coreGroup.position.y = Math.sin(elapsedTime * 0.9) * 0.12;

      // Rings counter-rotation
      ring1.rotation.z = -elapsedTime * 0.2;
      ring1.rotation.y = elapsedTime * 0.15;
      ring2.rotation.x = elapsedTime * 0.18;
      ring2.rotation.z = elapsedTime * 0.25;

      // Particle subtle orbit
      particles.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 9. Teardown & Clean Context Release
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onPointerMove);
      observer.disconnect();
      resizeObserver.disconnect();

      knotGeometry.dispose();
      knotMaterial.dispose();
      wireframeMaterial.dispose();
      ringMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();

      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Graceful Fallback if WebGL is unavailable or user has prefers-reduced-motion
  if (!webglSupported || reducedMotion) {
    return <MedicalHeroFallback />;
  }

  return (
    <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] flex items-center justify-center">
      {/* Ambient background glow aura */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-teal-400/20 blur-3xl pointer-events-none animate-pulse-glow" />
      
      {/* WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
        aria-label="Interactive 3D Medical Hologram Core"
        role="img"
      />

      {/* Interactive Micro-Telemetry Badges */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/40 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium shadow-lg pointer-events-none">
        <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
        <span>Live Encrypted Telemetry</span>
      </div>

      <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/40 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium shadow-lg pointer-events-none">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>ABDM & HIPAA Verified</span>
      </div>
    </div>
  );
};

export { MedicalHeroFallback } from './MedicalHeroFallback';
