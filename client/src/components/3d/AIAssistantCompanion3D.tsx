import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { isWebGLAvailable, prefersReducedMotion } from '../../utils/webgl';
import { Bot, CheckCircle2, AlertTriangle } from 'lucide-react';

export type CompanionState = 'idle' | 'processing' | 'success' | 'error';

interface AIAssistantCompanion3DProps {
  state: CompanionState;
  className?: string;
}

export const AIAssistantCompanion3D: React.FC<AIAssistantCompanion3DProps> = ({
  state,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // References to dynamic Three.js objects for state transitions
  const stateRef = useRef<CompanionState>(state);
  stateRef.current = state;

  useEffect(() => {
    const supported = isWebGLAvailable();
    const noMotion = prefersReducedMotion();
    setWebglSupported(supported);
    setReducedMotion(noMotion);

    if (!supported || noMotion || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 44;
    const height = container.clientHeight || 44;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3.6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 8);
    pointLight.position.set(1.5, 1.5, 2.5);
    scene.add(pointLight);

    // 3. Central Bio-Core (Subtle 3D Holographic Core)
    const coreGeometry = new THREE.IcosahedronGeometry(0.55, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      emissive: 0x0d9488,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.7,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 4. Outer Segmented Orbit Cage
    const cageGeometry = new THREE.OctahedronGeometry(0.95, 1);
    const cageMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const cageMesh = new THREE.Mesh(cageGeometry, cageMaterial);
    scene.add(cageMesh);

    // 5. Orbital Halo Ring
    const haloGeometry = new THREE.TorusGeometry(1.2, 0.015, 12, 48);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.5,
    });
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    haloMesh.rotation.x = Math.PI / 2.5;
    scene.add(haloMesh);

    // 6. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const currentState = stateRef.current;

      // Color and Speed adjustments based on real companion state
      if (currentState === 'processing') {
        coreMesh.rotation.y = elapsedTime * 2.5;
        coreMesh.rotation.x = elapsedTime * 1.5;
        cageMesh.rotation.y = -elapsedTime * 2.0;
        cageMesh.rotation.z = elapsedTime * 1.4;

        const pulse = 1 + Math.sin(elapsedTime * 8) * 0.1;
        coreMesh.scale.set(pulse, pulse, pulse);

        coreMaterial.emissive.setHex(0x0284c7);
        coreMaterial.emissiveIntensity = 0.95;
        cageMaterial.color.setHex(0x38bdf8);
        pointLight.color.setHex(0x38bdf8);
      } else if (currentState === 'error') {
        coreMesh.rotation.y = elapsedTime * 0.5;
        const pulse = 1 + Math.sin(elapsedTime * 3) * 0.05;
        coreMesh.scale.set(pulse, pulse, pulse);

        coreMaterial.emissive.setHex(0xe11d48);
        coreMaterial.emissiveIntensity = 0.75;
        cageMaterial.color.setHex(0xf43f5e);
        pointLight.color.setHex(0xf43f5e);
      } else if (currentState === 'success') {
        coreMesh.rotation.y = elapsedTime * 0.7;
        coreMesh.scale.set(1.05, 1.05, 1.05);

        coreMaterial.emissive.setHex(0x059669);
        coreMaterial.emissiveIntensity = 0.85;
        cageMaterial.color.setHex(0x34d399);
        pointLight.color.setHex(0x34d399);
      } else {
        // Idle
        coreMesh.rotation.y = elapsedTime * 0.5;
        coreMesh.rotation.x = Math.sin(elapsedTime * 0.6) * 0.2;
        cageMesh.rotation.y = -elapsedTime * 0.4;
        cageMesh.rotation.x = elapsedTime * 0.25;

        const breathe = 1 + Math.sin(elapsedTime * 1.8) * 0.04;
        coreMesh.scale.set(breathe, breathe, breathe);

        coreMaterial.emissive.setHex(0x0d9488);
        coreMaterial.emissiveIntensity = 0.55;
        cageMaterial.color.setHex(0x5eead4);
        pointLight.color.setHex(0x38bdf8);
      }

      haloMesh.rotation.z = elapsedTime * 0.5;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      coreGeometry.dispose();
      coreMaterial.dispose();
      cageGeometry.dispose();
      cageMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      role="img"
      aria-label={`Clinical AI Assistant (${state})`}
      title={`Clinical AI Assistant — Status: ${state}`}
    >
      {/* 1. Pulsing Backing Glow Aura */}
      <div
        className={`absolute -inset-1.5 rounded-2xl blur-md pointer-events-none transition-all duration-500 ${
          reducedMotion
            ? 'opacity-30'
            : state === 'processing'
            ? 'bg-sky-400/50 scale-110 animate-pulse'
            : state === 'error'
            ? 'bg-rose-500/40 scale-105 animate-pulse'
            : state === 'success'
            ? 'bg-emerald-400/50 scale-105'
            : 'bg-teal-400/30 scale-100 animate-pulse-glow'
        }`}
      />

      {/* 2. Cybernetic Orbital Telemetry Ring */}
      {!reducedMotion && (
        <div
          className={`absolute -inset-2 rounded-full border border-dashed pointer-events-none transition-colors duration-500 ${
            state === 'processing'
              ? 'border-sky-300/80 animate-spin'
              : state === 'error'
              ? 'border-rose-400/70'
              : state === 'success'
              ? 'border-emerald-300/80 animate-companion-orbit'
              : 'border-teal-300/50 animate-companion-orbit'
          }`}
          style={{
            animationDuration: state === 'processing' ? '2.5s' : '14s',
          }}
        />
      )}

      {/* 3. Central Animated AI Logo Badge */}
      <div
        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl p-[1.5px] shadow-lg flex items-center justify-center transition-all duration-300 ${
          state === 'processing'
            ? 'bg-gradient-to-tr from-sky-500 via-teal-400 to-medical-600 shadow-sky-500/20'
            : state === 'error'
            ? 'bg-gradient-to-tr from-rose-600 to-amber-500 shadow-rose-600/20'
            : state === 'success'
            ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/20'
            : 'bg-gradient-to-tr from-medical-600 via-teal-500 to-sky-400 shadow-teal-900/30'
        }`}
      >
        <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-teal-950/80 via-slate-900/80 to-medical-950/80 backdrop-blur-xs flex items-center justify-center relative overflow-hidden">
          {/* Subtle 3D WebGL Canvas Layer (When WebGL is supported) */}
          {webglSupported && !reducedMotion && (
            <div
              ref={mountRef}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
            />
          )}

          {/* Crisp Animated Bot Logo Icon */}
          <div
            className={`relative z-10 text-white transition-all duration-300 ${
              reducedMotion
                ? ''
                : state === 'processing'
                ? 'animate-pulse scale-110'
                : 'animate-float-slow'
            }`}
          >
            {state === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-300 stroke-[2.5]" />
            ) : state === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 stroke-[2.5]" />
            ) : (
              <Bot
                className={`w-5 h-5 stroke-[2.5] transition-colors duration-300 ${
                  state === 'processing' ? 'text-sky-200' : 'text-teal-200'
                }`}
              />
            )}
          </div>
        </div>

        {/* 4. Live Telemetry Status Beacon */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3 z-20">
          {!reducedMotion && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                state === 'processing'
                  ? 'bg-sky-400'
                  : state === 'error'
                  ? 'bg-rose-500'
                  : state === 'success'
                  ? 'bg-emerald-400'
                  : 'bg-teal-400'
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-3 w-3 border-2 border-slate-900 shadow-xs ${
              state === 'processing'
                ? 'bg-sky-400'
                : state === 'error'
                ? 'bg-rose-500'
                : state === 'success'
                ? 'bg-emerald-500'
                : 'bg-teal-400'
            }`}
          />
        </span>
      </div>
    </div>
  );
};
