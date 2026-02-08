import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BehaviorReport } from '@/lib/services/behaviorReport';

export interface GrowthAchievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
}

interface GrowthState {
  xp: number;
  streakDays: number;
  lastEvaluatedDate: string | null;
  milestonesUnlocked: string[];
  achievements: GrowthAchievement[];
  discipline70StreakDays: number;
  discipline80StreakDays: number;
  cleanDayStreakDays: number;

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
const XP_MODEL = {
  baseScale: 100,
  highSeverityPenalty: 15,
  riskEscalationPenalty: 20,
  concentrationPenalty: 15,
  disciplineImprovementThreshold: 5,
  disciplineImprovementBonus: 10,
  highSeverityImprovementBonus: 5,
  streakMultiplierStep: 0.03,
  streakMultiplierCapDays: 10,
  streakIncrementMinDiscipline: 70,
  streakIncrementMaxHighSeverity: 1,
  streakResetDiscipline: 60,
  streakResetHighSeverity: 3,
} as const;
const INITIAL_TREE_STATE = {
  growthProgress: 0,
  waterLevel: 0,
  sunLevel: 0,
  soilLevel: 0,
  lastGrowthDate: null as string | null,
  totalPassiveIncome: 0,
};
const ACHIEVEMENTS = {
  streak70_5: {
    id: 'streak-70-5',
    title: 'Consistent Discipline',
    description: 'Maintain discipline score >= 70 for 5 days.',
  },
  streak80_3: {
    id: 'streak-80-3',
    title: 'High Focus',
    description: 'Maintain discipline score >= 80 for 3 days.',
  },
  discipline90: {
    id: 'discipline-90',
    title: 'Elite Discipline',
    description: 'Reach a discipline score of 90+ in a day.',
  },
  cleanDay: {
    id: 'clean-day',
    title: 'Clean Risk Day',
    description: 'Finish a day with zero high/critical bias signals.',
  },
  sapling: {
    id: 'stage-sapling',
    title: 'First Growth',
    description: 'Reach Sapling stage.',
  },
  golden: {
    id: 'stage-golden',
    title: 'Golden Era Tree',
    description: 'Reach Golden Tree stage.',
  },
} as const;

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

function getRiskPenalty(report: BehaviorReport): number {
  let penalty = 0;
  for (const bias of report.biases) {
    const isHighRiskSeverity = bias.severity === 'high' || bias.severity === 'critical';
    if (!isHighRiskSeverity) continue;

    if (bias.bias_type === 'risk_escalation') {
      penalty += XP_MODEL.riskEscalationPenalty;
    }
    if (bias.bias_type === 'concentration_bias') {
      penalty += XP_MODEL.concentrationPenalty;
    }
  }
  return penalty;
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

function unlockAchievement(
  achievements: GrowthAchievement[],
  achievement: { id: string; title: string; description: string },
  unlockedAt: string
): GrowthAchievement[] {
  if (achievements.some((item) => item.id === achievement.id)) {
    return achievements;
  }

  return [
    ...achievements,
    {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      unlockedAt,
    },
  ];
}

export const useGrowthStore = create<GrowthState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streakDays: 0,
      lastEvaluatedDate: null,
      milestonesUnlocked: [],
      achievements: [],
      discipline70StreakDays: 0,
      discipline80StreakDays: 0,
      cleanDayStreakDays: 0,

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
        const nowIso = new Date().toISOString();

        // Support older persisted snapshots where these keys may be undefined.
        const prevDiscipline = state.previousDisciplineScore ?? null;
        const prevHighSeverity = state.previousHighSeverityCount ?? null;
        const riskPenalty = getRiskPenalty(report);

        const normalizedDiscipline = Math.max(0, Math.min(100, currentDiscipline)) / 100;
        const baseXP = Math.round(normalizedDiscipline * normalizedDiscipline * XP_MODEL.baseScale);
        const penalty = currentHighSeverity * XP_MODEL.highSeverityPenalty;

        let improvementBonus = 0;
        if (
          prevDiscipline !== null &&
          currentDiscipline >= prevDiscipline + XP_MODEL.disciplineImprovementThreshold
        ) {
          improvementBonus += XP_MODEL.disciplineImprovementBonus;
        }
        if (prevHighSeverity !== null && currentHighSeverity < prevHighSeverity) {
          improvementBonus += XP_MODEL.highSeverityImprovementBonus;
        }

        const streakMultiplier =
          1 + Math.min(state.streakDays, XP_MODEL.streakMultiplierCapDays) * XP_MODEL.streakMultiplierStep;

        const xpGain = Math.max(
          0,
          Math.round((baseXP - penalty - riskPenalty + improvementBonus) * streakMultiplier)
        );

        let nextStreak = state.streakDays;
        const qualifiesForStreak =
          currentDiscipline >= XP_MODEL.streakIncrementMinDiscipline &&
          currentHighSeverity <= XP_MODEL.streakIncrementMaxHighSeverity;
        const shouldResetStreak =
          currentDiscipline < XP_MODEL.streakResetDiscipline ||
          currentHighSeverity >= XP_MODEL.streakResetHighSeverity;

        if (shouldResetStreak) {
          nextStreak = 0;
        } else if (qualifiesForStreak) {
          nextStreak = state.streakDays + 1;
        }

        const nextDiscipline70Streak = currentDiscipline >= 70 ? state.discipline70StreakDays + 1 : 0;
        const nextDiscipline80Streak = currentDiscipline >= 80 ? state.discipline80StreakDays + 1 : 0;
        const nextCleanDayStreak = currentHighSeverity === 0 ? state.cleanDayStreakDays + 1 : 0;

        const nextXp = Math.max(0, toFiniteNumber(state.xp, 0) + toFiniteNumber(xpGain, 0));
        const unlocked = new Set(state.milestonesUnlocked);
        for (const milestone of MILESTONES) {
          if (nextXp >= milestone.xp) unlocked.add(milestone.id);
        }

        let nextAchievements = [...state.achievements];
        if (nextDiscipline70Streak >= 5) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.streak70_5, nowIso);
        }
        if (nextDiscipline80Streak >= 3) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.streak80_3, nowIso);
        }
        if (currentDiscipline >= 90) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.discipline90, nowIso);
        }
        if (currentHighSeverity === 0) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.cleanDay, nowIso);
        }
        if (state.tree.growthProgress >= 100) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.sapling, nowIso);
        }
        if (state.tree.growthProgress >= 1500) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.golden, nowIso);
        }

        set({
          xp: nextXp,
          streakDays: nextStreak,
          lastEvaluatedDate: today,
          milestonesUnlocked: Array.from(unlocked),
          achievements: nextAchievements,
          discipline70StreakDays: nextDiscipline70Streak,
          discipline80StreakDays: nextDiscipline80Streak,
          cleanDayStreakDays: nextCleanDayStreak,
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
        const nextGrowthProgress = Math.max(0, tree.growthProgress + growthRate * hours);
        const nowIso = new Date().toISOString();

        let nextAchievements = [...state.achievements];
        if (nextGrowthProgress >= 100) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.sapling, nowIso);
        }
        if (nextGrowthProgress >= 1500) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.golden, nowIso);
        }

        set({
          achievements: nextAchievements,
          tree: {
            ...tree,
            growthProgress: nextGrowthProgress,
            totalPassiveIncome: Math.max(0, tree.totalPassiveIncome + incomePerHour * hours),
            lastGrowthDate: nowIso,
          },
        });
      },

      simulateDay: () => {
        const state = get();
        const { tree } = state;
        const hours = 24;
        const growthRate = toFiniteNumber(state.getGrowthRate(), 0);
        const incomePerHour = toFiniteNumber(state.getIncomePerHour(), 0);
        const nextGrowthProgress = Math.max(0, tree.growthProgress + growthRate * hours);
        const nowIso = new Date().toISOString();

        let nextAchievements = [...state.achievements];
        if (nextGrowthProgress >= 100) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.sapling, nowIso);
        }
        if (nextGrowthProgress >= 1500) {
          nextAchievements = unlockAchievement(nextAchievements, ACHIEVEMENTS.golden, nowIso);
        }

        set({
          achievements: nextAchievements,
          tree: {
            ...tree,
            growthProgress: nextGrowthProgress,
            totalPassiveIncome: Math.max(0, tree.totalPassiveIncome + incomePerHour * hours),
            lastGrowthDate: nowIso,
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
          achievements: [],
          discipline70StreakDays: 0,
          discipline80StreakDays: 0,
          cleanDayStreakDays: 0,
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
        achievements: state.achievements,
        discipline70StreakDays: state.discipline70StreakDays,
        discipline80StreakDays: state.discipline80StreakDays,
        cleanDayStreakDays: state.cleanDayStreakDays,
        previousDisciplineScore: state.previousDisciplineScore,
        previousHighSeverityCount: state.previousHighSeverityCount,
        tree: state.tree,
      }),
    }
  )
);

export default useGrowthStore;
