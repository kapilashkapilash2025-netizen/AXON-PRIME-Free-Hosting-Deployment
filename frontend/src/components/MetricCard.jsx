export default function MetricCard({
  label,
  value,
  tone = 'neutral',
  glow = false,
  pulse = false,
  borderAnimate = false,
  progressPct = null,
  progressMax = 100,
  tooltip = ''
}) {
  const toneClass = {
    neutral: 'text-slate-100',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-rose-400'
  };

  const borderClass = borderAnimate ? 'animate-riskWarn border-amber-500/80' : '';
  const pulseClass = pulse ? 'animate-riskPulse' : '';
  const glowClass = glow ? 'shadow-[0_0_25px_rgba(16,185,129,0.18)]' : '';
  const normalizedProgress =
    progressPct == null ? null : Math.max(0, Math.min(100, (Number(progressPct) / Math.max(progressMax, 1)) * 100));

  return (
    <div className={`panel p-4 transition-all duration-300 ${borderClass} ${pulseClass} ${glowClass}`} title={tooltip}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
        {tooltip ? <span className="cursor-help text-xs text-slate-500">?</span> : null}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass[tone]}`}>{value}</div>
      {normalizedProgress != null ? (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-500"
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Risk utilization scale</div>
        </div>
      ) : null}
    </div>
  );
}
