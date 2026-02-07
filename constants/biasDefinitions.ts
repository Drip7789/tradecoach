// Bias Definitions and Metadata

import { BiasType, Severity } from '@/types';

export interface BiasDefinition {
  type: BiasType;
  name: string;
  icon: string;
  description: string;
  shortDescription: string;
  metrics: string[];
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  interventions: string[];
}

export const biasDefinitions: Record<BiasType, BiasDefinition> = {
  overtrading: {
    type: 'overtrading',
    name: 'Overtrading',
    icon: '⚡',
    description: 'Executing too many trades in a short period, often driven by excitement, boredom, or the illusion of control.',
    shortDescription: 'Too many trades in a short period',
    metrics: ['trades_per_day', 'avg_hold_time', 'trade_clusters'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Limit yourself to 5 trades per day maximum',
      'Implement a 30-minute cooldown between trades',
      'Keep a trade journal to review decisions',
    ],
  },

  loss_aversion: {
    type: 'loss_aversion',
    name: 'Loss Aversion',
    icon: '😰',
    description: 'The psychological tendency to prefer avoiding losses over acquiring equivalent gains.',
    shortDescription: 'Holding losers too long, selling winners early',
    metrics: ['avg_loss_hold_time', 'avg_win_hold_time', 'hold_time_ratio'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Set stop-loss orders at 5-10% below entry',
      'Use trailing stops to protect gains',
      'Pre-commit to exit strategies before entering',
    ],
  },

  revenge_trading: {
    type: 'revenge_trading',
    name: 'Revenge Trading',
    icon: '🔥',
    description: 'Impulsive trading to recover losses, characterized by increased position sizes and rapid re-entry after drawdowns.',
    shortDescription: 'Aggressive trading after losses to recover',
    metrics: ['position_size_spike', 'time_to_reentry', 'loss_recovery_attempts'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Take a mandatory 24-hour break after significant losses',
      'Reduce position size by 50% after a losing streak',
      'Set a daily loss limit and stop trading when hit',
    ],
  },

  disposition_effect: {
    type: 'disposition_effect',
    name: 'Disposition Effect',
    icon: '⚖️',
    description: 'The tendency to sell winning investments too early and hold losing investments too long.',
    shortDescription: 'Asymmetric handling of winners vs losers',
    metrics: ['winner_hold_time', 'loser_hold_time', 'profit_taking_speed'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Set profit targets equal to or greater than stop-losses',
      'Use a 1:2 risk-reward ratio minimum',
      'Let winners run with trailing stops',
    ],
  },

  risk_escalation: {
    type: 'risk_escalation',
    name: 'Risk Escalation',
    icon: '📈',
    description: 'Increasing position sizes during a losing streak, similar to martingale betting.',
    shortDescription: 'Increasing position sizes when losing',
    metrics: ['position_size_trend', 'losing_streak_behavior', 'risk_per_trade'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Use fixed position sizing (1-2% of portfolio per trade)',
      'Reduce position size by 25% after each loss',
      'Never average down on losing positions',
    ],
  },

  overconfidence: {
    type: 'overconfidence',
    name: 'Overconfidence',
    icon: '🎯',
    description: 'Excessive belief in one\'s trading abilities after a winning streak, leading to larger positions and riskier trades.',
    shortDescription: 'Riskier behavior after winning streaks',
    metrics: ['post_win_frequency', 'post_win_position_size', 'win_streak_length'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Maintain consistent position sizing regardless of recent results',
      'Take a break after a winning streak to avoid complacency',
      'Remember that past performance doesn\'t guarantee future success',
    ],
  },

  concentration_bias: {
    type: 'concentration_bias',
    name: 'Concentration Bias',
    icon: '🎲',
    description: 'Over-allocating to a single asset or sector, creating excessive portfolio concentration.',
    shortDescription: 'Too much allocation in one asset',
    metrics: ['herfindahl_index', 'top_holding_percentage', 'sector_concentration'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Limit any single position to 20% of portfolio',
      'Diversify across at least 5-10 different assets',
      'Rebalance monthly to maintain target allocations',
    ],
  },

  fee_drag: {
    type: 'fee_drag',
    name: 'Fee Drag',
    icon: '💸',
    description: 'Excessive trading costs eating into returns due to high frequency trading.',
    shortDescription: 'Trading fees eroding profits',
    metrics: ['total_fees', 'fees_to_returns_ratio', 'fee_per_trade'],
    thresholds: { low: 40, medium: 55, high: 70, critical: 85 },
    interventions: [
      'Reduce trading frequency to lower fee burden',
      'Use limit orders to avoid spread costs',
      'Calculate total cost before each trade',
    ],
  },

  churn: {
    type: 'churn',
    name: 'Churn Behavior',
    icon: '🔄',
    description: 'Quick round-trip trades (buy then sell within days) that destroy value through fees and poor timing.',
    shortDescription: 'Quick flips that lose money to fees',
    metrics: ['churn_rate', 'avg_holding_days', 'churn_pnl', 'fees_on_churn'],
    thresholds: { low: 35, medium: 50, high: 70, critical: 85 },
    interventions: [
      'Set a minimum 2-week holding period before selling',
      'Calculate break-even price including fees before entering',
      'Track your average holding time and aim to increase it',
    ],
  },
};

// Helper function to get bias definition
export const getBiasDefinition = (biasType: BiasType): BiasDefinition => {
  return biasDefinitions[biasType];
};

// Helper function to get severity from score
export const getSeverityFromScore = (score: number, biasType: BiasType): Severity => {
  const thresholds = biasDefinitions[biasType].thresholds;
  
  if (score >= thresholds.critical) return 'critical';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
};

// Get all bias types
export const getAllBiasTypes = (): BiasType[] => {
  return Object.keys(biasDefinitions) as BiasType[];
};

// Get display name for bias type
export const getBiasDisplayName = (biasType: BiasType): string => {
  return biasDefinitions[biasType]?.name || biasType;
};

// Get icon for bias type
export const getBiasIcon = (biasType: BiasType): string => {
  return biasDefinitions[biasType]?.icon || '❓';
};

export default biasDefinitions;

