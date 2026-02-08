'use client';

import { useEffect } from 'react';
import useBehaviorReport from '@/hooks/useBehaviorReport';
import { useGrowthStore } from '@/lib/stores/growthStore';
import { BehaviorReport } from '@/lib/services/behaviorReport';
import { BiasDetection, Severity } from '@/types';

export default function GrowthPage() {
  const { report } = useBehaviorReport();
  const {
    xp,
    streakDays,
    tree,
    milestonesUnlocked,
    lastEvaluatedDate,
    previousDisciplineScore,
    previousHighSeverityCount,
    evaluateFromReport,
    applyDailyGrowth,
    simulateDay,
    upgradeSystem,
    forceReevaluate,
    getTreeStage,
    getIncomePerHour,
    getGrowthRate,
  } = useGrowthStore();

  const isDev = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    if (!report) return;
    evaluateFromReport(report);
    applyDailyGrowth();
  }, [report, evaluateFromReport, applyDailyGrowth]);

  const stage = getTreeStage();
  const growthRate = getGrowthRate();
  const incomePerHour = getIncomePerHour();

  const stageLabel =
    stage === 'golden'
      ? '✨ Golden Tree'
      : stage === 'mature'
        ? '🌲 Mature Tree'
        : stage === 'young'
          ? '🌳 Young Tree'
          : stage === 'sapling'
            ? '🌿 Sapling'
            : '🌱 Seed';

  const getUpgradeCost = (level: number) => 200 * (level + 1);
  const waterCost = getUpgradeCost(tree.waterLevel);
  const sunCost = getUpgradeCost(tree.sunLevel);
  const soilCost = getUpgradeCost(tree.soilLevel);

  const makeMockBiases = (count: number, severity: Severity = 'high'): BiasDetection[] => {
    return Array.from({ length: count }, (_, idx) => ({
      id: `mock-bias-${severity}-${idx}`,
      session_id: 'dev',
      bias_type: 'overtrading',
      score: severity === 'critical' ? 85 : 65,
      severity,
      evidence: {
        summary: 'Dev mock bias',
        key_metrics: {},
        timestamps: [],
      },
      metrics: {},
      affected_trades: [],
      intervention: 'Dev simulation',
      explanation: 'Dev simulation',
      detected_at: new Date().toISOString(),
    }));
  };

  const makeMockReport = (disciplineScore: number, highSeverityCount: number): BehaviorReport => {
    const clampedScore = Math.max(0, Math.min(100, disciplineScore));
    const biases = makeMockBiases(Math.max(0, highSeverityCount), 'high');
    return {
      version: '1',
      generatedAt: new Date().toISOString(),
      disciplineScore: clampedScore,
      biases,
      highlights: {
        topConcerns: biases.slice(0, 3),
        criticalCount: 0,
        highCount: biases.length,
        message: 'Dev tools simulation report',
      },
    };
  };

  const runDevEvaluation = (disciplineScore: number, highSeverityCount: number) => {
    forceReevaluate();
    evaluateFromReport(makeMockReport(disciplineScore, highSeverityCount));
  };

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Growth Mode</h1>
        <p className="text-slate-400">
          Growth reflects discipline and sustainable habits — not short-term gains.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="glass-card p-5">
          <p className="text-slate-400 text-sm mb-1">XP</p>
          <p className="text-3xl font-bold text-white">{xp}</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-slate-400 text-sm mb-1">Streak Days</p>
          <p className="text-3xl font-bold text-white">{streakDays}</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-slate-400 text-sm mb-1">Discipline Score</p>
          <p className="text-3xl font-bold text-white">
            {report?.disciplineScore ?? 100}
          </p>
        </div>
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-slate-400 text-sm mb-1">Tree Stage</p>
        <p className="text-2xl font-bold text-white mb-2">{stageLabel}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p className="text-slate-300">
            Growth Progress: <span className="text-white font-semibold">{tree.growthProgress.toFixed(1)}</span>
          </p>
          <p className="text-slate-300">
            Growth Rate: <span className="text-white font-semibold">{growthRate.toFixed(2)}/hr</span>
          </p>
          <p className="text-slate-300">
            Income / Hour: <span className="text-white font-semibold">{incomePerHour.toFixed(2)}</span>
          </p>
          <p className="text-slate-300">
            Total Passive Income: <span className="text-white font-semibold">{tree.totalPassiveIncome.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-white font-semibold mb-3">System Upgrades</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => upgradeSystem('water')}
            disabled={tree.waterLevel >= 5 || xp < waterCost}
            className="px-4 py-3 rounded-xl bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upgrade Water (Lv {tree.waterLevel}/5)
            <div className="text-xs text-slate-400 mt-1">Cost: {waterCost} XP</div>
          </button>

          <button
            onClick={() => upgradeSystem('sun')}
            disabled={tree.sunLevel >= 5 || xp < sunCost}
            className="px-4 py-3 rounded-xl bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upgrade Sun (Lv {tree.sunLevel}/5)
            <div className="text-xs text-slate-400 mt-1">Cost: {sunCost} XP</div>
          </button>

          <button
            onClick={() => upgradeSystem('soil')}
            disabled={tree.soilLevel >= 5 || xp < soilCost}
            className="px-4 py-3 rounded-xl bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upgrade Soil (Lv {tree.soilLevel}/5)
            <div className="text-xs text-slate-400 mt-1">Cost: {soilCost} XP</div>
          </button>
        </div>

        <button
          onClick={simulateDay}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
        >
          Simulate Day (+24h)
        </button>
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-slate-300 text-sm">
          Golden Era focus: consistency compounds. XP is earned from better discipline
          and fewer severe bias signals like overtrading, loss aversion, and revenge trading.
        </p>
      </div>

      <div className="glass-card p-5">
        <p className="text-white font-semibold mb-2">Unlocked Milestones</p>
        {milestonesUnlocked.length === 0 ? (
          <p className="text-slate-400 text-sm">No milestones unlocked yet.</p>
        ) : (
          <ul className="text-slate-300 text-sm space-y-1">
            {milestonesUnlocked.map((milestone) => (
              <li key={milestone}>{milestone}</li>
            ))}
          </ul>
        )}
        <p className="text-slate-500 text-xs mt-4">
          Last evaluated: {lastEvaluatedDate || 'Not yet'}
        </p>
        <p className="text-slate-500 text-xs mt-1">
          Last growth update: {tree.lastGrowthDate || 'Not yet'}
        </p>
      </div>

      {isDev && (
        <div className="glass-card p-5 mt-4">
          <p className="text-white font-semibold mb-3">Dev Tools</p>
          <p className="text-slate-400 text-sm mb-3">
            Test XP and streak behavior with mock report inputs.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runDevEvaluation(75, 0)}
              className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            >
              Simulate Good Day
            </button>
            <button
              onClick={() => runDevEvaluation(45, 3)}
              className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"
            >
              Simulate Bad Day
            </button>
            <button
              onClick={() => {
                const nextScore = (previousDisciplineScore ?? 60) + 10;
                const nextHigh = Math.max((previousHighSeverityCount ?? 2) - 1, 0);
                runDevEvaluation(nextScore, nextHigh);
              }}
              className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
            >
              Simulate Improvement
            </button>
            <button
              onClick={forceReevaluate}
              className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            >
              Force Re-evaluate Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
