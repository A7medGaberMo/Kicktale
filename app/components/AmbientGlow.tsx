"use client";

import { useEffect, useRef } from 'react';

export default function AmbientGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.background =
          `radial-gradient(900px at ${e.clientX}px ${e.clientY}px, rgba(204,164,59,0.035) 0%, transparent 70%)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const el = particlesRef.current;
    if (!el) return;
    const particles: HTMLSpanElement[] = [];
    for (let i = 0; i < 40; i++) {
      const span = document.createElement('span');
      span.className = 'kt-particle';
      span.style.left = `${Math.random() * 100}%`;
      span.style.top = `${Math.random() * 100}%`;
      const size = Math.random() * 2.5 + 1;
      span.style.width = `${size}px`;
      span.style.height = span.style.width;
      span.style.animationDelay = `${Math.random() * 10}s`;
      span.style.animationDuration = `${Math.random() * 8 + 6}s`;
      span.style.opacity = `${Math.random() * 0.1 + 0.04}`;
      el.appendChild(span);
      particles.push(span);
    }
    return () => particles.forEach(p => p.remove());
  }, []);

  return (
    <>
      <div ref={glowRef} className="kt-ambient-glow" />
      <div ref={particlesRef} className="kt-ambient-particles" />
    </>
  );
}