'use client';

import { useState } from 'react';
import { apiFetch } from '../lib/api';

const initialForm = {
  accountBalance: '',
  riskPercent: '1',
  entryPrice: '',
  stopLoss: ''
};

export default function PositionSizeCalculator() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const data = await apiFetch('/risk/position-size', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setResult(data);
    } catch {
      setError('Unable to calculate position size. Please verify input values.');
    }
  }

  return (
    <div className="panel p-5">
      <h3 className="text-lg font-semibold">Smart Position Size Calculator</h3>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <input className="input" placeholder="Account Balance" value={form.accountBalance} onChange={(e) => setForm({ ...form, accountBalance: e.target.value })} />
        <input className="input" placeholder="Risk %" value={form.riskPercent} onChange={(e) => setForm({ ...form, riskPercent: e.target.value })} />
        <input className="input" placeholder="Entry Price" value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} />
        <input className="input" placeholder="Stop Loss" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} />
        <button className="btn-primary md:col-span-2" type="submit">Calculate</button>
      </form>
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {result ? (
        <div className="mt-4 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
          <div>Position Size: <strong>{result.positionSize}</strong></div>
          <div>Dollar Risk: <strong>${result.dollarRisk}</strong></div>
          <div>Risk-Reward Ratio: <strong>{result.riskRewardRatio}</strong></div>
          <div>Leverage Suggestion: <strong>{result.leverageSuggestion}x</strong></div>
        </div>
      ) : null}
    </div>
  );
}
