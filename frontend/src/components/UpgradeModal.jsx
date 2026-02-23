'use client';

const planFeatures = {
  PRO: {
    title: 'Pro Plan - $29/month',
    badge: 'Most Popular',
    points: [
      'Predictive Risk Modeling',
      'Drawdown Probability Engine',
      'Behavioral Degradation Detection',
      'Capital Acceleration Index'
    ]
  },
  ELITE: {
    title: 'Elite Plan - $49/month',
    badge: 'For Advanced Traders',
    points: [
      'Everything in Pro',
      'Advanced Risk Heatmap',
      'Monte Carlo Projection Depth',
      'Performance Decomposition'
    ]
  }
};

export default function UpgradeModal({ plan, onClose, onConfirm, loading }) {
  if (!plan) return null;
  const config = planFeatures[plan];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="panel w-full max-w-xl p-6">
        <h3 className="text-xl font-semibold">Compare Plans Before Upgrade</h3>
        <p className="mt-2 text-sm text-slate-400">You are upgrading to a recurring monthly subscription.</p>

        <div className="mt-4 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-skyaccent-400">{config.title}</h4>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${plan === 'PRO' ? 'bg-skyaccent-500/15 text-skyaccent-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
              {config.badge}
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {config.points.map((point) => (
              <li key={point}>✔ {point}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-muted" onClick={onClose} type="button" disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm} type="button" disabled={loading}>
            {loading ? 'Redirecting...' : 'Continue to Secure Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
