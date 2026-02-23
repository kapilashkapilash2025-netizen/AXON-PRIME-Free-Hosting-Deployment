'use client';

import { useEffect, useState } from 'react';

function toneForValue(label, value) {
  const v = Number(value || 0);
  if (label === '-5%' && v > 40) return { text: 'text-rose-300', fill: 'from-rose-500 to-red-500', cap: 'bg-rose-500/15 text-rose-300' };
  if (v > 25) return { text: 'text-amber-300', fill: 'from-amber-400 to-orange-500', cap: 'bg-amber-500/15 text-amber-300' };
  return { text: 'text-cyan-300', fill: 'from-cyan-400 to-sky-500', cap: 'bg-cyan-500/15 text-cyan-300' };
}

function AnimatedBar({ label, value, reveal }) {
  const [heightPct, setHeightPct] = useState(0);
  const normalized = Math.max(0, Math.min(100, Number(value || 0)));
  const tone = toneForValue(label, normalized);

  useEffect(() => {
    const id = setTimeout(() => setHeightPct(normalized), reveal ? 120 : 0);
    return () => clearTimeout(id);
  }, [normalized, reveal]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`rounded-full px-2 py-1 text-[11px] font-medium ${tone.cap}`}>{normalized}%</div>
      <div className="relative flex h-40 w-16 items-end overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50 p-1">
        <div
          className={`w-full rounded-md bg-gradient-to-t ${tone.fill} transition-all duration-700`}
          style={{ height: `${heightPct}%`, minHeight: normalized > 0 ? '8px' : 0 }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,transparent_0%,transparent_24%,rgba(148,163,184,0.07)_25%,transparent_26%,transparent_49%,rgba(148,163,184,0.07)_50%,transparent_51%,transparent_74%,rgba(148,163,184,0.07)_75%,transparent_76%)]" />
      </div>
      <div className={`text-sm font-semibold ${tone.text}`}>{label}</div>
      <div className="text-[11px] text-slate-500">drawdown</div>
    </div>
  );
}

export default function DrawdownProbabilityChart({ probabilities, reveal = false }) {
  const rows = [
    { label: '-3%', value: probabilities?.drawdown_3 ?? 0 },
    { label: '-5%', value: probabilities?.drawdown_5 ?? 0 },
    { label: '-8%', value: probabilities?.drawdown_8 ?? 0 }
  ];

  return (
    <div className={`rounded-xl border border-slate-800 bg-navy-950/40 p-4 transition-all duration-700 ${reveal ? 'scale-[1.01] ring-1 ring-skyaccent-500/20' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Drawdown Probability Bar Chart</div>
          <div className="mt-1 text-sm text-slate-400">Monte Carlo-style next 5 trade drawdown probability</div>
        </div>
        <div className="cursor-help rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400" title="Projection estimates the probability of reaching each drawdown threshold within the next 5 trades based on recent win rate, average R, risk sizing, and loss streak behavior.">
          Next 5 trades
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {rows.map((row) => (
          <AnimatedBar key={row.label} label={row.label} value={row.value} reveal={reveal} />
        ))}
      </div>
    </div>
  );
}
