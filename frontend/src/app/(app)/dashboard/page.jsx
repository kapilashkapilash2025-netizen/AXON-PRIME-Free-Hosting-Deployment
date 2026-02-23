'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import MetricCard from '../../../components/MetricCard';
import PlanBadge from '../../../components/PlanBadge';
import PositionSizeCalculator from '../../../components/PositionSizeCalculator';
import TradeJournal from '../../../components/TradeJournal';
import SubscriptionPanel from '../../../components/SubscriptionPanel';
import AdvancedPanels from '../../../components/AdvancedPanels';
import BehaviorMonitorPanel from '../../../components/BehaviorMonitorPanel';
import DisciplineScoreCard from '../../../components/DisciplineScoreCard';
import EquityCurveChart from '../../../components/EquityCurveChart';
import NotificationStack from '../../../components/NotificationStack';
import PredictiveRiskIntelligencePanel from '../../../components/PredictiveRiskIntelligencePanel';
import { apiFetch } from '../../../lib/api';
import { clearSession, getUser } from '../../../lib/auth';

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [disciplineRefreshSignal, setDisciplineRefreshSignal] = useState(0);
  const [equityRefreshSignal, setEquityRefreshSignal] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const suppressDisciplineToastUntilRef = useRef(0);
  const prevRiskStatusRef = useRef(null);

  function pushNotification({ title, message, tone = 'neutral' }) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((prev) => [...prev, { id, title, message, tone }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }

  function dismissNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function refreshRiskSnapshot() {
    const snap = await apiFetch('/risk/snapshot');
    setRisk(snap);
    return snap;
  }

  useEffect(() => {
    setUser(getUser());
    setLoading(true);

    Promise.all([apiFetch('/auth/me'), apiFetch('/risk/snapshot')])
      .then(([me, snap]) => {
        setUser(me.user);
        setRisk(snap);
        prevRiskStatusRef.current = snap?.riskStatus || snap?.drawdownStatus || 'SAFE';
      })
      .catch(() => {
        clearSession();
        window.location.href = '/login';
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const state = searchParams.get('checkout');
    if (!state) return;

    if (state === 'success') {
      setCheckoutNotice('Subscription updated successfully.');
    } else if (state === 'cancel') {
      setCheckoutNotice('Checkout canceled. No billing changes were made.');
    }
    router.replace('/dashboard');
  }, [router, searchParams]);

  function logout() {
    clearSession();
    window.location.href = '/login';
  }

  const riskStatus = risk?.riskStatus || (risk?.tradingLocked ? 'CRITICAL' : risk?.drawdownStatus) || 'SAFE';
  const riskTooltip = {
    SAFE: 'Drawdown is controlled and below warning thresholds.',
    WARNING: 'Drawdown is rising. Reduce risk size and trade frequency.',
    CRITICAL: 'Capital protection threshold breached. Trading should pause.'
  }[riskStatus];

  async function handleTradeJournalChange() {
    setDisciplineRefreshSignal((v) => v + 1);
    setEquityRefreshSignal((v) => v + 1);
    try {
      const snap = await refreshRiskSnapshot();
      const nextRisk = snap?.riskStatus || snap?.drawdownStatus || 'SAFE';
      const prevRisk = prevRiskStatusRef.current;
      if (prevRisk && prevRisk !== nextRisk) {
        pushNotification({
          title: 'Risk Status',
          message: nextRisk === 'CRITICAL' ? 'Risk status escalated to CRITICAL.' : `Risk status changed to ${nextRisk}.`,
          tone: nextRisk === 'CRITICAL' ? 'danger' : 'warning'
        });
      }
      prevRiskStatusRef.current = nextRisk;
    } catch {
      // Non-blocking dashboard refresh failure.
    }
  }

  function handleDisciplineScoreUpdate(payload) {
    if (!payload || payload.delta === 0) return;
    if (Date.now() < suppressDisciplineToastUntilRef.current) return;
    const sign = payload.delta > 0 ? '+' : '';
    pushNotification({
      title: 'Discipline Score',
      message: `Score updated: ${sign}${payload.delta} (${payload.reason.replaceAll('_', ' ')})`,
      tone: payload.delta < 0 ? 'warning' : 'success'
    });
  }

  function handleBehaviorMonitorImpact(payload) {
    if (!payload?.notificationMessage) return;
    suppressDisciplineToastUntilRef.current = Date.now() + 1800;
    pushNotification({
      title: 'Behavior Monitor',
      message: payload.notificationMessage,
      tone: payload.behavioralScoreImpact < 0 ? 'warning' : 'success'
    });
    setDisciplineRefreshSignal((v) => v + 1);
    refreshRiskSnapshot().catch(() => {});
  }

  function handleBehaviorEscalation(payload) {
    if (!payload?.status) return;
    pushNotification({
      title: 'Behavior Alert',
      message:
        payload.status === 'CRITICAL'
          ? 'High trading frequency detected'
          : 'Behavior monitor moved to warning state',
      tone: payload.status === 'CRITICAL' ? 'danger' : 'warning'
    });
  }

  function handleEquityActivated() {
    pushNotification({
      title: 'Performance Analytics',
      message: 'Equity curve activated. Performance analytics unlocked.',
      tone: 'success'
    });
  }

  return (
    <AuthGuard>
      <main className="min-h-screen px-4 py-6 md:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">AXON PRIME - Risk Guard Pro</h1>
            <p className="text-sm text-slate-400">Capital protection intelligence dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role ? <PlanBadge role={user.role} /> : null}
            <button className="btn-muted" onClick={logout}>Logout</button>
          </div>
        </header>
        {checkoutNotice ? (
          <div className="mb-4 rounded-lg border border-skyaccent-700/70 bg-skyaccent-950/20 p-3 text-sm text-skyaccent-300">
            {checkoutNotice}
          </div>
        ) : null}
        {riskStatus === 'CRITICAL' && !risk?.tradingLocked ? (
          <div className="mb-4 rounded-lg border border-rose-600 bg-rose-950/25 p-3 text-sm text-rose-300 animate-riskPulse">
            Critical behavioral/risk conditions detected. Review risk plan immediately.
          </div>
        ) : null}
        {Array.isArray(risk?.performanceTriggers) && risk.performanceTriggers.length ? (
          <div className="mb-4 grid gap-2">
            {risk.performanceTriggers.map((trigger) => (
              <div key={trigger.code} className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-sm text-amber-200">
                {trigger.message}
              </div>
            ))}
          </div>
        ) : null}
        {Array.isArray(risk?.psychologicalMessages) && risk.psychologicalMessages.length ? (
          <div className="mb-4 grid gap-2">
            {risk.psychologicalMessages.map((msg) => (
              <div
                key={msg.code}
                className={`rounded-lg border p-3 text-sm ${
                  msg.tone === 'danger'
                    ? 'border-rose-500/40 bg-rose-950/18 text-rose-300'
                    : 'border-amber-500/40 bg-amber-950/15 text-amber-200'
                }`}
              >
                {msg.message}
              </div>
            ))}
          </div>
        ) : null}

        {loading ? <div className="panel p-5 text-slate-400">Loading dashboard...</div> : null}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard label="Account Balance" value={`$${risk?.accountBalance ?? '--'}`} />
          <MetricCard label="Daily PnL" value={`$${risk?.dailyPnl ?? '--'}`} tone={risk?.dailyPnl >= 0 ? 'good' : 'bad'} />
          <MetricCard
            label="Win Rate"
            value={`${risk?.winRate ?? '--'}%`}
            tone={(risk?.winRate ?? 0) >= 50 ? 'good' : (risk?.winRate ?? 0) >= 40 ? 'warn' : 'bad'}
            tooltip="Closed-trade win rate from trade journal data."
          />
          <MetricCard
            label="Drawdown"
            value={`${risk?.drawdownPct ?? '--'}%`}
            tone={risk?.drawdownStatus === 'CRITICAL' ? 'bad' : risk?.drawdownStatus === 'WARNING' ? 'warn' : 'good'}
            progressPct={Number(risk?.drawdownPct || 0)}
            progressMax={10}
            tooltip="0-5%: SAFE, 5-10%: WARNING, 10%+: CRITICAL drawdown threshold."
          />
          <MetricCard
            label="Risk Status"
            value={risk?.tradingLocked ? 'LOCKED' : risk?.riskStatus || risk?.drawdownStatus || '--'}
            tone={riskStatus === 'CRITICAL' ? 'bad' : riskStatus === 'WARNING' ? 'warn' : 'good'}
            glow={riskStatus === 'SAFE'}
            borderAnimate={riskStatus === 'WARNING'}
            pulse={riskStatus === 'CRITICAL'}
            tooltip={`${riskTooltip}${risk?.riskStatusDriver ? ` Driver: ${risk.riskStatusDriver}.` : ''}`}
          />
          <MetricCard
            label="Composite Risk Score"
            value={risk?.riskCompositeScore ?? '--'}
            tone={
              risk?.riskCompositeBand === 'CRITICAL'
                ? 'bad'
                : risk?.riskCompositeBand === 'DANGER'
                  ? 'warn'
                  : risk?.riskCompositeBand === 'CAUTION'
                    ? 'warn'
                    : 'good'
            }
            progressPct={Number(risk?.riskCompositeScore || 0)}
            progressMax={100}
            tooltip={`Weighted score from drawdown, consecutive losses, risk per trade, and trade frequency. Band: ${risk?.riskCompositeBand || 'SAFE'}.`}
          />
          <MetricCard
            label="Risk / Trade Avg"
            value={`${risk?.riskPerTradeAveragePct ?? '--'}%`}
            tone={(risk?.riskPerTradeAveragePct ?? 0) > 3 ? 'bad' : (risk?.riskPerTradeAveragePct ?? 0) > 2 ? 'warn' : 'good'}
            tooltip="Average closed-trade risk amount as % of account balance."
          />
        </section>

        <section className="mt-4">
          <DisciplineScoreCard refreshSignal={disciplineRefreshSignal} onScoreUpdate={handleDisciplineScoreUpdate} />
        </section>

        <section className="mt-4">
          <BehaviorMonitorPanel
            refreshSignal={disciplineRefreshSignal}
            onBehaviorImpact={handleBehaviorMonitorImpact}
            onStatusEscalation={handleBehaviorEscalation}
            role={user?.role || 'FREE'}
          />
        </section>

        {risk?.tradingLocked ? (
          <div className="mt-4 rounded-lg border border-rose-600 bg-rose-950/30 p-4 text-rose-300">
            Daily Risk Limit Reached. Trading Disabled for Today.
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <PositionSizeCalculator />
          <SubscriptionPanel role={user?.role || 'FREE'} riskCompositeScore={risk?.riskCompositeScore || 0} />
        </section>

        <section className="mt-6">
          <AdvancedPanels role={user?.role || 'FREE'} />
        </section>

        <section className="mt-6">
          <EquityCurveChart refreshSignal={equityRefreshSignal} onActivated={handleEquityActivated} role={user?.role || 'FREE'} />
        </section>

        <section className="mt-6">
          <PredictiveRiskIntelligencePanel
            refreshSignal={disciplineRefreshSignal}
            role={user?.role || 'FREE'}
            riskScore={risk?.riskCompositeScore || 0}
          />
        </section>

        <section className="mt-6">
          <TradeJournal onTradesChanged={handleTradeJournalChange} />
        </section>
      </main>
      <NotificationStack items={notifications} onDismiss={dismissNotification} />
    </AuthGuard>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen px-4 py-6 md:px-8"><div className="panel p-5 text-slate-400">Loading dashboard...</div></main>}>
      <DashboardPageContent />
    </Suspense>
  );
}
