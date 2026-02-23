'use client';

export default function ForwardRiskProjectionPanel({ forwardProjection, lockedHint = false }) {
  const projection = forwardProjection || {};

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">5-Trade Forward Risk Projection</div>
          <div className="mt-1 text-sm text-slate-400">Short-horizon capital variance and downside envelope</div>
        </div>
        <div className="flex items-center gap-2">
          {lockedHint ? (
            <span
              className="cursor-help rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300"
              title="Available in PRO"
            >
              PRO
            </span>
          ) : null}
          <span className="rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300">Projection Horizon: {projection.horizonTrades || 5}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Expected Capital Variance</div>
          <div className="mt-1 text-xl font-semibold text-slate-100">{projection.expectedCapitalVariancePct ?? '--'}{projection.expectedCapitalVariancePct != null ? '%' : ''}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Estimated Worst-Case Drawdown</div>
          <div className="mt-1 text-xl font-semibold text-rose-300">{projection.estimatedWorstCaseDrawdownPct ?? '--'}{projection.estimatedWorstCaseDrawdownPct != null ? '%' : ''}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Confidence Band</div>
          <div className="mt-1 text-xl font-semibold text-skyaccent-300">{projection.confidenceBandPct ?? '--'}{projection.confidenceBandPct != null ? '%' : ''}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 p-3 text-sm text-slate-300">
        {projection.summary || 'Forward projection summary unavailable.'}
      </div>
    </div>
  );
}
