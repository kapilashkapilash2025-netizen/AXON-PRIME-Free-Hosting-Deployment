'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { getDisciplinePresentation } from '../lib/disciplineUi';

function BreakdownModal({ open, data, onClose }) {
  if (!open || !data || data.status === 'INSUFFICIENT_DATA') return null;

  const rows = [
    ['Risk Adherence', data.riskAdherence, 40],
    ['Overtrading', data.overtrading, 20],
    ['R Quality', data.rQuality, 20],
    ['Drawdown Control', data.drawdownControl, 20],
    ['Recovery Bonus', data.bonus, 5]
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="panel w-full max-w-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Discipline Score Breakdown</h3>
          <button className="btn-muted px-3 py-1 text-xs" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {rows.map(([label, value, max]) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-navy-950/60 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{value} / {max}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-slate-800 p-4">
          <h4 className="text-sm font-semibold text-slate-200">Violations & Deductions</h4>
          {(data.deductions || []).length ? (
            <ul className="mt-3 space-y-3 text-sm text-slate-300">
              {data.deductions.map((item) => (
                <li key={`${item.code}-${item.pointsLost}`} className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                  <div className="font-medium text-rose-300">-{item.pointsLost} • {item.message}</div>
                  <div className="mt-1 text-slate-400">Suggestion: {item.suggestion}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-emerald-300">No violations detected. Keep following your risk process.</p>
          )}
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Window: last {data.metrics?.evaluationWindowDays || 90} days | Avg R: {data.metrics?.avgRMultiple ?? 0} | Max DD: {data.metrics?.maxDrawdownPct ?? 0}% | Stable days: {data.metrics?.stableDaysCount ?? 0}
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score, color, insufficient }) {
  const [animatedScore, setAnimatedScore] = useState(score ?? 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (insufficient) {
      setAnimatedScore(0);
      return undefined;
    }

    const target = Number(score || 0);
    let current = animatedScore;
    const step = () => {
      const delta = target - current;
      if (Math.abs(delta) < 0.5) {
        setAnimatedScore(target);
        return;
      }
      current += delta * 0.18;
      setAnimatedScore(Number(current.toFixed(1)));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score, insufficient]);

  const normalized = insufficient ? 0 : Math.max(0, Math.min(100, Number(animatedScore || 0)));
  const angle = normalized * 3.6;
  const ringColor = insufficient ? '#64748b' : color;

  return (
    <div
      className="grid h-28 w-28 place-items-center rounded-full transition-all duration-500"
      style={{ background: `conic-gradient(${ringColor} ${angle}deg, rgba(30,41,59,0.85) ${angle}deg 360deg)` }}
    >
      <div className="grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full bg-navy-950 text-center">
        <div className="text-2xl font-semibold" style={{ color: ringColor }}>
          {insufficient ? '--' : Math.round(animatedScore)}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{insufficient ? '' : '/100'}</div>
      </div>
    </div>
  );
}

export default function DisciplineScoreCard({ refreshSignal = 0, onScoreUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const previousScoreRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    setLoading(true);

    apiFetch('/analytics/discipline-score')
      .then((res) => {
        if (!isActive) return;
        setData(res);

        const prev = previousScoreRef.current;
        const next = res?.score;
        if (mountedRef.current && prev != null && next != null && typeof onScoreUpdate === 'function' && prev !== next) {
          const delta = next - prev;
          const topReason = res?.deductions?.[0]?.code || 'DISCIPLINE_REEVALUATED';
          onScoreUpdate({ delta, reason: topReason, score: next });
        }

        if (mountedRef.current && prev != null && next != null) {
          if (next < 60) {
            setNotice({ type: 'warning', message: 'Your trading discipline is deteriorating. Review your risk plan.' });
          } else if (next > prev) {
            setNotice({ type: 'positive', message: 'Good recovery. Discipline improving.' });
          } else {
            setNotice(null);
          }
        }

        previousScoreRef.current = next;
        mountedRef.current = true;
      })
      .catch(() => {
        if (!isActive) return;
        setData({
          score: null,
          status: 'INSUFFICIENT_DATA'
        });
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [refreshSignal, onScoreUpdate]);

  const presentation = useMemo(
    () => getDisciplinePresentation(data?.score, data?.status),
    [data?.score, data?.status]
  );
  const insufficient = data?.status === 'INSUFFICIENT_DATA' || data?.score == null;

  if (loading && !data) {
    return (
      <div className="panel p-5">
        <div className="skeleton h-4 w-40" />
        <div className="mt-4 flex items-center gap-4">
          <div className="skeleton h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-44" />
            <div className="skeleton h-4 w-36" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Discipline Score</h3>
            <p
              className="text-xs text-slate-400"
              title="Score evaluates daily loss respect, overtrading frequency, consecutive losses, average R quality, drawdown control, and recovery behavior."
            >
              Behavioral capital protection score (0-100)
            </p>
          </div>
          <button className="btn-muted px-3 py-1 text-xs" type="button" onClick={() => setOpen(true)} disabled={!data || insufficient}>
            View Breakdown
          </button>
        </div>

        {notice ? (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${notice.type === 'warning' ? 'border-rose-600 bg-rose-950/30 text-rose-300' : 'border-emerald-600 bg-emerald-950/20 text-emerald-300'}`}>
            {notice.message}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <ScoreRing score={data?.score} color={presentation.color} insufficient={insufficient} />

          <div className="space-y-1 text-sm">
            <div className="text-slate-300">Status: <span style={{ color: presentation.color }} className="font-semibold">{presentation.label}</span></div>
            <div className="text-slate-400">{presentation.subtitle}</div>
            {!insufficient ? (
              <>
                <div className="text-slate-400">Risk Adherence: {data?.riskAdherence ?? 0}/40</div>
                <div className="text-slate-400">Overtrading: {data?.overtrading ?? 0}/20</div>
                <div className="text-slate-400">R Quality: {data?.rQuality ?? 0}/20</div>
                <div className="text-slate-400">Drawdown: {data?.drawdownControl ?? 0}/20</div>
                <div className="text-slate-400">Recovery Bonus: +{data?.bonus ?? 0}</div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <BreakdownModal open={open} data={data} onClose={() => setOpen(false)} />
    </>
  );
}
