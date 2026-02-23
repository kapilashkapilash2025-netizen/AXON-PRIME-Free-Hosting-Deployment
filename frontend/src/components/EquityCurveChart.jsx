'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../lib/api';

const sampleBlurData = [
  { i: 0, label: 'T1', equity: 10000, drawdownPercent: 0 },
  { i: 1, label: 'T2', equity: 10120, drawdownPercent: 0 },
  { i: 2, label: 'T3', equity: 10080, drawdownPercent: 0.4 },
  { i: 3, label: 'T4', equity: 10240, drawdownPercent: 0 },
  { i: 4, label: 'T5', equity: 10170, drawdownPercent: 0.68 },
  { i: 5, label: 'T6', equity: 10360, drawdownPercent: 0 }
];

function deriveStats(rows) {
  if (!rows.length) {
    return { peakEquity: 0, currentEquity: 0, maxDrawdownPercent: 0, currentDrawdownPercent: 0 };
  }

  const peakEquity = rows.reduce((max, row) => Math.max(max, row.equity), rows[0].equity);
  const currentEquity = rows[rows.length - 1].equity;
  const maxDrawdownPercent = rows.reduce((max, row) => Math.max(max, row.drawdownPercent), 0);
  const currentDrawdownPercent = rows[rows.length - 1].drawdownPercent;

  return {
    peakEquity: Number(peakEquity.toFixed(2)),
    currentEquity: Number(currentEquity.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    currentDrawdownPercent: Number(currentDrawdownPercent.toFixed(2))
  };
}

export default function EquityCurveChart({ refreshSignal = 0, onActivated, role = 'FREE' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hadNoDataRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch('/analytics/equity-curve')
      .then((data) => {
        if (!active) return;
        if (data?.status === 'NO_DATA') {
          setRows([]);
          setNoData(true);
          return;
        }

        const normalized = Array.isArray(data)
          ? data.map((p, index) => ({
              i: index,
              date: p.date,
              label: new Date(p.date).toLocaleDateString(),
              dateLabel: new Date(p.date).toLocaleString(),
              equity: Number(p.equity || 0),
              drawdownPercent: Number(p.drawdownPercent || 0)
            }))
          : [];

        setRows(normalized);
        setNoData(normalized.length === 0);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        setNoData(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshSignal]);

  useEffect(() => {
    if (hadNoDataRef.current === true && noData === false && rows.length > 0) {
      setRevealed(true);
      if (typeof onActivated === 'function') onActivated();
      setTimeout(() => setRevealed(false), 1400);
    }
    hadNoDataRef.current = noData;
  }, [noData, rows.length, onActivated]);

  const drawdownRanges = useMemo(() => {
    const ranges = [];
    let start = null;

    rows.forEach((point, idx) => {
      if (point.drawdownPercent > 0 && start === null) start = idx;
      if ((point.drawdownPercent === 0 || idx === rows.length - 1) && start !== null) {
        ranges.push({ start, end: idx });
        start = null;
      }
    });

    return ranges;
  }, [rows]);

  const stats = useMemo(() => deriveStats(rows), [rows]);

  if (loading) {
    return (
      <div className={`panel p-5 transition-all duration-700 ${revealed ? 'ring-1 ring-skyaccent-500/60 shadow-[0_0_35px_rgba(34,211,238,0.15)]' : ''}`}>
        <div className="skeleton h-5 w-56" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
        <div className="mt-4 skeleton h-72" />
      </div>
    );
  }

  if (noData) {
    return (
      <div className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Equity Curve Analytics</h3>
            <p className="text-sm text-slate-400">Performance curve, drawdown pressure, and equity progression</p>
          </div>
          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">Locked until trade data</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-navy-950/60 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Max Drawdown</div>
            <div className="mt-1 text-xl font-semibold text-slate-300">--</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-navy-950/60 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Current Drawdown</div>
            <div className="mt-1 text-xl font-semibold text-slate-300">--</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-navy-950/60 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Peak Equity</div>
            <div className="mt-1 text-xl font-semibold text-slate-300">--</div>
          </div>
        </div>

        <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-800 bg-navy-950/50 p-4">
          <div className="pointer-events-none blur-[3px] opacity-45">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sampleBlurData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="equity" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="drawdownPercent" stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-transparent via-navy-950/40 to-navy-950/70 p-6 text-center">
            <div>
              <h4 className="text-lg font-semibold text-slate-100">Add trades to unlock performance analytics</h4>
              <p className="mt-2 text-sm text-slate-400">Your institutional equity curve, drawdown heat, and recovery profile will appear here once closed trades are recorded.</p>
              <div className="mt-4 inline-flex rounded-full border border-skyaccent-500/40 bg-skyaccent-500/10 px-3 py-1 text-xs text-skyaccent-300">
                Tip: Start by logging 3-5 recent trades in the journal
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`panel p-5 transition-all duration-700 ${revealed ? 'ring-1 ring-skyaccent-500/60 shadow-[0_0_35px_rgba(34,211,238,0.15)]' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Equity Curve Analytics</h3>
          <p className="text-sm text-slate-400">Institutional-style equity progression and drawdown visualization</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {role === 'FREE' ? (
            <span
              className="cursor-help rounded-full border border-slate-700 bg-slate-900/40 px-2 py-1 text-slate-300"
              title="Available in PRO"
            >
              PRO
            </span>
          ) : null}
          <span className="rounded-full bg-skyaccent-500/15 px-2 py-1 text-skyaccent-300">Equity</span>
          <span className="rounded-full bg-rose-500/15 px-2 py-1 text-rose-300">Drawdown Region</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-navy-950/60 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Max Drawdown</div>
          <div className="mt-1 text-xl font-semibold text-rose-300">{stats.maxDrawdownPercent}%</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-navy-950/60 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Current Drawdown</div>
          <div className="mt-1 text-xl font-semibold text-amber-300">{stats.currentDrawdownPercent}%</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-navy-950/60 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Peak Equity</div>
          <div className="mt-1 text-xl font-semibold text-skyaccent-300">${stats.peakEquity}</div>
        </div>
      </div>

      <div className="mt-4 h-80 w-full rounded-lg border border-slate-800 bg-navy-950/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
            <XAxis dataKey="i" stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(value) => rows[value]?.label || ''} />
            <YAxis yAxisId="equity" stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#07112b', border: '1px solid #334155', borderRadius: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
              labelFormatter={(value) => rows[value]?.dateLabel || ''}
              formatter={(value, name) => {
                if (name === 'equity') return [`$${Number(value).toFixed(2)}`, 'Equity'];
                if (name === 'drawdownPercent') return [`${Number(value).toFixed(2)}%`, 'Drawdown'];
                return [value, name];
              }}
            />
            {drawdownRanges.map((range) => (
              <ReferenceArea
                key={`${range.start}-${range.end}`}
                x1={range.start}
                x2={range.end}
                yAxisId="equity"
                fill="#7f1d1d"
                fillOpacity={0.14}
                ifOverflow="extendDomain"
              />
            ))}
            <Area
              yAxisId="equity"
              type="monotone"
              dataKey="equity"
              stroke="#22d3ee"
              strokeWidth={2.2}
              fill="url(#eqFill)"
              isAnimationActive
              animationDuration={850}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
