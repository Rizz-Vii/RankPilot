"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
  // Define color palette inside effect to avoid recreating array each render (exhaustive-deps warning)
    const colors = [
      "rgb(255,107,107)",
      "rgb(78,205,196)",
      "rgb(69,183,209)",
      "rgb(150,206,180)",
      "rgb(255,234,167)",
      "rgb(221,160,221)",
      "rgb(152,216,200)",
      "rgb(247,220,111)",
      "rgb(187,143,206)",
      "rgb(133,193,233)",
    ];
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
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
            /* Use dynamic viewport to avoid iOS URL bar jump */
            transform: translateY(100dvh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
