'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import DeleteConfirmModal from './DeleteConfirmModal';

const defaultTrade = {
  symbol: '',
  side: 'LONG',
  entryPrice: '',
  stopLoss: '',
  exitPrice: '',
  quantity: '',
  riskAmount: '',
  rewardAmount: '',
  pnl: '',
  openedAt: '',
  closedAt: '',
  notes: ''
};

export default function TradeJournal({ onTradesChanged }) {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({});
  const [form, setForm] = useState(defaultTrade);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tradingLocked, setTradingLocked] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const pageSize = 8;

  async function loadTrades() {
    try {
      setLoading(true);
      const data = await apiFetch('/trades');
      setTrades(data.trades || []);
      setStats(data.stats || {});
      const snap = await apiFetch('/risk/snapshot');
      setTradingLocked(Boolean(snap?.tradingLocked));
    } catch {
      setError('Failed to load trade journal.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
  }, []);

  async function submitTrade(e) {
    e.preventDefault();
    setError('');
    if (tradingLocked) return;

    const payload = {
      ...form,
      openedAt: form.openedAt ? new Date(form.openedAt).toISOString() : new Date().toISOString(),
      closedAt: form.closedAt ? new Date(form.closedAt).toISOString() : null,
      exitPrice: form.exitPrice || null,
      rewardAmount: form.rewardAmount || null,
      notes: form.notes || null
    };

    try {
      setLoading(true);
      if (editingId) {
        await apiFetch(`/trades/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/trades', { method: 'POST', body: JSON.stringify(payload) });
      }
      setForm(defaultTrade);
      setEditingId(null);
      await loadTrades();
      if (typeof onTradesChanged === 'function') {
        onTradesChanged({ type: editingId ? 'UPDATE' : 'CREATE' });
      }
    } catch {
      setError('Unable to save trade.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteTrade(id) {
    try {
      if (tradingLocked) return;
      setLoading(true);
      await apiFetch(`/trades/${id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadTrades();
      if (typeof onTradesChanged === 'function') {
        onTradesChanged({ type: 'DELETE' });
      }
    } catch {
      setError('Unable to delete trade.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(trade) {
    setEditingId(trade.id);
    setForm({
      symbol: trade.symbol,
      side: trade.side,
      entryPrice: String(trade.entryPrice),
      stopLoss: String(trade.stopLoss),
      exitPrice: trade.exitPrice ? String(trade.exitPrice) : '',
      quantity: String(trade.quantity),
      riskAmount: String(trade.riskAmount),
      rewardAmount: trade.rewardAmount ? String(trade.rewardAmount) : '',
      pnl: String(trade.pnl),
      openedAt: trade.openedAt ? trade.openedAt.slice(0, 16) : '',
      closedAt: trade.closedAt ? trade.closedAt.slice(0, 16) : '',
      notes: trade.notes || ''
    });
  }

  const dynamicR = useMemo(() => {
    const pnl = Number(form.pnl);
    const riskAmount = Number(form.riskAmount);
    if (!Number.isFinite(pnl) || !Number.isFinite(riskAmount) || riskAmount <= 0) return '--';
    return (pnl / riskAmount).toFixed(2);
  }, [form.pnl, form.riskAmount]);

  const sortedTrades = useMemo(() => {
    const cloned = [...trades];
    const getDate = (t) => new Date(t.closedAt || t.openedAt || t.createdAt).getTime();

    cloned.sort((a, b) => {
      if (sortBy === 'date_desc') return getDate(b) - getDate(a);
      if (sortBy === 'date_asc') return getDate(a) - getDate(b);
      if (sortBy === 'pnl_desc') return Number(b.pnl) - Number(a.pnl);
      if (sortBy === 'pnl_asc') return Number(a.pnl) - Number(b.pnl);
      if (sortBy === 'r_desc') return Number(b.rMultiple) - Number(a.rMultiple);
      if (sortBy === 'r_asc') return Number(a.rMultiple) - Number(b.rMultiple);
      return 0;
    });

    return cloned;
  }, [trades, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedTrades.length / pageSize));
  const pageTrades = useMemo(
    () => sortedTrades.slice((page - 1) * pageSize, page * pageSize),
    [sortedTrades, page]
  );

  const cumulativePnl = useMemo(
    () => sortedTrades.reduce((sum, t) => sum + Number(t.pnl), 0).toFixed(2),
    [sortedTrades]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Trade Journal</h3>
        <div className="text-xs text-slate-300">
          Win Rate: <strong>{stats.winRate || 0}%</strong> | Avg R: <strong>{stats.avgRMultiple || 0}</strong> | Profit Factor: <strong>{stats.profitFactor || 0}</strong>
        </div>
      </div>
      {tradingLocked ? (
        <div className="mt-3 rounded-md border border-rose-600 bg-rose-950/40 p-3 text-sm text-rose-300">
          Daily Risk Limit Reached. Trading Disabled for Today.
        </div>
      ) : null}

      <form className="mt-4 grid gap-2 md:grid-cols-5" onSubmit={submitTrade}>
        <input disabled={tradingLocked || loading} className="input" placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
        <select disabled={tradingLocked || loading} className="input" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
          <option>LONG</option>
          <option>SHORT</option>
        </select>
        <input disabled={tradingLocked || loading} className="input" placeholder="Entry" value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} />
        <input disabled={tradingLocked || loading} className="input" placeholder="Stop" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} />
        <input disabled={tradingLocked || loading} className="input" placeholder="PnL" value={form.pnl} onChange={(e) => setForm({ ...form, pnl: e.target.value })} />
        <input disabled={tradingLocked || loading} className="input" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input disabled={tradingLocked || loading} className="input" placeholder="Risk Amount" value={form.riskAmount} onChange={(e) => setForm({ ...form, riskAmount: e.target.value })} />
        <input disabled={tradingLocked || loading} className="input" type="datetime-local" value={form.openedAt} onChange={(e) => setForm({ ...form, openedAt: e.target.value })} />
        <input disabled={tradingLocked || loading} className="input" type="datetime-local" value={form.closedAt} onChange={(e) => setForm({ ...form, closedAt: e.target.value })} />
        <input disabled={tradingLocked || loading} className="input" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button disabled={tradingLocked || loading} className="btn-primary md:col-span-5" type="submit">{loading ? 'Saving...' : editingId ? 'Update Trade' : 'Add Trade'}</button>
      </form>
      <div className="mt-2 text-xs text-slate-400">
        Dynamic R Multiple: <span className="text-skyaccent-300">{dynamicR}</span>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="text-slate-400">
          Total Cumulative PnL:{' '}
          <span className={Number(cumulativePnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>${cumulativePnl}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="trade-sort">Sort</label>
          <select id="trade-sort" className="input w-44 py-1.5" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date_desc">Date (Newest)</option>
            <option value="date_asc">Date (Oldest)</option>
            <option value="pnl_desc">PnL (High to Low)</option>
            <option value="pnl_asc">PnL (Low to High)</option>
            <option value="r_desc">R (High to Low)</option>
            <option value="r_asc">R (Low to High)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">Symbol</th>
              <th>Side</th>
              <th>Date</th>
              <th>PnL</th>
              <th>R</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageTrades.map((trade) => (
              <tr key={trade.id} className="border-t border-slate-800 transition-colors hover:bg-slate-800/20">
                <td className="py-2">{trade.symbol}</td>
                <td>{trade.side}</td>
                <td className="text-xs text-slate-400">{new Date(trade.closedAt || trade.openedAt || trade.createdAt).toLocaleString()}</td>
                <td className={Number(trade.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{trade.pnl}</td>
                <td>{trade.rMultiple}</td>
                <td className="space-x-2">
                  <button disabled={tradingLocked || loading} className="btn-muted px-2 py-1 text-xs" onClick={() => startEdit(trade)} type="button">Edit</button>
                  <button disabled={tradingLocked || loading} className="btn-muted px-2 py-1 text-xs" onClick={() => setDeleteTarget(trade)} type="button">Delete</button>
                </td>
              </tr>
            ))}
            {!pageTrades.length ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">No trades found.</td>
              </tr>
            ) : null}
            <tr className="border-t border-slate-700 bg-slate-900/40 font-medium">
              <td className="py-2" colSpan={3}>Total Cumulative PnL</td>
              <td className={Number(cumulativePnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>${cumulativePnl}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button className="btn-muted px-2 py-1 text-xs" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <button className="btn-muted px-2 py-1 text-xs" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        loading={loading}
        title="Delete Trade"
        message={`Delete ${deleteTarget?.symbol || 'this trade'}? This updates equity and drawdown history.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteTrade(deleteTarget.id)}
      />
    </div>
  );
}
