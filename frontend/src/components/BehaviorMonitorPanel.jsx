'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

const uiByStatus = {
  NORMAL: {
    panel: 'border-emerald-600/40',
    subtitle: 'text-emerald-300',
    badge: 'bg-emerald-500/15 text-emerald-300',
    meter: 'from-emerald-500 to-emerald-300',
    pulse: false,
    message: 'Normal activity'
  },
  WARNING: {
    panel: 'border-amber-500/50',
    subtitle: 'text-amber-300',
    badge: 'bg-amber-500/15 text-amber-300 animate-riskWarn',
    meter: 'from-yellow-400 via-amber-400 to-orange-500',
    pulse: false,
    message: 'Trading frequency increasing'
  },
  CRITICAL: {
    panel: 'border-rose-600/60 animate-riskPulse',
    subtitle: 'text-rose-300',
    badge: 'bg-rose-500/15 text-rose-300 animate-riskPulse',
    meter: 'from-orange-500 via-rose-500 to-red-500',
    pulse: true,
    message: 'Overtrading risk detected'
  }
};

function intensityPercent(intensityLevel) {
  if (intensityLevel === 'SAFE') return 20;
  if (intensityLevel === 'CAUTION') return 50;
  if (intensityLevel === 'HIGH_RISK') return 78;
  if (intensityLevel === 'CRITICAL') return 100;
  return 0;
}

export default function BehaviorMonitorPanel({ refreshSignal = 0, onBehaviorImpact, onStatusEscalation, role = 'FREE' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meterWidth, setMeterWidth] = useState(0);
  const [vibrate, setVibrate] = useState(false);
  const prevImpactRef = useRef(null);
  const prevStatusRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch('/analytics/overtrading-status')
      .then((res) => {
        if (!active) return;
        setData(res);
        setMeterWidth(intensityPercent(res.intensityLevel));

        const prevStatus = prevStatusRef.current;
        if (
          mountedRef.current &&
          typeof onStatusEscalation === 'function' &&
          prevStatus &&
          prevStatus !== res.status &&
          (res.status === 'WARNING' || res.status === 'CRITICAL')
        ) {
          onStatusEscalation(res);
        }
        prevStatusRef.current = res.status;

        if (res.intensityLevel === 'HIGH_RISK' || res.intensityLevel === 'CRITICAL') {
          setVibrate(true);
          setTimeout(() => setVibrate(false), 700);
        }

        if (mountedRef.current && typeof onBehaviorImpact === 'function') {
          const prevImpact = prevImpactRef.current;
          if (prevImpact !== res.behavioralScoreImpact && res.notificationMessage) {
            onBehaviorImpact(res);
          }
        }

        prevImpactRef.current = res.behavioralScoreImpact;
        mountedRef.current = true;
      })
      .catch(() => {
        if (!active) return;
        setData({
          tradesToday: 0,
          status: 'NORMAL',
          intensityLevel: 'SAFE',
          behavioralScoreImpact: 0,
          flags: [],
          suggestion: 'Behavior monitor temporarily unavailable.'
        });
        setMeterWidth(20);
        prevStatusRef.current = 'NORMAL';
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshSignal, onBehaviorImpact, onStatusEscalation]);

  if (loading && !data) {
    return (
      <div className="panel p-5">
        <div className="skeleton h-4 w-44" />
        <div className="mt-4 skeleton h-24" />
      </div>
    );
  }

  const ui = uiByStatus[data?.status || 'NORMAL'];
  const impact = Number(data?.behavioralScoreImpact || 0);

  const isHighIntensity = data?.intensityLevel === 'HIGH_RISK' || data?.intensityLevel === 'CRITICAL';

  return (
    <div
      className={`panel p-5 transition-all duration-300 ${ui.panel} ${vibrate ? 'animate-vibrateSubtle' : ''} ${isHighIntensity ? 'shadow-[0_0_28px_rgba(244,63,94,0.15)]' : ''}`}
      title="Behavior monitor tracks trading frequency, rapid entries, and losing streak patterns to detect overtrading risk."
    >
      {data?.status === 'CRITICAL' ? (
        <div className="mb-4 rounded-md border border-rose-600 bg-rose-950/35 p-3 text-sm text-rose-300">
          Excessive trading detected. Consider stopping for today.
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Behavior Monitor</h3>
          <p className={`text-sm ${ui.subtitle}`}>{ui.message}</p>
        </div>
        <div className="flex items-center gap-2">
          {role === 'FREE' ? (
            <span className="cursor-help rounded-full border border-slate-700 bg-slate-900/40 px-2 py-1 text-[11px] text-slate-300" title="Available in PRO">
              PRO
            </span>
          ) : null}
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ui.badge} ${isHighIntensity ? 'animate-riskPulse' : ''}`}>{data?.status || 'NORMAL'}</span>
          <span className="cursor-help text-xs text-slate-500">?</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-navy-950/50 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Risk Intensity Meter</span>
          <span>{data?.intensityLevel || 'SAFE'}</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${ui.meter} transition-all duration-700 ${ui.pulse ? 'animate-riskPulse' : ''}`}
            style={{ width: `${meterWidth}%` }}
          />
        </div>
        <div className="mt-2 grid grid-cols-4 text-[11px] text-slate-500">
          <span>SAFE</span>
          <span className="text-center">CAUTION</span>
          <span className="text-center">HIGH</span>
          <span className="text-right">CRITICAL</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-navy-950/50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Trades Today</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{data?.tradesToday ?? 0}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-navy-950/50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Score Impact</div>
          <div className={`mt-1 text-2xl font-semibold ${impact < 0 ? 'text-rose-300' : impact > 0 ? 'text-emerald-300' : 'text-slate-200'}`}>
            {impact > 0 ? `+${impact}` : impact}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-navy-950/50 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Flags</div>
          <div className="mt-1 text-sm text-slate-200">{(data?.flags || []).length ? data.flags.length : 0}</div>
        </div>
      </div>

      {(data?.flags || []).length ? (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
          <div className="font-medium text-slate-200">Detected Patterns</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.flags.map((flag) => <li key={flag}>{flag}</li>)}
          </ul>
        </div>
      ) : null}

      <div className={`mt-4 rounded-md border p-3 text-sm ${data?.noViolations24h ? 'border-emerald-600/50 bg-emerald-950/15 text-emerald-300' : 'border-slate-800 bg-navy-950/30 text-slate-400'}`}>
        {data?.suggestion}
      </div>
    </div>
  );
}
