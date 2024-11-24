import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef, useCallback } from 'react';
import styles from '../styles/ParticleBackground.module.scss';
const ParticleBackground = () => {
    const containerRef = useRef(null);
    const createParticle = useCallback(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const particle = document.createElement('div');
        particle.classList.add(styles.particle);
        const size = Math.random() * 20 + 5;
        const hue = Math.random() * 360;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const blur = Math.random() * 2;
        particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: hsla(${hue}, 70%, 70%, 0.2);
      left: ${x}%;
      top: ${y}%;
      filter: blur(${blur}px);
      transform: translate(0, 0) scale(1);
      opacity: 1;
      transition: transform 10s ease-out, opacity 10s ease-out;
    `;
        container.appendChild(particle);
        // Force a reflow to ensure the initial state is applied
        void particle.offsetWidth;
        // Apply the final state
        particle.style.transform = `translate(${(Math.random() - 0.5) * 200}%, ${(Math.random() - 0.5) * 200}%) scale(0)`;
        particle.style.opacity = '0';
        // Remove the particle after the animation
        setTimeout(() => particle.remove(), 10000);
    }, []);
    useEffect(() => {
        const intervalId = setInterval(createParticle, 200);
        return () => clearInterval(intervalId);
    }, [createParticle]);
    return _jsx("div", { ref: containerRef, className: styles.particleBackground });
};
export default React.memo(ParticleBackground);
//# sourceMappingURL=ParticleBackground.js.map