import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BehaviorReport } from '@/lib/services/behaviorReport';

interface GrowthState {
  xp: number;
  streakDays: number;
  lastEvaluatedDate: string | null;
  milestonesUnlocked: string[];

  previousDisciplineScore: number | null;
  previousHighSeverityCount: number | null;
  tree: {
    growthProgress: number;
    waterLevel: number;
    sunLevel: number;
    soilLevel: number;
    lastGrowthDate: string | null;
    totalPassiveIncome: number;
  };

  evaluateFromReport: (report: BehaviorReport) => void;
  getTreeStage: () => 'seed' | 'sapling' | 'young' | 'mature' | 'golden';
  getGrowthRate: () => number;
  getIncomePerHour: () => number;
  applyDailyGrowth: () => void;
  simulateDay: () => void;
  upgradeSystem: (type: 'water' | 'sun' | 'soil') => boolean;
  forceReevaluate: () => void;
  resetAll: () => void;
}

const MILESTONES = [
  { id: 'discipline_seed', xp: 50 },
  { id: 'consistency_sprout', xp: 150 },
  { id: 'golden_habit_sapling', xp: 300 },
];
const GROWTH_STORAGE_KEY = 'biascoach-growth';
const INITIAL_TREE_STATE = {
  growthProgress: 0,
  waterLevel: 0,
  sunLevel: 0,
  soilLevel: 0,
  lastGrowthDate: null as string | null,
  totalPassiveIncome: 0,
};

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function countHighSeverity(report: BehaviorReport): number {
  return report.biases.filter(
    (bias) => bias.severity === 'high' || bias.severity === 'critical'
  ).length;
}

function toFiniteNumber(value: number, fallback: number = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function getStageByProgress(
  growthProgress: number
): 'seed' | 'sapling' | 'young' | 'mature' | 'golden' {
  if (growthProgress >= 1500) return 'golden';
  if (growthProgress >= 700) return 'mature';
  if (growthProgress >= 300) return 'young';
  if (growthProgress >= 100) return 'sapling';
  return 'seed';
}

function getStageMultiplier(stage: 'seed' | 'sapling' | 'young' | 'mature' | 'golden'): number {
  if (stage === 'golden') return 3;
  if (stage === 'mature') return 2;
  if (stage === 'young') return 1.5;
  if (stage === 'sapling') return 1.2;
  return 1;
}

export const useGrowthStore = create<GrowthState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streakDays: 0,
      lastEvaluatedDate: null,
      milestonesUnlocked: [],

      previousDisciplineScore: null,
      previousHighSeverityCount: null,
      tree: { ...INITIAL_TREE_STATE },

      evaluateFromReport: (report: BehaviorReport) => {
        const state = get();
        const today = getTodayKey();

        // Keep progression deterministic and prevent duplicate daily gains.
        if (state.lastEvaluatedDate === today) return;

        const currentDiscipline = toFiniteNumber(report.disciplineScore, 0);
        const currentHighSeverity = countHighSeverity(report);

        // Support older persisted snapshots where these keys may be undefined.
        const prevDiscipline = state.previousDisciplineScore ?? null;
        const prevHighSeverity = state.previousHighSeverityCount ?? null;
        const hasBaseline = prevDiscipline !== null && prevHighSeverity !== null;

        let xpGain = 0;

        // First-ever evaluation: grant baseline XP for reasonably disciplined behavior.
        if (!hasBaseline && currentDiscipline >= 60) {
          xpGain += 20;
        }

        if (prevDiscipline !== null && currentDiscipline > prevDiscipline) {
          xpGain += 10 + Math.min(10, currentDiscipline - prevDiscipline);
        }

        if (prevHighSeverity !== null && currentHighSeverity < prevHighSeverity) {
          xpGain += 15 + (prevHighSeverity - currentHighSeverity) * 5;
        }

        // Small daily bonus when discipline remains strong.
        if (currentDiscipline >= 70 && hasBaseline) {
          xpGain += 5;
        }

        let nextStreak = state.streakDays;
        if (prevDiscipline === null) {
          nextStreak = 1;
        } else if (currentDiscipline >= prevDiscipline) {
          nextStreak = state.streakDays + 1;
        } else if (prevDiscipline - currentDiscipline >= 8) {
          // Significant discipline drop resets streak.
          nextStreak = 0;
        }

        const nextXp = Math.max(0, toFiniteNumber(state.xp, 0) + toFiniteNumber(xpGain, 0));
        const unlocked = new Set(state.milestonesUnlocked);
        for (const milestone of MILESTONES) {
          if (nextXp >= milestone.xp) unlocked.add(milestone.id);
        }

        set({
          xp: nextXp,
          streakDays: nextStreak,
          lastEvaluatedDate: today,
          milestonesUnlocked: Array.from(unlocked),
          previousDisciplineScore: currentDiscipline,
          previousHighSeverityCount: currentHighSeverity,
        });
      },

      getTreeStage: () => {
        const { tree } = get();
        return getStageByProgress(tree.growthProgress);
      },

      getGrowthRate: () => {
        const { tree } = get();
        const waterBonus = tree.waterLevel * 0.05;
        const sunBonus = tree.sunLevel * 0.07;
        return Math.max(0, toFiniteNumber(1 * (1 + waterBonus + sunBonus), 1));
      },

      getIncomePerHour: () => {
        const { tree } = get();
        const stage = getStageByProgress(tree.growthProgress);
        const stageMultiplier = getStageMultiplier(stage);
        const baseIncome = 1;
        return Math.max(
          0,
          toFiniteNumber(baseIncome * (1 + tree.soilLevel * 0.10) * stageMultiplier, 0)
        );
      },

      applyDailyGrowth: () => {
        const state = get();
        const today = getTodayKey();
        const { tree } = state;

        if (tree.lastGrowthDate && tree.lastGrowthDate.startsWith(today)) {
          return;
        }

        let hours = 24;
        if (tree.lastGrowthDate) {
          const previous = new Date(tree.lastGrowthDate).getTime();
          const now = Date.now();
          const diffHours = Math.floor((now - previous) / (1000 * 60 * 60));
          hours = Math.max(1, diffHours);
        }

        const growthRate = toFiniteNumber(state.getGrowthRate(), 0);
        const incomePerHour = toFiniteNumber(state.getIncomePerHour(), 0);

        set({
          tree: {
            ...tree,
            growthProgress: Math.max(0, tree.growthProgress + growthRate * hours),
            totalPassiveIncome: Math.max(0, tree.totalPassiveIncome + incomePerHour * hours),
            lastGrowthDate: new Date().toISOString(),
          },
        });
      },

      simulateDay: () => {
        const state = get();
        const { tree } = state;
        const hours = 24;
        const growthRate = toFiniteNumber(state.getGrowthRate(), 0);
        const incomePerHour = toFiniteNumber(state.getIncomePerHour(), 0);

        set({
          tree: {
            ...tree,
            growthProgress: Math.max(0, tree.growthProgress + growthRate * hours),
            totalPassiveIncome: Math.max(0, tree.totalPassiveIncome + incomePerHour * hours),
            lastGrowthDate: new Date().toISOString(),
          },
        });
      },

      upgradeSystem: (type: 'water' | 'sun' | 'soil') => {
        const state = get();
        const { tree, xp } = state;
        const levelKey = type === 'water' ? 'waterLevel' : type === 'sun' ? 'sunLevel' : 'soilLevel';
        const currentLevel = tree[levelKey];

        if (currentLevel >= 5) return false;

        const cost = 200 * (currentLevel + 1);
        if (xp < cost || cost <= 0) return false;

        set({
          xp: xp - cost,
          tree: {
            ...tree,
            [levelKey]: currentLevel + 1,
          },
        });

        return true;
      },

      forceReevaluate: () => {
        set({ lastEvaluatedDate: null });
      },

      resetAll: () => {
        set({
          xp: 0,
          streakDays: 0,
          lastEvaluatedDate: null,
          milestonesUnlocked: [],
          previousDisciplineScore: null,
          previousHighSeverityCount: null,
          tree: { ...INITIAL_TREE_STATE },
        });

        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(GROWTH_STORAGE_KEY);
        }
      },
    }),
    {
      name: 'biascoach-growth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        xp: state.xp,
        streakDays: state.streakDays,
        lastEvaluatedDate: state.lastEvaluatedDate,
        milestonesUnlocked: state.milestonesUnlocked,
        previousDisciplineScore: state.previousDisciplineScore,
        previousHighSeverityCount: state.previousHighSeverityCount,
        tree: state.tree,
      }),
    }
  )
);

export default useGrowthStore;
