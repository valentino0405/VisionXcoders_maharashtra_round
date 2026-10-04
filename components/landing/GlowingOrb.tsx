"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { motion } from "framer-motion";

export function GlowingOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);

  useEffect(() => {
    let phi = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = canvas.offsetWidth || 500;
    const onResize = () => {
      if (canvas) {
        width = canvas.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio, 2),
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.22,
      dark: 1,
      diffuse: 1.35,
      mapSamples: 24000,
      mapBrightness: 5.2,
      baseColor: [0.03, 0.1, 0.24],
      markerColor: [0.02, 0.85, 1.0],
      glowColor: [0.05, 0.42, 0.92],
      scale: 1.05,
      markers: [],
    });

    let animationFrameId: number;
    const animate = () => {
      if (!pointerInteracting.current) {
        phi += 0.0028;
      }
      globe.update({
        phi: phi + pointerInteractionMovement.current,
        width: width * 2,
        height: width * 2,
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="relative w-full max-w-[640px] h-[450px] md:h-[520px] flex items-center justify-center select-none">
      
      {/* ─── 1. Deep Volumetric Floor Nebula Underglow (Electric Cyan/Blue) ─── */}
      <div 
        className="absolute w-[520px] md:w-[680px] h-[260px] md:h-[340px] rounded-full blur-[95px] -bottom-8 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at 50% 60%, rgba(6, 182, 212, 0.42) 0%, rgba(37, 99, 235, 0.25) 38%, rgba(30, 58, 138, 0.1) 65%, transparent 80%)"
        }}
      />

      {/* ─── 2. Floating Cyan Cosmic Particles / Stardust ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(24)].map((_, i) => {
          const top = (i * 17 + 8) % 90;
          const left = (i * 29 + 11) % 88 + 6;
          const size = (i % 3) === 0 ? 2.5 : (i % 3) === 1 ? 1.8 : 1.2;
          const duration = 3.5 + (i % 6) * 1.1;
          const delay = (i % 8) * 0.5;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-cyan-300"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: "0 0 6px #06b6d4, 0 0 12px #3b82f6",
              }}
              animate={{
                y: [0, -25, -45, -15],
                opacity: [0.15, 0.85, 0.35, 0.15],
                scale: [0.8, 1.25, 0.9, 0.8],
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          3. BACK ORBITAL LAYER (z-5: Rendered BEHIND the globe)
          When orbits/satellites pass behind the globe, the solid sphere naturally
          blocks them from view, giving genuine 3D occlusion!
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none z-[5] flex items-center justify-center">
        
        {/* Ring 1 Back (Tilted -22deg, Upper Arc only) */}
        <div 
          className="absolute w-[470px] md:w-[610px] h-[190px] md:h-[250px]"
          style={{
            transform: "rotate(-22deg)",
            clipPath: "polygon(0 0, 100% 0, 100% 52%, 0 52%)", // Only upper half (behind globe)
          }}
        >
          <svg viewBox="0 0 610 250" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="back-laser-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.05" />
                <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.5" />
                <stop offset="70%" stopColor="#2563eb" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
              </linearGradient>
              <path id="backOrbitPath1" d="M 35,125 A 270,95 0 1,0 575,125 A 270,95 0 1,0 35,125" />
            </defs>

            {/* Back Track Line */}
            <use href="#backOrbitPath1" fill="none" stroke="url(#back-laser-1)" strokeWidth="1.2" opacity="0.7" />

            {/* Satellite 1 moving behind (smaller, dimmer, occluded by globe) */}
            <g>
              <animateMotion dur="12s" repeatCount="indefinite" rotate="auto">
                <mpath href="#backOrbitPath1" />
              </animateMotion>
              <circle cx="0" cy="0" r="8" fill="#06b6d4" opacity="0.12" />
              <circle cx="0" cy="0" r="2.2" fill="#38bdf8" opacity="0.75" />
              <circle cx="0" cy="0" r="1.2" fill="#ffffff" opacity="0.8" />
            </g>

            {/* Satellite 2 moving behind (180deg offset) */}
            <g>
              <animateMotion dur="12s" begin="-6s" repeatCount="indefinite" rotate="auto">
                <mpath href="#backOrbitPath1" />
              </animateMotion>
              <circle cx="0" cy="0" r="7" fill="#06b6d4" opacity="0.1" />
              <circle cx="0" cy="0" r="1.8" fill="#38bdf8" opacity="0.7" />
              <circle cx="0" cy="0" r="1.0" fill="#ffffff" opacity="0.75" />
            </g>
          </svg>
        </div>

        {/* Ring 2 Back (Tilted +25deg, Upper Arc only) */}
        <div 
          className="absolute w-[450px] md:w-[590px] h-[180px] md:h-[235px]"
          style={{
            transform: "rotate(25deg)",
            clipPath: "polygon(0 0, 100% 0, 100% 52%, 0 52%)",
          }}
        >
          <svg viewBox="0 0 590 235" className="w-full h-full overflow-visible">
            <defs>
              <path id="backOrbitPath2" d="M 35,117.5 A 260,88 0 1,0 555,117.5 A 260,88 0 1,0 35,117.5" />
            </defs>
            <use href="#backOrbitPath2" fill="none" stroke="#06b6d4" strokeWidth="1.1" strokeDasharray="5,4" opacity="0.45" />

            {/* Satellite 3 moving behind */}
            <g>
              <animateMotion dur="15s" begin="-3s" repeatCount="indefinite" rotate="auto">
                <mpath href="#backOrbitPath2" />
              </animateMotion>
              <circle cx="0" cy="0" r="8" fill="#06b6d4" opacity="0.1" />
              <circle cx="0" cy="0" r="2.0" fill="#38bdf8" opacity="0.7" />
              <circle cx="0" cy="0" r="1.1" fill="#ffffff" opacity="0.75" />
            </g>
          </svg>
        </div>

        {/* Ring 3 Back (Horizon guide upper arc) */}
        <div 
          className="absolute w-[470px] md:w-[610px] h-[120px] md:h-[150px] opacity-25"
          style={{
            transform: "rotate(-4deg) translateY(40px)",
            clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)",
          }}
        >
          <svg viewBox="0 0 610 150" className="w-full h-full overflow-visible">
            <ellipse cx="305" cy="75" rx="290" ry="55" fill="none" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="4,6" />
          </svg>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          4. THE 3D WEBGL GLOBE (z-10: Solid 3D Centerpiece)
          The solid spherical base physically blocks the back orbit from being seen!
      ════════════════════════════════════════════════════════════════════════ */}
      <div 
        className="relative w-[340px] h-[340px] md:w-[440px] md:h-[440px] flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta * 0.005;
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta * 0.005;
          }
        }}
      >
        {/* Solid Spherical Dark Base (guarantees 100% complete occlusion of objects behind) */}
        <div 
          className="absolute inset-1.5 md:inset-2 rounded-full pointer-events-none z-0"
          style={{
            background: "radial-gradient(circle at 45% 30%, #061128 0%, #020716 55%, #01030b 100%)",
            boxShadow: "inset 0 0 40px #01030a, 0 0 50px rgba(6, 182, 212, 0.2)",
          }}
        />

        {/* WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full aspect-square relative z-10"
          style={{
            contain: "layout paint size",
            opacity: 0.97,
          }}
        />

        {/* Photorealistic Curved Specular Light Sheen across Upper Horizon */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-50 z-20"
          style={{
            background: "radial-gradient(circle at 45% 25%, rgba(255, 255, 255, 0.28) 0%, rgba(56, 189, 248, 0.12) 35%, transparent 65%)",
          }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          5. FRONT ORBITAL LAYER (z-20: Rendered IN FRONT of the globe)
          Only the lower half of the orbit that passes in front of the globe is shown here!
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
        
        {/* Ring 1 Front (Tilted -22deg, Lower Arc passing in front of globe) */}
        <div 
          className="absolute w-[470px] md:w-[610px] h-[190px] md:h-[250px]"
          style={{
            transform: "rotate(-22deg)",
            clipPath: "polygon(0 48%, 100% 48%, 100% 100%, 0 100%)", // Only lower half (in front of globe)
          }}
        >
          <svg viewBox="0 0 610 250" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="front-laser-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.05" />
                <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.85" />
                <stop offset="55%" stopColor="#2563eb" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
              </linearGradient>

              <filter id="front-glow-1" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur1" />
                <feGaussianBlur stdDeviation="6" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <path id="frontOrbitPath1" d="M 35,125 A 270,95 0 1,0 575,125 A 270,95 0 1,0 35,125" />
            </defs>

            {/* Glowing Front Laser Track */}
            <use 
              href="#frontOrbitPath1" 
              fill="none" 
              stroke="url(#front-laser-1)" 
              strokeWidth="1.6" 
              filter="url(#front-glow-1)" 
            />

            {/* Satellite Node 1 in foreground (radiant, sharp, glowing) */}
            <g>
              <animateMotion dur="12s" repeatCount="indefinite" rotate="auto">
                <mpath href="#frontOrbitPath1" />
              </animateMotion>
              <circle cx="0" cy="0" r="14" fill="#06b6d4" opacity="0.22" />
              <circle cx="0" cy="0" r="8" fill="#38bdf8" opacity="0.45" />
              <circle cx="0" cy="0" r="3.6" fill="#38bdf8" filter="url(#front-glow-1)" />
              <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
            </g>

            {/* Satellite Node 2 in foreground (opposite phase) */}
            <g>
              <animateMotion dur="12s" begin="-6s" repeatCount="indefinite" rotate="auto">
                <mpath href="#frontOrbitPath1" />
              </animateMotion>
              <circle cx="0" cy="0" r="12" fill="#06b6d4" opacity="0.18" />
              <circle cx="0" cy="0" r="7" fill="#38bdf8" opacity="0.4" />
              <circle cx="0" cy="0" r="3.0" fill="#38bdf8" />
              <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
            </g>
          </svg>
        </div>

        {/* Ring 2 Front (Tilted +25deg, Lower Arc passing in front of globe) */}
        <div 
          className="absolute w-[450px] md:w-[590px] h-[180px] md:h-[235px]"
          style={{
            transform: "rotate(25deg)",
            clipPath: "polygon(0 48%, 100% 48%, 100% 100%, 0 100%)",
          }}
        >
          <svg viewBox="0 0 590 235" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="front-laser-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.05" />
                <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
                <stop offset="75%" stopColor="#2563eb" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
              </linearGradient>

              <filter id="front-glow-2" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <path id="frontOrbitPath2" d="M 35,117.5 A 260,88 0 1,0 555,117.5 A 260,88 0 1,0 35,117.5" />
            </defs>

            {/* Glowing Front Dashed Track */}
            <use 
              href="#frontOrbitPath2" 
              fill="none" 
              stroke="url(#front-laser-2)" 
              strokeWidth="1.4" 
              strokeDasharray="6,4" 
              filter="url(#front-glow-2)" 
            />

            {/* Satellite Node 3 in foreground */}
            <g>
              <animateMotion dur="15s" begin="-3s" repeatCount="indefinite" rotate="auto">
                <mpath href="#frontOrbitPath2" />
              </animateMotion>
              <circle cx="0" cy="0" r="13" fill="#06b6d4" opacity="0.2" />
              <circle cx="0" cy="0" r="7.5" fill="#38bdf8" opacity="0.4" />
              <circle cx="0" cy="0" r="3.4" fill="#38bdf8" filter="url(#front-glow-2)" />
              <circle cx="0" cy="0" r="1.7" fill="#ffffff" />
            </g>
          </svg>
        </div>

        {/* Ring 3 Front (Horizon guide lower arc) */}
        <div 
          className="absolute w-[470px] md:w-[610px] h-[120px] md:h-[150px] opacity-45"
          style={{
            transform: "rotate(-4deg) translateY(40px)",
            clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
          }}
        >
          <svg viewBox="0 0 610 150" className="w-full h-full overflow-visible">
            <ellipse cx="305" cy="75" rx="290" ry="55" fill="none" stroke="#06b6d4" strokeWidth="0.9" strokeDasharray="4,6" />
          </svg>
        </div>

      </div>

    </div>
  );
}
