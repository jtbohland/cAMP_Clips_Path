/** Lightweight CSS-only confetti animation — renders 50 colored particles */
import { useEffect, useState } from "react";

const COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: randomBetween(5, 95),
      delay: randomBetween(0, 2),
      duration: randomBetween(2, 4),
      color: COLORS[i % COLORS.length],
      size: randomBetween(6, 12),
      rotation: randomBetween(0, 360),
    }))
  );

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
