'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function AdvancedPanels({ role }) {
  const [heatmap, setHeatmap] = useState(null);
  const [overtrading, setOvertrading] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!['PRO', 'ELITE', 'FOUNDER'].includes(role)) return;

    setLoading(true);
    Promise.all([apiFetch('/analytics/heatmap'), apiFetch('/analytics/overtrading')])
      .then(([h, o]) => {
        setHeatmap(h);
        setOvertrading(o);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [role]);

  if (!['PRO', 'ELITE', 'FOUNDER'].includes(role)) {
    return (
      <div className="panel p-5">
        <h3 className="text-lg font-semibold">Advanced Analytics</h3>
        <p className="mt-2 text-sm text-slate-400">Upgrade to PRO or ELITE to unlock risk heatmap and overtrading detection.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel p-5">
        <h3 className="text-lg font-semibold">Risk Heatmap</h3>
        <p className="mt-1 text-xs text-slate-400">
          Open Exposure: <span className="text-skyaccent-400">{heatmap?.totalOpenExposurePct || 0}%</span>
        </p>
        <div className="mt-3 space-y-2">
          {loading ? <div className="text-sm text-slate-500">Loading heatmap...</div> : null}
          {(heatmap?.exposureBuckets || []).map((row) => (
            <div key={row.symbol} className="flex items-center justify-between rounded bg-navy-950 px-3 py-2 text-sm">
              <span>{row.symbol}</span>
              <span className="text-skyaccent-400">{row.exposurePct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel p-5">
        <h3 className="text-lg font-semibold">Overtrading Detection</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-amber-300">
          {(overtrading?.flags || []).map((flag) => <li key={flag}>{flag}</li>)}
        </ul>
      </div>
    </div>
  );
}
