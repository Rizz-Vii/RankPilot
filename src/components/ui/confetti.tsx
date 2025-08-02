"use client";

import React, { useEffect, useState } from "react";

interface ConfettiProps {
  duration?: number;
  particleCount?: number;
}

export function Confetti({
  duration = 3000,
  particleCount = 50,
}: ConfettiProps) {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      left: number;
      animationDelay: number;
      color: string;
    }>
  >([]);

  const colors = [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#ffeaa7",
    "#dda0dd",
    "#98d8c8",
    "#f7dc6f",
    "#bb8fce",
    "#85c1e9",
  ];

  useEffect(() => {
    const newParticles = Array.from({ length: particleCount }, (_, _i) => ({
      id: _i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 3000,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, particleCount]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 opacity-80"
          style={{
            left: `${particle.left}%`,
            backgroundColor: particle.color,
            animation: `confetti-fall 3s linear ${particle.animationDelay}ms forwards`,
            top: "-10px",
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
