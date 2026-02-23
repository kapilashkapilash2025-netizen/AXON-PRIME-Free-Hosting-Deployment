'use client';

import { useEffect, useMemo, useState } from 'react';

function formatMoney(value) {
  if (value == null) return '--';
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function AnimatedDipLine({ currentCapital, projectedCapital }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    let rafId = 0;
    const duration = 1200;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setProgress(t);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentCapital, projectedCapital]);

  const current = Math.max(Number(currentCapital || 0), 1);
  const projected = Math.max(Number(projectedCapital || 0), 0);
  const dropPct = Math.max(0, Math.min(1, (current - projected) / current));

  const x1 = 18;
  const x2 = 84;
  const x3 = 160;
  const x4 = 242;
  const topY = 28;
  const dipY = topY + dropPct * 92;

  const dipProgress = Math.min(progress / 0.6, 1);
  const recoverProgress = progress <= 0.6 ? 0 : Math.min((progress - 0.6) / 0.4, 1);

  const p1 = `${x1},${topY}`;
  const p2x = x1 + (x2 - x1) * dipProgress;
  const p2y = topY + (dipY - topY) * dipProgress;
  const p2 = `${p2x},${p2y}`;
  const p3x = x2 + (x3 - x2) * recoverProgress;
  const p3y = dipY;
  const p4x = x3 + (x4 - x3) * recoverProgress;
  const p4y = dipY;

  const linePoints = progress <= 0.6 ? `${p1} ${p2}` : `${x1},${topY} ${x2},${dipY} ${p3x},${p3y} ${p4x},${p4y}`;
  const areaPoints = progress <= 0.6
    ? `${x1},132 ${x1},${topY} ${p2} ${p2x},132`
    : `${x1},132 ${x1},${topY} ${x2},${dipY} ${p3x},${p3y} ${p4x},${p4y} ${p4x},132`;

  return (
    <svg viewBox="0 0 260 140" className="h-36 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="dipFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d="M18 132 H242" stroke="#1f2937" strokeWidth="1" strokeDasharray="3 3" />
      <path d={`M ${areaPoints}`} fill="url(#dipFill)" />
      <polyline points={linePoints} fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x1} cy={topY} r="3" fill="#22d3ee" />
      {progress > 0.55 ? <circle cx={x2} cy={dipY} r="3.4" fill="#fb7185" /> : null}
      <text x="18" y="16" fill="#94a3b8" fontSize="10">Current</text>
      <text x="184" y="16" fill="#94a3b8" fontSize="10">After 3 losses</text>
    </svg>
  );
}

function WarningRow({ message, level }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${level === 'CRITICAL' ? 'border-rose-500/40 bg-rose-950/20 text-rose-300' : 'border-amber-500/40 bg-amber-950/15 text-amber-300'}`}>
      {message}
    </div>
  );
}

export default function ThreeLossScenarioProjection({ capitalStressProjection, riskProjectionWarnings = [], lockedExtended = false }) {
  const threeLoss = capitalStressProjection?.threeLossScenario || null;
  const fiveLoss = capitalStressProjection?.fiveLossScenario || null;

  const panelTone = useMemo(() => {
    const drop = Number(threeLoss?.dropPct || 0);
    if (drop > 5) {
      return 'border-rose-600/35 shadow-[0_0_24px_rgba(239,68,68,0.10)]';
    }
    return 'border-slate-800';
  }, [threeLoss?.dropPct]);

  if (!threeLoss) {
    return (
      <div className="rounded-xl border border-slate-800 bg-navy-950/40 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-400">3 Consecutive Loss Scenario</div>
        <p className="mt-2 text-sm text-slate-400">Scenario simulation activates when predictive analytics becomes available.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl border bg-navy-950/40 p-4 ${panelTone}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">3 Consecutive Loss Scenario</div>
          <div className="mt-1 text-sm text-slate-400">Compounded capital impact at current risk-per-trade profile</div>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300">
          Risk / Trade: {threeLoss.riskPerTradePct}%
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
          <AnimatedDipLine currentCapital={threeLoss.currentCapital} projectedCapital={threeLoss.projectedCapital} />
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Current Capital</div>
            <div className="mt-1 text-xl font-semibold text-slate-100">{formatMoney(threeLoss.currentCapital)}</div>
          </div>
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/12 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Projected Capital (After 3 Losses)</div>
            <div className="mt-1 text-xl font-semibold text-rose-300">{formatMoney(threeLoss.projectedCapital)}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Projected Drop</div>
            <div className={`mt-1 text-xl font-semibold ${Number(threeLoss.dropPct) > 5 ? 'text-rose-300' : 'text-amber-300'}`}>-{threeLoss.dropPct}%</div>
          </div>
        </div>
      </div>

      {(riskProjectionWarnings || []).length ? (
        <div className="mt-4 space-y-2">
          {riskProjectionWarnings.map((warning) => (
            <WarningRow key={warning.code} message={warning.message} level={warning.level} />
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">5-Loss Stress Scenario {lockedExtended ? '(PRO)' : ''}</div>
            <div className="mt-1 text-sm text-slate-300">Extended downside stress modeling</div>
          </div>
          {lockedExtended ? (
            <span className="cursor-help rounded-full border border-slate-700 bg-slate-900/40 px-2 py-1 text-[11px] text-slate-300" title="Available in PRO">
              PRO
            </span>
          ) : null}
        </div>

        <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/25 p-3">
          <div className={lockedExtended ? 'blur-[2px] opacity-60' : ''}>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Current</div>
                <div className="mt-1 text-slate-100">{formatMoney(fiveLoss?.currentCapital)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">After 5 Losses</div>
                <div className="mt-1 text-rose-300">{formatMoney(fiveLoss?.projectedCapital)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Drop</div>
                <div className="mt-1 text-amber-300">-{fiveLoss?.dropPct ?? '--'}%</div>
              </div>
            </div>
          </div>
          {lockedExtended ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/45">
              <div className="rounded-xl border border-slate-600/80 bg-[#060c18]/90 px-4 py-3 text-center shadow-[0_10px_40px_rgba(2,6,23,0.45)]">
                <div className="text-sm font-semibold text-slate-100">🔒 Upgrade to activate full capital stress modeling</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
