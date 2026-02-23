'use client';

import { useEffect, useState } from 'react';

function severityTheme(key, value) {
  const v = Number(value || 0);
  if (key === 'drawdown_5' && v > 40) return { bar: 'from-rose-500 to-red-500', text: 'text-rose-300', badge: 'bg-rose-500/10 text-rose-300' };
  if (v > 25) return { bar: 'from-amber-400 to-orange-500', text: 'text-amber-300', badge: 'bg-amber-500/10 text-amber-300' };
  return { bar: 'from-sky-400 to-cyan-400', text: 'text-cyan-300', badge: 'bg-cyan-500/10 text-cyan-300' };
}

function ProbabilityRow({ label, value, rowKey, reveal }) {
  const [width, setWidth] = useState(0);
  const normalized = Math.max(0, Math.min(100, Number(value || 0)));
  const theme = severityTheme(rowKey, normalized);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(normalized), reveal ? 120 : 0);
    return () => clearTimeout(timer);
  }, [normalized, reveal]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-300">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${theme.badge}`}>{normalized}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-slate-800 bg-slate-900/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${theme.bar} transition-all duration-700`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function DrawdownProbabilityBars({ probabilities, reveal = false }) {
  const rows = [
    { key: 'drawdown_3', label: '-3% drawdown probability', value: probabilities?.drawdown_3 },
    { key: 'drawdown_5', label: '-5% drawdown probability', value: probabilities?.drawdown_5 },
    { key: 'drawdown_8', label: '-8% drawdown probability', value: probabilities?.drawdown_8 }
  ];

  return (
    <div className={`rounded-xl border border-slate-800 bg-navy-950/40 p-4 transition-all duration-700 ${reveal ? 'ring-1 ring-skyaccent-500/20' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Drawdown Probability Visualizer</div>
          <div className="mt-1 text-sm text-slate-400">Projected risk thresholds over next 5 trades</div>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300">Monte Carlo (lightweight)</span>
      </div>

      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <ProbabilityRow key={row.key} rowKey={row.key} label={row.label} value={row.value} reveal={reveal} />
        ))}
      </div>
    </div>
  );
}
