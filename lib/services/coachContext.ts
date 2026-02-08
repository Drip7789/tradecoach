import { BehaviorReport } from '@/lib/services/behaviorReport';
import { Position, Trade } from '@/types';

export interface CoachTradingContext {
  cashBalance: number;
  totalPortfolioValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    assetType: string;
  }>;
  trades: Array<{
    id: string;
    symbol: string;
    action: string;
    quantity?: number;
    price?: number;
    pnl?: number;
    timestamp: string;
    assetType?: string;
  }>;
  biases: Array<{
    bias_type: string;
    score: number;
    severity: string;
    intervention: string;
  }>;
  disciplineScore: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
}

interface BuildCoachContextInput {
  report: BehaviorReport | undefined;
  trades: Trade[];
  positions: Position[];
  cashBalance: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  tradeLimit?: number;
}

export function buildCoachContext({
  report,
  trades,
  positions,
  cashBalance,
  totalValue,
  totalPnl,
  totalPnlPercent,
  tradeLimit = 15,
}: BuildCoachContextInput): CoachTradingContext {
  const winners = trades.filter((trade) => (trade.pnl || 0) > 0);
  const losers = trades.filter((trade) => (trade.pnl || 0) < 0);
  const realizedPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0;

  return {
    cashBalance,
    totalPortfolioValue: totalValue,
    unrealizedPnL: totalPnl,
    unrealizedPnLPercent: totalPnlPercent,
    realizedPnL,
    positions: positions.map((position) => ({
      symbol: position.symbol,
      quantity: position.quantity,
      avgCost: position.avg_cost,
      currentPrice: position.current_price,
      currentValue: position.current_value,
      pnl: position.pnl,
      pnlPercent: position.pnl_percent,
      assetType: position.asset_type,
    })),
    trades: trades.slice(0, tradeLimit).map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      pnl: trade.pnl,
      timestamp: trade.timestamp,
      assetType: trade.asset_type,
    })),
    biases: (report?.biases || []).map((bias) => ({
      bias_type: bias.bias_type,
      score: bias.score,
      severity: bias.severity,
      intervention: bias.intervention,
    })),
    disciplineScore: report?.disciplineScore ?? 100,
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate,
  };
}

export default { buildCoachContext };
