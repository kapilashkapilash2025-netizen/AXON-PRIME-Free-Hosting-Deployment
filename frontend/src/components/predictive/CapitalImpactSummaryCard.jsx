'use client';

function money(value) {
  if (value == null) return '--';
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function CapitalImpactSummaryCard({ capitalImpact, lockedHint = false }) {
  const data = capitalImpact || {};

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Capital Leak Detection</div>
          <div className="mt-1 text-sm text-slate-400">Behavior-linked capital damage and preventable loss estimate</div>
        </div>
        <div className="flex items-center gap-2">
          {lockedHint ? (
            <span className="cursor-help rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300" title="Available in PRO">
              PRO
            </span>
          ) : null}
          <span className="rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300">
            Flagged Trades: {data.emotionalDeviationTradesCount ?? '--'}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-rose-500/25 bg-rose-950/10 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Capital Lost (Emotional)</div>
          <div className="mt-1 text-xl font-semibold text-rose-300">{money(data.capitalLostDueToEmotionalTrades)}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/10 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Potential Avoided Loss</div>
          <div className="mt-1 text-xl font-semibold text-emerald-300">{money(data.potentialAvoidedLossWithPredictiveEngine)}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Monthly Risk Leakage</div>
          <div className="mt-1 text-xl font-semibold text-amber-300">
            {data.monthlyRiskLeakagePct ?? '--'}{data.monthlyRiskLeakagePct != null ? '%' : ''}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3 text-sm text-rose-300">
          {data.messages?.loss || 'Emotional deviation loss estimate unavailable.'}
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3 text-sm text-emerald-300">
          {data.messages?.avoided || 'Preventable loss estimate unavailable.'}
        </div>
      </div>
    </div>
  );
}

