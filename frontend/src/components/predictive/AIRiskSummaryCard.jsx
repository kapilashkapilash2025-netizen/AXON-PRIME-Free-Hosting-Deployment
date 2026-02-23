'use client';

export default function AIRiskSummaryCard({ data }) {
  const text = data?.aiRiskExplanation || data?.forwardProjection?.summary || 'Predictive risk narrative unavailable.';
  const metrics = data?.metrics || {};
  const alerts = data?.alerts || [];

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">AI Risk Explanation Card</div>
          <div className="mt-1 text-sm text-slate-400">Behavioral pattern interpretation from recent trade journal data</div>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300">Capital Forecast Narrative</span>
      </div>

      <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 p-4 text-sm leading-6 text-slate-200">{text}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Win Rate (5)</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{metrics.rollingWinRate5 ?? '--'}{metrics.rollingWinRate5 != null ? '%' : ''}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Avg R</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{metrics.averageRMultiple ?? '--'}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Risk / Trade</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{metrics.riskPerTradePct ?? '--'}{metrics.riskPerTradePct != null ? '%' : ''}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Trade Freq / Hr</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">{metrics.tradeFrequencyPerHour ?? '--'}</div>
        </div>
      </div>

      {(alerts || []).length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {alerts.map((alert) => (
            <span
              key={alert.code}
              className={`rounded-full border px-2.5 py-1 text-xs ${alert.level === 'CRITICAL' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}
            >
              {alert.message}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
