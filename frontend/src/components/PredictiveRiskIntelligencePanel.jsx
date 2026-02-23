'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import AIRiskSummaryCard from './predictive/AIRiskSummaryCard';
import BehavioralStabilityIndicator from './predictive/BehavioralStabilityIndicator';
import CapitalImpactSummaryCard from './predictive/CapitalImpactSummaryCard';
import DrawdownProbabilityBars from './predictive/DrawdownProbabilityBars';
import ForwardRiskProjectionPanel from './predictive/ForwardRiskProjectionPanel';
import ProjectedCapitalRiskPanel from './predictive/ProjectedCapitalRiskPanel';
import RiskVelocityGauge from './predictive/RiskVelocityGauge';
import ThreeLossScenarioProjection from './predictive/ThreeLossScenarioProjection';

function HeaderAlerts({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.code}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            ['CAPITAL_EXPOSURE_ESCALATING', 'HIGH_CAPITAL_COLLAPSE_RISK'].includes(alert.code)
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          }`}
        >
          {alert.message}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ activation }) {
  const count = activation?.closedTradesCount ?? 0;
  const minTrades = activation?.minClosedTrades ?? 3;

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-navy-950/50 p-5">
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-6 text-center">
        <h4 className="text-lg font-semibold text-slate-100">Log at least {minTrades} closed trades to activate predictive analytics.</h4>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          AXON PRIME models capital risk velocity and drawdown probability using behavioral pattern recognition.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-skyaccent-500/30 bg-skyaccent-500/10 px-3 py-1 text-xs text-skyaccent-300">
          Closed trades logged: {count} / {minTrades}
        </div>
      </div>
    </div>
  );
}

function LockedPowerPreview({ data, reveal }) {
  const predictiveReady = data?.status === 'READY';
  const probs = data?.drawdownProbabilities ?? data?.drawdownProbability ?? null;

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/30 p-4">
      <div className={`absolute inset-0 bg-gradient-to-b from-slate-950/30 to-slate-950/55 ${predictiveReady ? 'opacity-100' : 'opacity-85'}`} />

      <div className="relative space-y-4 blur-[3px] opacity-75 pointer-events-none select-none">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_1.25fr]">
          <RiskVelocityGauge
            score={data?.riskVelocityScore ?? data?.riskVelocity?.score ?? 0}
            level={data?.riskVelocityLevel ?? data?.riskVelocity?.level ?? 'STABLE'}
            reveal={reveal}
          />
          <DrawdownProbabilityBars probabilities={probs} reveal={reveal} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <BehavioralStabilityIndicator
            behavioralStability={data?.behavioralStability}
            behavioralDegradation={data?.behavioralDegradation}
          />
          <AIRiskSummaryCard data={data || {}} />
        </div>

        <ForwardRiskProjectionPanel forwardProjection={data?.forwardProjection} lockedHint />
        <ProjectedCapitalRiskPanel projection={data?.longHorizonRiskProjection} lockedHint />
        <CapitalImpactSummaryCard capitalImpact={data?.capitalImpact} lockedHint />
        <ThreeLossScenarioProjection
          capitalStressProjection={data?.capitalStressProjection}
          riskProjectionWarnings={data?.riskProjectionWarnings}
          lockedExtended
        />
      </div>

      <div className="absolute inset-0 grid place-items-center p-6">
        <div className="max-w-xl rounded-2xl border border-slate-600/80 bg-[#050b17]/90 p-6 text-center shadow-[0_20px_80px_rgba(2,6,23,0.55)] backdrop-blur-sm">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-sm font-semibold text-slate-100">
            <span>🔒</span>
            <span>PRO Required</span>
          </div>
          <h4 className="mt-4 text-lg font-semibold text-slate-100">Unlock predictive capital modeling.</h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Activate AXON PRIME predictive safeguards to access drawdown probability forecasting, behavioral degradation detection, and capital acceleration analysis.
          </p>
          {data?.activation ? (
            <div className="mt-4 inline-flex rounded-full border border-skyaccent-500/30 bg-skyaccent-500/10 px-3 py-1 text-xs text-skyaccent-300">
              Closed trades logged: {data.activation.closedTradesCount} / {data.activation.minClosedTrades}+
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PredictiveRiskIntelligencePanel({ refreshSignal = 0, role = 'FREE', riskScore = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const prevReadyRef = useRef(false);

  const isPaid = ['PRO', 'ELITE', 'FOUNDER'].includes(role);
  const freeUrgencyQualified = !isPaid && Number(riskScore || 0) > 50;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    apiFetch('/analytics/predictive-risk')
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshSignal]);

  useEffect(() => {
    const isReady = data?.status === 'READY';
    if (prevReadyRef.current === false && isReady) {
      setRevealed(true);
      const timer = setTimeout(() => setRevealed(false), 1500);
      prevReadyRef.current = isReady;
      return () => clearTimeout(timer);
    }
    prevReadyRef.current = isReady;
    return undefined;
  }, [data?.status]);

  if (loading && !data) {
    return (
      <div className="panel p-5">
        <div className="skeleton h-5 w-72" />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-5">
        <h3 className="text-lg font-semibold">Predictive Risk Intelligence</h3>
        <p className="mt-2 text-sm text-slate-400">Analytics engine temporarily unavailable. Try again after backend restart.</p>
      </div>
    );
  }

  const isActive = data?.status === 'READY';
  const elevatedRiskAlert = (data?.alerts || []).find((a) => ['ELEVATED_DRAWDOWN_RISK', 'CAPITAL_EXPOSURE_ESCALATING'].includes(a.code));

  return (
    <div className={`panel p-5 transition-all duration-700 ${isPaid ? 'border border-skyaccent-600/40 shadow-[0_0_32px_rgba(34,211,238,0.08)]' : 'border border-slate-800/80'} ${revealed ? 'ring-1 ring-skyaccent-500/45 shadow-[0_0_38px_rgba(34,211,238,0.12)]' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Predictive Risk Intelligence</h3>
          <p className="mt-1 text-sm text-slate-300">
            AXON PRIME uses behavioral pattern modeling and probabilistic risk forecasting to estimate capital drawdown before it happens.
          </p>
          <p className="mt-1 text-xs text-slate-500">Institutional capital forecasting panel for behavioral risk velocity and short-horizon drawdown probability.</p>
        </div>
        <div className="cursor-help rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400" title="Pure analytics engine. No signals, no execution logic, no broker connectivity.">
          Institutional Mode v2
        </div>
      </div>

      <HeaderAlerts alerts={isActive ? data?.alerts : []} />

      {!isPaid && elevatedRiskAlert ? (
        <div className="mt-4 rounded-lg border border-amber-500/50 bg-amber-950/15 p-3 text-sm text-amber-300">
          Capital risk elevated. Upgrade to activate predictive safeguards.
        </div>
      ) : null}
      {freeUrgencyQualified ? (
        <div className="mt-3 rounded-lg border border-skyaccent-500/40 bg-skyaccent-950/20 p-3 text-sm text-skyaccent-200">
          Your current trading behavior qualifies for PRO Risk Protection.
        </div>
      ) : null}

      {!isPaid ? (
        <LockedPowerPreview data={data} reveal={revealed} />
      ) : !isActive ? (
        <EmptyState activation={data?.activation} />
      ) : (
        <>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_1.25fr]">
            <RiskVelocityGauge
              score={data?.riskVelocityScore ?? data?.riskVelocity?.score ?? 0}
              level={data?.riskVelocityLevel ?? data?.riskVelocity?.level ?? 'STABLE'}
              reveal={revealed}
            />
            <DrawdownProbabilityBars probabilities={data?.drawdownProbabilities ?? data?.drawdownProbability} reveal={revealed} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
            <BehavioralStabilityIndicator
              behavioralStability={data?.behavioralStability}
              behavioralDegradation={data?.behavioralDegradation}
            />
            <AIRiskSummaryCard data={data} />
          </div>

          <div className="mt-4">
            <ForwardRiskProjectionPanel forwardProjection={data?.forwardProjection} lockedHint={role === 'FREE'} />
          </div>

          <div className="mt-4">
            <ProjectedCapitalRiskPanel projection={data?.longHorizonRiskProjection} lockedHint={role === 'FREE'} />
          </div>

          <div className="mt-4">
            <CapitalImpactSummaryCard capitalImpact={data?.capitalImpact} lockedHint={role === 'FREE'} />
          </div>

          <div className="mt-4">
            <ThreeLossScenarioProjection
              capitalStressProjection={data?.capitalStressProjection}
              riskProjectionWarnings={data?.riskProjectionWarnings}
              lockedExtended={role === 'FREE'}
            />
          </div>
        </>
      )}
    </div>
  );
}
