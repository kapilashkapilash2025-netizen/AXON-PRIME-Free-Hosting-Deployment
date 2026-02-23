'use client';

function badgeTheme(status) {
  if (status === 'DEGRADING') return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
  if (status === 'WEAKENING') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (status === 'STABLE') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  return 'border-slate-700 bg-slate-900/40 text-slate-300';
}

function formatDelta(value, suffix = '%') {
  if (value == null) return '--';
  const sign = Number(value) > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

export default function BehavioralStabilityIndicator({ behavioralStability, behavioralDegradation }) {
  const stability = behavioralStability || { status: 'BASELINE_BUILDING', label: 'Baseline Building' };
  const metrics = behavioralDegradation?.metrics;

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Behavioral Stability Index</div>
          <div className="mt-1 text-sm text-slate-400">Last 5 trades vs previous 10 trades</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTheme(stability.status)}`}>
          {stability.label || 'Baseline Building'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Win Rate Change</div>
          <div className={`mt-1 text-lg font-semibold ${(stability.winRateChangePct ?? 0) < -20 ? 'text-rose-300' : 'text-slate-100'}`}>
            {formatDelta(stability.winRateChangePct)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg R Change</div>
          <div className={`mt-1 text-lg font-semibold ${(stability.avgRChangePct ?? 0) < -15 ? 'text-rose-300' : 'text-slate-100'}`}>
            {formatDelta(stability.avgRChangePct)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Risk Size Change</div>
          <div className={`mt-1 text-lg font-semibold ${(stability.riskSizeChangePct ?? 0) > 30 ? 'text-amber-300' : 'text-slate-100'}`}>
            {formatDelta(stability.riskSizeChangePct)}
          </div>
        </div>
      </div>

      {behavioralDegradation?.status === 'READY' && (behavioralDegradation.reasons || []).length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-300">
          {behavioralDegradation.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/30 p-3 text-sm text-slate-400">
          {metrics ? 'No material degradation flags detected in the current comparison window.' : 'Behavioral comparison activates after enough closed trades to compare the last 5 vs previous 10.'}
        </div>
      )}
    </div>
  );
}
