import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from '../styles/ParticleBackground.module.scss';

interface Particle {
  element: HTMLDivElement;
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  size: number;
  opacity: number;
  hue: number;
  energy: number;
  phase: number;
  active: boolean; // Track if particle is active
  newTransform: string;
  newOpacity: string;
}

const ParticleBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const performanceMonitorRef = useRef<{ lastCheck: number; frames: number }>({
    lastCheck: 0,
    frames: 0,
  });
  const [reduced, setReduced] = useState(false);

  // Reduced FPS and optimized delay
  const FPS = reduced ? 20 : 30;
  const frameDelay = 1000 / FPS;

  // Optimized particle parameters
  const particleParams = useMemo(
    () => ({
      maxParticles: reduced ? 8 : 12, // Reduced from 15
      baseHues: [190, 160, 140],
      sizeRange: { min: 15, max: 35 }, // Slightly reduced max size
      opacityRange: { min: 0.15, max: 0.35 }, // Reduced opacity
      speedRange: { min: -0.04, max: 0.04 }, // Reduced speed
      poolSize: 20, // Size of particle pool for reuse
    }),
    [reduced]
  );

  // Initialize particle pool
  const initializeParticlePool = useCallback(() => {
    if (!containerRef.current) return;

    // Clear existing particles
    particlesRef.current.forEach(particle => particle.element.remove());
    particlesRef.current = [];

    // Create particle pool
    for (let i = 0; i < particleParams.poolSize; i++) {
      const particle = document.createElement('div');
      particle.classList.add(styles.particle);
      particle.style.display = 'none'; // Initially hidden
      containerRef.current.appendChild(particle);

      particlesRef.current.push({
        element: particle,
        x: 0,
        y: 0,
        speedX: 0,
        speedY: 0,
        size: 0,
        opacity: 0,
        hue: 0,
        energy: 0,
        phase: 0,
        active: false,
        newTransform: '',
        newOpacity: '',
      });
    }
  }, [particleParams.poolSize]);

  // Optimized particle creation using pool
  const activateParticle = useCallback(() => {
    if (!containerRef.current) return;

    // Find inactive particle in pool
    const inactiveParticle = particlesRef.current.find(p => !p.active);
    if (!inactiveParticle) return;

    const size =
      Math.random() * (particleParams.sizeRange.max - particleParams.sizeRange.min) +
      particleParams.sizeRange.min;

    const hueIndex = Math.floor(Math.random() * particleParams.baseHues.length);
    const hue = particleParams.baseHues[hueIndex] + Math.random() * 15;

    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const opacity =
      Math.random() * (particleParams.opacityRange.max - particleParams.opacityRange.min) +
      particleParams.opacityRange.min;

    // Update particle properties
    Object.assign(inactiveParticle, {
      x,
      y,
      speedX:
        Math.random() * (particleParams.speedRange.max - particleParams.speedRange.min) +
        particleParams.speedRange.min,
      speedY:
        Math.random() * (particleParams.speedRange.max - particleParams.speedRange.min) +
        particleParams.speedRange.min,
      size,
      opacity,
      hue,
      energy: Math.random(),
      phase: Math.random() * Math.PI * 2,
      active: true,
    });

    // Update particle element
    inactiveParticle.element.style.cssText = `
      display: block;
      width: ${size}px;
      height: ${size}px;
      background: hsla(${hue}, 85%, 25%, ${opacity});
      transform: translate(${x}%, ${y}%) scale(1);
      will-change: transform, opacity;
      pointer-events: none;
    `;

    // Limit active particles
    const activeCount = particlesRef.current.filter(p => p.active).length;
    if (activeCount > particleParams.maxParticles) {
      const oldestActive = particlesRef.current.find(p => p.active);
      if (oldestActive) {
        oldestActive.active = false;
        oldestActive.element.style.display = 'none';
      }
    }
  }, [particleParams]);

  // Optimized update function with performance monitoring
  const updateParticles = useCallback(() => {
    const now = performance.now();
    const delta = now - lastUpdateRef.current;

    // Performance monitoring
    performanceMonitorRef.current.frames++;
    if (now - performanceMonitorRef.current.lastCheck > 1000) {
      const fps = performanceMonitorRef.current.frames;
      performanceMonitorRef.current.frames = 0;
      performanceMonitorRef.current.lastCheck = now;

      // Reduce particles if performance is poor
      if (fps < FPS * 0.75 && !reduced) {
        setReduced(true);
      }
    }

    if (delta < frameDelay) {
      animationFrameRef.current = requestAnimationFrame(updateParticles);
      return;
    }

    lastUpdateRef.current = now;

    particlesRef.current.forEach(particle => {
      if (!particle.active) return;

      // Update particle state
      particle.phase += 0.006;
      particle.energy = Math.sin(particle.phase) * 0.2 + 0.8;
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x > 100 || particle.x < 0) {
        particle.speedX *= -1;
        particle.x = Math.max(0, Math.min(100, particle.x));
      }
      if (particle.y > 100 || particle.y < 0) {
        particle.speedY *= -1;
        particle.y = Math.max(0, Math.min(100, particle.y));
      }

      // Store new values without updating DOM
      particle.newTransform = `translate3d(${particle.x}%, ${particle.y}%, 0) scale(${1 + particle.energy * 0.1})`;
      particle.newOpacity = (particle.opacity * particle.energy).toString();
    });

    // Batch DOM updates in a single tick to reduce layout thrashing
    requestAnimationFrame(() => {
      particlesRef.current.forEach(particle => {
        if (!particle.active) return;
        particle.element.style.transform = particle.newTransform;
        particle.element.style.opacity = particle.newOpacity;
      });
    });

    animationFrameRef.current = requestAnimationFrame(updateParticles);
  }, [frameDelay, FPS, reduced]);

  useEffect(() => {
    // Initialize particle pool
    initializeParticlePool();

    // Reduced particle creation frequency
    const intervalId = setInterval(activateParticle, reduced ? 800 : 600);

    // Initialize performance monitoring
    performanceMonitorRef.current = { lastCheck: performance.now(), frames: 0 };
    lastUpdateRef.current = performance.now();

    // Start update loop
    updateParticles();

    return () => {
      clearInterval(intervalId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up particles
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.firstChild.remove();
        }
      }
      particlesRef.current = [];
    };
  }, [initializeParticlePool, activateParticle, updateParticles, reduced]);

  return (
    <div
      ref={containerRef}
      className={styles.particleBackground}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        willChange: 'transform',
        transform: 'translateZ(0)',
        zIndex: -1,
      }}
    />
  );
};

// Prevent unnecessary re-renders
export default React.memo(ParticleBackground);
