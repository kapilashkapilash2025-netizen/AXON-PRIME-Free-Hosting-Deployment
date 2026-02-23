'use client';

function RiskBar({ label, value, tone }) {
  const pct = Math.max(0, Math.min(Number(value || 0), 100));
  const toneClass =
    tone === 'critical'
      ? 'from-rose-500 to-rose-400'
      : tone === 'warn'
        ? 'from-amber-500 to-orange-400'
        : 'from-skyaccent-500 to-cyan-300';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-300">{label}</span>
        <span className={pct > 40 ? 'text-rose-300' : 'text-slate-200'}>{pct.toFixed(2)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-900/70">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneClass} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProjectedCapitalRiskPanel({ projection, lockedHint = false }) {
  const p = projection || {};
  const collapseRisk = Number(p.probabilityCapitalDecline30Pct || 0);
  const showCollapseBanner = collapseRisk > 40;

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Projected Capital Risk (Next 30 Trades)</div>
          <div className="mt-1 text-sm text-slate-400">Longer-horizon drawdown and capital decline probability modeling</div>
        </div>
        <div className="flex items-center gap-2">
          {lockedHint ? (
            <span className="cursor-help rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300" title="Available in PRO">
              PRO
            </span>
          ) : null}
          <span className="rounded-full border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-300">
            Horizon: {p.horizonTrades || 30} trades
          </span>
        </div>
      </div>

      {showCollapseBanner ? (
        <div className="mt-4 rounded-lg border border-rose-500/35 bg-rose-950/15 p-3 text-sm text-rose-300">
          ⚠️ High Capital Collapse Risk Detected
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <RiskBar
          label="Probability of 20% Drawdown"
          value={p.probabilityDrawdown20Pct}
          tone={Number(p.probabilityDrawdown20Pct || 0) > 40 ? 'critical' : 'warn'}
        />
        <RiskBar
          label="Probability of 30% Capital Decline"
          value={p.probabilityCapitalDecline30Pct}
          tone={Number(p.probabilityCapitalDecline30Pct || 0) > 40 ? 'critical' : 'warn'}
        />
        <RiskBar
          label="Risk of Ruin %"
          value={p.riskOfRuinPct}
          tone={Number(p.riskOfRuinPct || 0) > 20 ? 'critical' : 'warn'}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Expected Capital Variance</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">
            {p.expectedCapitalVariancePct ?? '--'}{p.expectedCapitalVariancePct != null ? '%' : ''}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">95% Stress Drawdown</div>
          <div className="mt-1 text-lg font-semibold text-rose-300">
            {p.estimatedWorstCaseDrawdownPct ?? '--'}{p.estimatedWorstCaseDrawdownPct != null ? '%' : ''}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Confidence Band</div>
          <div className="mt-1 text-lg font-semibold text-skyaccent-300">
            {p.confidenceBandPct ?? '--'}{p.confidenceBandPct != null ? '%' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

