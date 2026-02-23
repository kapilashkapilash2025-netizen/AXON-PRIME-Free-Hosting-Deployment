'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import UpgradeModal from './UpgradeModal';

function normalizeSubscription(subscription) {
  if (!subscription) {
    return { planLabel: 'FREE', statusLabel: 'ACTIVE', statusTone: 'active' };
  }

  const planLabel = subscription.plan || 'FREE';
  const rawStatus = subscription.status || 'INACTIVE';

  if (planLabel === 'FREE' && ['INACTIVE', 'CANCELED', 'INCOMPLETE'].includes(rawStatus)) {
    return { planLabel: 'FREE', statusLabel: 'ACTIVE', statusTone: 'active' };
  }

  const activeStates = ['ACTIVE', 'PAST_DUE'];
  return {
    planLabel,
    statusLabel: activeStates.includes(rawStatus) ? 'ACTIVE' : 'EXPIRED',
    statusTone: activeStates.includes(rawStatus) ? 'active' : 'expired'
  };
}

export default function SubscriptionPanel({ role = 'FREE', riskCompositeScore = 0 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    apiFetch('/subscriptions')
      .then((data) => setSubscription(data.subscription))
      .catch(() => {});
  }, []);

  async function startCheckout() {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: selectedPlan })
      });
      window.location.href = data.url;
    } catch {
      setError('Checkout could not be started. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/subscriptions/portal', { method: 'POST' });
      window.location.href = data.url;
    } catch {
      setError('Billing portal is unavailable at the moment.');
    } finally {
      setLoading(false);
    }
  }

  const normalized = normalizeSubscription(subscription);
  const isFreePlan = (role || normalized.planLabel) === 'FREE';
  const qualifiesForUrgency = isFreePlan && Number(riskCompositeScore || 0) > 50;
  const ctaClass = qualifiesForUrgency ? 'animate-riskPulse shadow-[0_0_20px_rgba(56,189,248,0.18)]' : '';

  return (
    <div className="panel p-5">
      <h3 className="text-lg font-semibold">Subscription Plans</h3>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-slate-400">Current:</span>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-100">{normalized.planLabel}</span>
        <span className={`rounded-full px-2 py-0.5 ${normalized.statusTone === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
          {normalized.statusLabel}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 p-3">
          <div className="text-sm text-slate-300">Free</div>
          <div className="mt-1 text-xl font-semibold">$0</div>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            <li>• Basic journal</li>
            <li>• Manual tracking</li>
          </ul>
        </div>
        <div className="rounded-lg border border-skyaccent-600 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-300">Pro</div>
            <span className="rounded-full bg-skyaccent-500/15 px-2 py-0.5 text-[11px] font-semibold text-skyaccent-300">Most Popular</span>
          </div>
          <div className="mt-1 text-xl font-semibold">$29/mo</div>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li>✔ Predictive Risk Modeling</li>
            <li>✔ Drawdown Probability Engine</li>
            <li>✔ Behavioral Degradation Detection</li>
            <li>✔ Capital Acceleration Index</li>
          </ul>
          <div className="mt-2 rounded-full border border-slate-700 bg-slate-900/40 px-2 py-1 text-[11px] text-slate-300">
            Professional traders use predictive risk control.
          </div>
          <button className={`btn-primary mt-3 w-full ${ctaClass}`} disabled={loading} onClick={() => setSelectedPlan('PRO')}>Activate Predictive Risk Engine</button>
        </div>
        <div className="rounded-lg border border-emerald-600 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-300">Elite</div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">For Advanced Traders</span>
          </div>
          <div className="mt-1 text-xl font-semibold">$49/mo</div>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li>✔ Everything in Pro</li>
            <li>✔ Advanced Risk Heatmap</li>
            <li>✔ Monte Carlo Projection Depth</li>
            <li>✔ Performance Decomposition</li>
          </ul>
          <button className={`btn-primary mt-3 w-full ${ctaClass}`} disabled={loading} onClick={() => setSelectedPlan('ELITE')}>Activate Predictive Risk Engine</button>
        </div>
      </div>
      {qualifiesForUrgency ? (
        <div className="mt-3 rounded-lg border border-skyaccent-500/40 bg-skyaccent-950/15 p-3 text-sm text-skyaccent-200">
          Your current trading behavior qualifies for PRO Risk Protection.
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/40 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Capability</th>
              <th className="px-3 py-2 text-left">FREE</th>
              <th className="px-3 py-2 text-left">PRO</th>
              <th className="px-3 py-2 text-left">ELITE</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Basic journal', 'Yes', 'Yes', 'Yes'],
              ['Manual tracking', 'Yes', 'Yes', 'Yes'],
              ['Emotional Risk Detection', 'No', 'Yes', 'Yes'],
              ['Drawdown Projection', 'No', 'Yes', 'Yes'],
              ['Overtrading Monitor', 'No', 'Yes', 'Yes'],
              ['Capital Leak Detection', 'No', 'Yes', 'Yes'],
              ['Monte Carlo Simulation', 'No', 'No', 'Yes'],
              ['Risk of Ruin %', 'No', 'No', 'Yes'],
              ['Behavioral AI Scoring', 'No', 'No', 'Yes'],
              ['Institutional Risk Engine', 'No', 'No', 'Yes']
            ].map(([cap, free, pro, elite]) => (
              <tr key={cap} className="border-t border-slate-800 text-slate-300">
                <td className="px-3 py-2">{cap}</td>
                <td className="px-3 py-2">{free}</td>
                <td className="px-3 py-2">{pro}</td>
                <td className="px-3 py-2">{elite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {['PRO', 'ELITE'].includes(normalized.planLabel) ? (
        <button className="btn-muted mt-3" disabled={loading} onClick={openPortal} type="button">
          Manage Subscription
        </button>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      <UpgradeModal
        plan={selectedPlan}
        loading={loading}
        onClose={() => setSelectedPlan(null)}
        onConfirm={startCheckout}
      />
    </div>
  );
}
