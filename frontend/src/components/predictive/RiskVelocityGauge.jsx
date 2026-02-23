'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function bandColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 30) return '#facc15';
  return '#22c55e';
}

function labelFromLevel(level) {
  if (level === 'CRITICAL') return 'Critical';
  if (level === 'HIGH') return 'High';
  if (level === 'ELEVATED') return 'Elevated';
  return 'Stable';
}

export default function RiskVelocityGauge({ score, level, reveal = false }) {
  const [animatedScore, setAnimatedScore] = useState(Number(score || 0));
  const rafRef = useRef(null);

  useEffect(() => {
    let current = animatedScore;
    const target = clamp(Number(score || 0), 0, 100);

    const step = () => {
      const delta = target - current;
      if (Math.abs(delta) < 0.35) {
        setAnimatedScore(target);
        return;
      }
      current += delta * 0.14;
      setAnimatedScore(Number(current.toFixed(1)));
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const normalized = clamp(Number(animatedScore || 0), 0, 100);
  const angle = -90 + (normalized / 100) * 180;
  const theta = (angle * Math.PI) / 180;
  const cx = 150;
  const cy = 150;
  const radius = 104;
  const needleLen = 82;
  const nx = cx + needleLen * Math.cos(theta);
  const ny = cy + needleLen * Math.sin(theta);
  const needleColor = bandColor(normalized);

  const shadowClass = useMemo(() => {
    if (normalized >= 80) return 'shadow-[0_0_32px_rgba(239,68,68,0.16)]';
    if (normalized >= 60) return 'shadow-[0_0_28px_rgba(249,115,22,0.12)]';
    if (normalized >= 30) return 'shadow-[0_0_24px_rgba(250,204,21,0.10)]';
    return 'shadow-[0_0_22px_rgba(34,197,94,0.10)]';
  }, [normalized]);

  const label = labelFromLevel(level);

  return (
    <div className={`rounded-xl border border-slate-800 bg-navy-950/45 p-4 transition-all duration-700 ${shadowClass} ${reveal ? 'ring-1 ring-skyaccent-500/25' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Capital Acceleration Index</div>
          <div className="mt-1 text-sm text-slate-400">Risk Velocity Gauge (0-100)</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${normalized >= 80 ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : normalized >= 60 ? 'border-orange-500/40 bg-orange-500/10 text-orange-300' : normalized >= 30 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'} ${normalized >= 80 ? 'animate-riskPulse' : ''}`}>
          {label}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <svg viewBox="0 0 300 180" className="h-48 w-full max-w-[22rem]" aria-hidden="true">
          <defs>
            <linearGradient id="velocityArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="35%" stopColor="#facc15" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path d="M 46 150 A 104 104 0 0 1 254 150" fill="none" stroke="#1f2937" strokeWidth="18" strokeLinecap="round" />
          <path d="M 46 150 A 104 104 0 0 1 254 150" fill="none" stroke="url(#velocityArc)" strokeWidth="14" strokeLinecap="round" opacity="0.95" />

          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke={needleColor}
            strokeWidth="4"
            strokeLinecap="round"
            style={{ transition: 'x2 700ms ease-out, y2 700ms ease-out, stroke 700ms ease-out' }}
          />
          <circle cx={cx} cy={cy} r="8" fill="#0b1220" stroke={needleColor} strokeWidth="3" />

          <text x="42" y="170" fill="#64748b" fontSize="11">0</text>
          <text x="100" y="170" fill="#64748b" fontSize="11">30</text>
          <text x="146" y="170" fill="#64748b" fontSize="11">60</text>
          <text x="195" y="170" fill="#64748b" fontSize="11">80</text>
          <text x="245" y="170" fill="#64748b" fontSize="11">100</text>
        </svg>
      </div>

      <div className="-mt-6 text-center">
        <div className={`text-3xl font-semibold ${normalized >= 80 ? 'text-rose-300' : normalized >= 60 ? 'text-orange-300' : normalized >= 30 ? 'text-amber-300' : 'text-emerald-300'}`}>{Math.round(normalized)}</div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Capital Acceleration Index</div>
      </div>
    </div>
  );
}
