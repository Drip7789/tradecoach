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
    achievements,
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
  const nextWaterLevel = Math.min(tree.waterLevel + 1, 5);
  const nextSunLevel = Math.min(tree.sunLevel + 1, 5);
  const nextSoilLevel = Math.min(tree.soilLevel + 1, 5);

  const achievementCatalog = [
    { id: 'streak-70-5', title: 'Consistent Discipline', description: '5-day streak with discipline >= 70' },
    { id: 'streak-80-3', title: 'High Focus', description: '3-day streak with discipline >= 80' },
    { id: 'discipline-90', title: 'Elite Discipline', description: 'Hit discipline score of 90+' },
    { id: 'clean-day', title: 'Clean Risk Day', description: 'Any day with zero high/critical biases' },
    { id: 'stage-sapling', title: 'First Growth', description: 'Reach Sapling stage (100 growth)' },
    { id: 'stage-golden', title: 'Golden Era Tree', description: 'Reach Golden Tree stage (1500 growth)' },
  ] as const;
  const unlockedById = new Map(achievements.map((item) => [item.id, item]));

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
        <h1 className="text-3xl font-bold text-theme-main mb-1">Growth Mode</h1>
        <p className="text-theme-muted">
          Growth reflects discipline and sustainable habits — not short-term gains.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="glass-card p-5">
          <p className="text-theme-muted text-sm mb-1">XP</p>
          <p className="text-4xl font-bold text-theme-growth">{xp}</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-theme-muted text-sm mb-1">Streak Days</p>
          <p className="text-3xl font-bold text-theme-growth">{streakDays}</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-theme-muted text-sm mb-1">Discipline Score</p>
          <p className="text-3xl font-bold text-theme-main">
            {report?.disciplineScore ?? 100}
          </p>
        </div>
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-theme-muted text-sm mb-1">Tree Stage</p>
        <p className="text-2xl font-bold text-theme-growth mb-2">{stageLabel}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p className="text-theme-muted">
            Growth Progress: <span className="text-theme-main font-semibold">{tree.growthProgress.toFixed(1)}</span>
          </p>
          <p className="text-theme-muted">
            Growth Rate: <span className="text-theme-main font-semibold">{growthRate.toFixed(2)}/hr</span>
          </p>
          <p className="text-theme-muted">
            Income / Hour: <span className="text-theme-growth font-semibold">{incomePerHour.toFixed(2)}</span>
          </p>
          <p className="text-theme-muted">
            Total Passive Income: <span className="text-theme-growth font-semibold">{tree.totalPassiveIncome.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-theme-main font-semibold mb-3">System Upgrades</p>
        <p className="text-theme-muted text-sm mb-3">
          Water and Sun accelerate growth. Soil improves passive income.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => upgradeSystem('water')}
            disabled={tree.waterLevel >= 5 || xp < waterCost}
            className="px-4 py-3 rounded-xl bg-antiqueIvory border border-ivoryBrown text-text-primary hover:bg-mild disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <div className="font-medium">Upgrade Water</div>
            <div className="text-xs text-theme-muted mt-1">Level: {tree.waterLevel}/5</div>
            <div className="text-xs text-theme-muted">Effect: +{(tree.waterLevel * 5).toFixed(0)}% growth rate</div>
            <div className="text-xs text-theme-muted">
              Next: +{(nextWaterLevel * 5).toFixed(0)}% growth rate
            </div>
            <div className="text-xs text-theme-muted mt-1">Cost: {waterCost} XP</div>
          </button>

          <button
            onClick={() => upgradeSystem('sun')}
            disabled={tree.sunLevel >= 5 || xp < sunCost}
            className="px-4 py-3 rounded-xl bg-antiqueIvory border border-ivoryBrown text-text-primary hover:bg-mild disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <div className="font-medium">Upgrade Sun</div>
            <div className="text-xs text-theme-muted mt-1">Level: {tree.sunLevel}/5</div>
            <div className="text-xs text-theme-muted">Effect: +{(tree.sunLevel * 7).toFixed(0)}% growth rate</div>
            <div className="text-xs text-theme-muted">
              Next: +{(nextSunLevel * 7).toFixed(0)}% growth rate
            </div>
            <div className="text-xs text-theme-muted mt-1">Cost: {sunCost} XP</div>
          </button>

          <button
            onClick={() => upgradeSystem('soil')}
            disabled={tree.soilLevel >= 5 || xp < soilCost}
            className="px-4 py-3 rounded-xl bg-antiqueIvory border border-ivoryBrown text-text-primary hover:bg-mild disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <div className="font-medium">Upgrade Soil</div>
            <div className="text-xs text-theme-muted mt-1">Level: {tree.soilLevel}/5</div>
            <div className="text-xs text-theme-muted">Effect: +{(tree.soilLevel * 10).toFixed(0)}% income</div>
            <div className="text-xs text-theme-muted">
              Next: +{(nextSoilLevel * 10).toFixed(0)}% income
            </div>
            <div className="text-xs text-theme-muted mt-1">Cost: {soilCost} XP</div>
          </button>
        </div>

        <button
          onClick={simulateDay}
          className="mt-4 px-4 py-2 rounded-lg bg-blueSmoke text-white hover:bg-[#5f7f76] transition-colors shadow-md"
        >
          Simulate Day (+24h)
        </button>
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-theme-main font-semibold mb-2">Achievements</p>
        <div className="space-y-2">
          {achievementCatalog.map((achievement) => {
            const unlocked = unlockedById.get(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border ${
                  unlocked
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-theme-soft bg-theme-surface-2'
                }`}
              >
                <p className="text-theme-main text-sm font-medium">{achievement.title}</p>
                <p className="text-theme-muted text-xs">{achievement.description}</p>
                <p className="text-xs mt-1 text-theme-muted">
                  {unlocked
                    ? `Unlocked: ${new Date(unlocked.unlockedAt).toLocaleDateString()}`
                    : 'Locked'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-theme-muted text-sm">
          Golden Era focus: consistency compounds. XP is earned from better discipline
          and fewer severe bias signals like overtrading, loss aversion, and revenge trading.
        </p>
      </div>

      <div className="glass-card p-5">
        <p className="text-theme-main font-semibold mb-2">Unlocked Milestones</p>
        {milestonesUnlocked.length === 0 ? (
          <p className="text-theme-muted text-sm">No milestones unlocked yet.</p>
        ) : (
          <ul className="text-theme-muted text-sm space-y-1">
            {milestonesUnlocked.map((milestone) => (
              <li key={milestone}>{milestone}</li>
            ))}
          </ul>
        )}
        <p className="text-theme-muted text-xs mt-4">
          Last evaluated: {lastEvaluatedDate || 'Not yet'}
        </p>
        <p className="text-theme-muted text-xs mt-1">
          Last growth update: {tree.lastGrowthDate || 'Not yet'}
        </p>
      </div>

      {isDev && (
        <div className="glass-card p-5 mt-4">
          <p className="text-theme-main font-semibold mb-3">Dev Tools</p>
          <p className="text-theme-muted text-sm mb-3">
            Test XP and streak behavior with mock report inputs.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runDevEvaluation(75, 0)}
              className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
            >
              Simulate Good Day
            </button>
            <button
              onClick={() => runDevEvaluation(45, 3)}
              className="px-3 py-2 rounded-lg border border-red-300 bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              Simulate Bad Day
            </button>
            <button
              onClick={() => {
                const nextScore = (previousDisciplineScore ?? 60) + 10;
                const nextHigh = Math.max((previousHighSeverityCount ?? 2) - 1, 0);
                runDevEvaluation(nextScore, nextHigh);
              }}
              className="px-3 py-2 rounded-lg border border-theme-soft bg-theme-surface-2 text-theme-main hover:bg-mild transition-colors"
            >
              Simulate Improvement
            </button>
            <button
              onClick={forceReevaluate}
              className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
            >
              Force Re-evaluate Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
