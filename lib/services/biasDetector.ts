// Bias Detection Service - Research-Backed Algorithms
// Academic sources: Odean (1998), Barber & Odean (2000, 2001, 2008), 
// Bonaparte & Cooper (2025), Kahneman & Tversky, Gervais & Odean (2001),
// Schnytzer & Westreich (2015), Statman (1987)

import { Trade, BiasDetection, BiasType, Severity, Position } from '@/types';

// ============================================
// Types
// ============================================

interface DetectionResult {
  score: number;
  evidence: Record<string, number | string>;
  intervention: string;
  affectedTrades: string[];
}

// ============================================
// Utility Functions
// ============================================

function getSeverity(score: number): Severity {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function groupTradesByDay(trades: Trade[]): Map<string, Trade[]> {
  const groups = new Map<string, Trade[]>();
  for (const trade of trades) {
    const day = trade.timestamp.split('T')[0];
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(trade);
  }
  return groups;
}

function groupTradesBySymbol(trades: Trade[]): Map<string, Trade[]> {
  const groups = new Map<string, Trade[]>();
  for (const trade of trades) {
    if (!groups.has(trade.symbol)) groups.set(trade.symbol, []);
    groups.get(trade.symbol)!.push(trade);
  }
  return groups;
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
}

function minutesBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60);
}

function hoursBetween(date1: string, date2: string): number {
  return minutesBetween(date1, date2) / 60;
}

function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36).padStart(7, '0').slice(0, 7);
}

function normalizeMetricValue(value: number | string): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(4);
  }
  return value.trim();
}

function buildEvidenceSignature(evidence: Record<string, number | string>): string {
  return Object.entries(evidence)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${normalizeMetricValue(value)}`)
    .join('|');
}

function getBiasSymbolContext(
  evidence: Record<string, number | string>,
  affectedTradeIds: string[],
  tradeById: Map<string, Trade>
): string {
  const evidenceSymbol = evidence.top_symbol;
  if (typeof evidenceSymbol === 'string' && evidenceSymbol.trim()) {
    return evidenceSymbol.trim().toUpperCase();
  }

  const symbolCounts = new Map<string, number>();
  for (const tradeId of affectedTradeIds) {
    const trade = tradeById.get(tradeId);
    if (!trade) continue;
    const symbol = trade.symbol?.trim().toUpperCase();
    if (!symbol) continue;
    symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
  }

  if (symbolCounts.size === 0) return 'GLOBAL';

  return Array.from(symbolCounts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })[0][0];
}

function buildDeterministicBiasId(
  biasType: BiasType,
  symbol: string,
  evidence: Record<string, number | string>
): string {
  const signature = buildEvidenceSignature(evidence);
  return `${biasType}-${symbol}-${stableHash(`${biasType}|${symbol}|${signature}`)}`;
}

// ============================================
// 1. Overtrading Detector
// Research: Barber & Odean (2000) - "Trading is Hazardous to Your Wealth"
// Key finding: Top quintile trades 258% annually, underperforms by 6.5%
// ============================================

function detectOvertrading(trades: Trade[]): DetectionResult {
  if (trades.length < 3) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const tradesByDay = groupTradesByDay(trades);
  const dailyCounts = Array.from(tradesByDay.values()).map(t => t.length);
  const avgDailyTrades = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  const maxDailyTrades = Math.max(...dailyCounts);
  const tradingDays = dailyCounts.length;

  // Calculate portfolio turnover (Barber & Odean methodology)
  const totalTradedValue = trades.reduce((sum, t) => sum + t.total_value, 0);
  const avgTradeValue = totalTradedValue / trades.length;
  const estimatedPortfolioValue = avgTradeValue * 10; // Assume ~10 position portfolio
  const annualTurnover = (totalTradedValue / estimatedPortfolioValue) * (365 / Math.max(tradingDays, 1));

  // Calculate short holding periods
  const symbolTrades = groupTradesBySymbol(trades);
  let shortHolds = 0;
  let totalRoundTrips = 0;

  for (const [, symTrades] of symbolTrades) {
    const sorted = [...symTrades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].action === 'BUY' && sorted[i].action === 'SELL') {
        totalRoundTrips++;
        const holdHours = hoursBetween(sorted[i - 1].timestamp, sorted[i].timestamp);
        if (holdHours < 4) shortHolds++;
      }
    }
  }

  const pctShortHolds = totalRoundTrips > 0 ? (shortHolds / totalRoundTrips) * 100 : 0;

  // Scoring based on Barber & Odean thresholds
  let frequencyScore = 0;
  if (avgDailyTrades >= 15) frequencyScore = 90;
  else if (avgDailyTrades >= 10) frequencyScore = 75;
  else if (avgDailyTrades >= 7) frequencyScore = 55;
  else if (avgDailyTrades >= 5) frequencyScore = 35;
  else frequencyScore = 15;

  let turnoverScore = 0;
  if (annualTurnover > 250) turnoverScore = 95; // Top quintile
  else if (annualTurnover > 100) turnoverScore = 70;
  else if (annualTurnover > 75) turnoverScore = 50; // Market average
  else turnoverScore = 25;

  let holdingScore = 0;
  if (pctShortHolds > 70) holdingScore = 85;
  else if (pctShortHolds > 50) holdingScore = 65;
  else if (pctShortHolds > 30) holdingScore = 40;
  else holdingScore = 20;

  // Weighted composite (Barber & Odean weights)
  const score = Math.round(frequencyScore * 0.4 + turnoverScore * 0.35 + holdingScore * 0.25);

  let intervention = '';
  if (score >= 75) {
    intervention = `Critical: ${avgDailyTrades.toFixed(1)} trades/day with ${annualTurnover.toFixed(0)}% annual turnover. Research shows this reduces returns by 6.5% annually.`;
  } else if (score >= 50) {
    intervention = `High trading frequency (${avgDailyTrades.toFixed(1)}/day). Consider limiting to 3-5 trades per day.`;
  } else if (score >= 25) {
    intervention = `Moderate trading frequency. Monitor for escalation.`;
  } else {
    intervention = 'Trading frequency is healthy and disciplined.';
  }

  return {
    score,
    evidence: {
      avg_daily_trades: Number(avgDailyTrades.toFixed(2)),
      max_daily_trades: maxDailyTrades,
      annual_turnover_pct: Number(annualTurnover.toFixed(0)),
      pct_short_holds: Number(pctShortHolds.toFixed(1)),
    },
    intervention,
    affectedTrades: [],
  };
}

// ============================================
// 2. Loss Aversion Detector  
// Research: Odean (1998) - "Are Investors Reluctant to Realize Their Losses?"
// Kahneman & Tversky - Losses hurt 2-2.5x more than equivalent gains
// Key indicators: Avg loss > Avg win, letting losses run, cutting winners early
// ============================================

function detectLossAversion(trades: Trade[]): DetectionResult {
  if (trades.length < 5) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  // Separate winning and losing trades
  const winners = trades.filter(t => (t.pnl || 0) > 0);
  const losers = trades.filter(t => (t.pnl || 0) < 0);
  const affectedTrades: string[] = losers.map(t => t.id);

  if (winners.length === 0 || losers.length === 0) {
    return { score: 15, evidence: {}, intervention: 'Not enough mixed results to analyze.', affectedTrades: [] };
  }

  // Calculate average win and loss sizes
  const avgWin = winners.reduce((sum, t) => sum + (t.pnl || 0), 0) / winners.length;
  const avgLoss = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0) / losers.length);

  // Loss/Win ratio - loss aversion means avg loss > avg win (letting losses run)
  const lossWinRatio = avgWin > 0 ? avgLoss / avgWin : 0;

  // Win rate
  const winRate = (winners.length / trades.length) * 100;

  // Calculate largest loss vs largest win
  const maxWin = Math.max(...winners.map(t => t.pnl || 0));
  const maxLoss = Math.abs(Math.min(...losers.map(t => t.pnl || 0)));
  const maxLossWinRatio = maxWin > 0 ? maxLoss / maxWin : 0;

  // Consecutive loss behavior - do they let losing streaks continue?
  let maxLossStreak = 0;
  let currentLossStreak = 0;
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  for (const trade of sortedTrades) {
    if ((trade.pnl || 0) < 0) {
      currentLossStreak++;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    } else {
      currentLossStreak = 0;
    }
  }

  // Loss aversion scoring:
  // - High avg loss vs avg win = letting losses run
  // - Low win rate with high loss/win ratio = classic loss aversion
  // - Large max loss = reluctance to cut losses
  
  let score = 0;
  
  // Primary indicator: Loss/Win ratio
  if (lossWinRatio >= 2.0) score += 40; // Losses 2x bigger than wins
  else if (lossWinRatio >= 1.5) score += 30;
  else if (lossWinRatio >= 1.2) score += 20;
  else score += 10;

  // Secondary: Win rate with unbalanced ratio
  if (winRate < 50 && lossWinRatio > 1.0) score += 25; // Bad combo
  else if (winRate < 40) score += 20;
  else if (winRate < 50) score += 10;

  // Tertiary: Max loss behavior
  if (maxLossWinRatio >= 3.0) score += 25; // Catastrophic loss
  else if (maxLossWinRatio >= 2.0) score += 15;
  else if (maxLossWinRatio >= 1.5) score += 10;

  // Loss streak behavior
  if (maxLossStreak >= 5) score += 10;

  score = Math.min(100, score);

  let intervention = '';
  if (score >= 75) {
    intervention = `Critical loss aversion: Avg loss ($${avgLoss.toFixed(0)}) is ${lossWinRatio.toFixed(1)}x larger than avg win ($${avgWin.toFixed(0)}). You're letting losses run while cutting winners early. Set strict stop-losses.`;
  } else if (score >= 50) {
    intervention = `Moderate loss aversion detected. Avg loss ($${avgLoss.toFixed(0)}) exceeds avg win ($${avgWin.toFixed(0)}). Consider tighter stop-losses.`;
  } else if (score >= 25) {
    intervention = `Mild loss aversion tendency. Monitor your loss sizes carefully.`;
  } else {
    intervention = 'Good balance between wins and losses.';
  }

  return {
    score,
    evidence: {
      avg_win: Number(avgWin.toFixed(2)),
      avg_loss: Number(avgLoss.toFixed(2)),
      loss_win_ratio: Number(lossWinRatio.toFixed(2)),
      win_rate_pct: Number(winRate.toFixed(1)),
      max_win: Number(maxWin.toFixed(2)),
      max_loss: Number(maxLoss.toFixed(2)),
      max_loss_streak: maxLossStreak,
    },
    intervention,
    affectedTrades,
  };
}

// ============================================
// 3. Revenge Trading Detector
// Research: Bonaparte & Cooper (2025), Kahneman & Tversky (Prospect Theory)
// Key findings: 96.99% exhibit FOMO/revenge, position size increases 47% after loss
// Thresholds: <30 min reentry + >30% size increase = revenge pattern
// ============================================

function detectRevengeTrading(trades: Trade[]): DetectionResult {
  if (trades.length < 3) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const sorted = [...trades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const revengeInstances: {
    lossAmount: number;
    timeToReentry: number;
    sizeIncrease: number;
    tradeId: string;
  }[] = [];

  const affectedTrades: string[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prevTrade = sorted[i - 1];
    const currTrade = sorted[i];
    const pnl = prevTrade.pnl || 0;

    // Check if previous trade was a significant loss (>2% of trade value or negative P&L)
    const isSignificantLoss = pnl < 0 && Math.abs(pnl) > prevTrade.total_value * 0.02;

    if (isSignificantLoss || pnl < -50) { // $50 or 2% loss threshold
      const timeGap = minutesBetween(prevTrade.timestamp, currTrade.timestamp);
      const sizeRatio = currTrade.total_value / prevTrade.total_value;

      // Bonaparte thresholds: <30 min reentry, >30% size increase
      const rapidReentry = timeGap < 30;
      const sizeEscalation = sizeRatio > 1.3;

      if (rapidReentry || sizeEscalation) {
        revengeInstances.push({
          lossAmount: Math.abs(pnl),
          timeToReentry: timeGap,
          sizeIncrease: (sizeRatio - 1) * 100,
          tradeId: currTrade.id,
        });
        affectedTrades.push(currTrade.id);
      }
    }
  }

  // Calculate score based on revenge instances
  const revengeRate = (revengeInstances.length / (sorted.length - 1)) * 100;
  
  // Check for all 3 conditions met (most severe)
  const fullPatternMatches = revengeInstances.filter(
    r => r.timeToReentry < 30 && r.sizeIncrease > 30
  ).length;

  let score = 0;
  if (fullPatternMatches >= 2) score = 90; // Multiple full pattern matches
  else if (revengeInstances.length >= 3) score = 75;
  else if (revengeInstances.length >= 2) score = 55;
  else if (revengeInstances.length >= 1) score = 35;
  else score = 10;

  const avgTimeToReentry = revengeInstances.length > 0
    ? revengeInstances.reduce((sum, r) => sum + r.timeToReentry, 0) / revengeInstances.length
    : 0;
  const avgSizeIncrease = revengeInstances.length > 0
    ? revengeInstances.reduce((sum, r) => sum + r.sizeIncrease, 0) / revengeInstances.length
    : 0;

  let intervention = '';
  if (score >= 75) {
    intervention = `Critical: ${revengeInstances.length} revenge trades detected. After losses, you re-enter in ${avgTimeToReentry.toFixed(0)} min with ${avgSizeIncrease.toFixed(0)}% larger positions. Implement 30-min cooling period.`;
  } else if (score >= 50) {
    intervention = `Revenge trading pattern detected. Wait 30+ minutes after any loss before trading again.`;
  } else if (score >= 25) {
    intervention = 'Mild revenge trading tendency. Monitor emotional state after losses.';
  } else {
    intervention = 'Good emotional control after losses.';
  }

  return {
    score,
    evidence: {
      revenge_instances: revengeInstances.length,
      revenge_rate_pct: Number(revengeRate.toFixed(1)),
      avg_time_to_reentry_min: Number(avgTimeToReentry.toFixed(1)),
      avg_size_increase_pct: Number(avgSizeIncrease.toFixed(1)),
    },
    intervention,
    affectedTrades,
  };
}

// ============================================
// 4. Disposition Effect Detector
// Research: Odean (1998), Kim (2021)
// Disposition effect: Taking small profits quickly, letting losses grow
// For complete trades: compare win sizes vs loss sizes, and behavior after wins/losses
// ============================================

function detectDispositionEffect(trades: Trade[]): DetectionResult {
  if (trades.length < 5) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const sorted = [...trades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const winners = trades.filter(t => (t.pnl || 0) > 0);
  const losers = trades.filter(t => (t.pnl || 0) < 0);
  const affectedTrades: string[] = [];

  if (winners.length === 0 || losers.length === 0) {
    return { score: 10, evidence: {}, intervention: 'Not enough mixed results for disposition analysis.', affectedTrades: [] };
  }

  // Average win size vs loss size
  const avgWinSize = winners.reduce((sum, t) => sum + (t.pnl || 0), 0) / winners.length;
  const avgLossSize = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0) / losers.length);

  // Disposition effect: Small wins, big losses
  // Ratio < 1 means wins are smaller than losses = disposition effect
  const winLossRatio = avgWinSize / avgLossSize;

  // Check if they exit quickly after a small win (impatience with winners)
  let quickExitsAfterWin = 0;
  let totalWinFollowups = 0;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    
    if ((curr.pnl || 0) > 0) {
      totalWinFollowups++;
      const timeBetween = minutesBetween(curr.timestamp, next.timestamp);
      // Quick trade after a win (within 5 minutes) suggests taking quick profits
      if (timeBetween < 5) {
        quickExitsAfterWin++;
        affectedTrades.push(curr.id);
      }
    }
  }

  const pctQuickAfterWin = totalWinFollowups > 0 ? (quickExitsAfterWin / totalWinFollowups) * 100 : 0;

  // Check for profit taking pattern: many small wins
  const smallWins = winners.filter(t => (t.pnl || 0) < avgWinSize * 0.5).length;
  const pctSmallWins = (smallWins / winners.length) * 100;

  // Scoring
  let score = 0;

  // Win/Loss ratio < 1 means taking smaller profits than losses
  if (winLossRatio < 0.5) score += 40; // Wins half the size of losses
  else if (winLossRatio < 0.75) score += 30;
  else if (winLossRatio < 1.0) score += 20;
  else score += 5;

  // Many small wins = cutting winners early
  if (pctSmallWins > 60) score += 25;
  else if (pctSmallWins > 40) score += 15;
  else score += 5;

  // Quick trading after wins
  if (pctQuickAfterWin > 50) score += 20;
  else if (pctQuickAfterWin > 30) score += 10;

  score = Math.min(100, score);

  let intervention = '';
  if (score >= 75) {
    intervention = `Strong disposition effect: Avg win ($${avgWinSize.toFixed(0)}) is only ${(winLossRatio * 100).toFixed(0)}% of avg loss ($${avgLossSize.toFixed(0)}). Let winners run longer!`;
  } else if (score >= 50) {
    intervention = `Disposition effect detected: Taking profits too quickly. ${pctSmallWins.toFixed(0)}% of wins are below average.`;
  } else if (score >= 25) {
    intervention = 'Mild disposition tendency. Consider using trailing stops to let winners run.';
  } else {
    intervention = 'Good balance between letting winners run and cutting losses.';
  }

  return {
    score,
    evidence: {
      avg_win_size: Number(avgWinSize.toFixed(2)),
      avg_loss_size: Number(avgLossSize.toFixed(2)),
      win_loss_ratio: Number(winLossRatio.toFixed(2)),
      pct_small_wins: Number(pctSmallWins.toFixed(1)),
      pct_quick_after_win: Number(pctQuickAfterWin.toFixed(1)),
    },
    intervention,
    affectedTrades,
  };
}

// ============================================
// 5. Risk Escalation / Martingale Detector
// Research: Schnytzer & Westreich (2015), Thaler & Johnson (1990)
// Key finding: Martingale leads to ruin in 89% of simulations
// Thresholds: >25% size increase during losing streak = escalation
// ============================================

function detectRiskEscalation(trades: Trade[]): DetectionResult {
  if (trades.length < 4) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const sorted = [...trades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const escalationEvents: {
    streakLength: number;
    sizeIncreasePct: number;
    tradeId: string;
  }[] = [];

  const affectedTrades: string[] = [];

  // Track losing streaks
  let currentStreak = 0;
  let streakStartIdx = 0;

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i];
    const pnl = trade.pnl || 0;

    if (pnl < 0) {
      if (currentStreak === 0) streakStartIdx = i;
      currentStreak++;

      // Check for size escalation during streak (after 2+ losses)
      if (currentStreak >= 2 && i > 0) {
        const prevSize = sorted[i - 1].total_value;
        const currSize = trade.total_value;
        const sizeIncrease = ((currSize / prevSize) - 1) * 100;

        // Schnytzer threshold: >25% increase during losing streak
        if (sizeIncrease > 25) {
          escalationEvents.push({
            streakLength: currentStreak,
            sizeIncreasePct: sizeIncrease,
            tradeId: trade.id,
          });
          affectedTrades.push(trade.id);
        }
      }
    } else {
      currentStreak = 0;
    }
  }

  // Score based on escalation severity
  const maxEscalation = escalationEvents.length > 0
    ? Math.max(...escalationEvents.map(e => e.sizeIncreasePct))
    : 0;

  let score = 0;
  if (maxEscalation > 100) score = 95; // Doubling position = CRITICAL
  else if (maxEscalation > 50) score = 75;
  else if (escalationEvents.length >= 2) score = 60;
  else if (escalationEvents.length >= 1) score = 40;
  else score = 10;

  let intervention = '';
  if (score >= 90) {
    intervention = `CRITICAL: Martingale detected! Doubling position after losses leads to ruin 89% of the time. Use FIXED 1% risk per trade.`;
  } else if (score >= 75) {
    intervention = `Risk escalation during losses (${maxEscalation.toFixed(0)}% size increase). Limit position size to 50% of previous after any loss.`;
  } else if (score >= 50) {
    intervention = 'Gradual risk increase during losing periods detected. Maintain consistent sizing.';
  } else {
    intervention = 'Good risk management during losing periods.';
  }

  return {
    score,
    evidence: {
      escalation_events: escalationEvents.length,
      max_size_increase_pct: Number(maxEscalation.toFixed(1)),
      longest_losing_streak: Math.max(...escalationEvents.map(e => e.streakLength), 0),
    },
    intervention,
    affectedTrades,
  };
}

// ============================================
// 6. Overconfidence / Hot-Hand Fallacy Detector
// Research: Gervais & Odean (2001), Barber & Odean (2001)
// Key finding: After 3+ wins, traders increase size 27% and frequency 18%
// ============================================

function detectOverconfidence(trades: Trade[]): DetectionResult {
  if (trades.length < 5) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const sorted = [...trades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const hotHandEpisodes: {
    streakLength: number;
    sizeIncreasePct: number;
    postStreakPnl: number;
  }[] = [];

  const affectedTrades: string[] = [];

  // Track winning streaks
  let currentWinStreak = 0;
  let baselineSize = sorted.slice(0, 3).reduce((sum, t) => sum + t.total_value, 0) / 3;

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i];
    const pnl = trade.pnl || 0;

    if (pnl > 0) {
      currentWinStreak++;

      // Gervais & Odean: Check for hot-hand behavior after 3+ wins
      if (currentWinStreak >= 3) {
        const currentSize = trade.total_value;
        const sizeIncrease = ((currentSize / baselineSize) - 1) * 100;

        // 27% threshold from research
        if (sizeIncrease > 20) {
          // Calculate post-streak performance (next 3 trades if available)
          let postStreakPnl = 0;
          for (let j = i + 1; j <= Math.min(i + 3, sorted.length - 1); j++) {
            postStreakPnl += sorted[j].pnl || 0;
          }

          hotHandEpisodes.push({
            streakLength: currentWinStreak,
            sizeIncreasePct: sizeIncrease,
            postStreakPnl,
          });
          affectedTrades.push(trade.id);
        }
      }
    } else {
      currentWinStreak = 0;
    }
  }

  // Additional overconfidence metric: High frequency + poor win rate
  const winRate = sorted.filter(t => (t.pnl || 0) > 0).length / sorted.length;
  const tradesPerDay = sorted.length / Math.max(1, daysBetween(sorted[0].timestamp, sorted[sorted.length - 1].timestamp));
  const frequencyOverconfidence = tradesPerDay > 5 && winRate < 0.55;

  // Calculate average post-streak performance
  const avgPostStreakPnl = hotHandEpisodes.length > 0
    ? hotHandEpisodes.reduce((sum, e) => sum + e.postStreakPnl, 0) / hotHandEpisodes.length
    : 0;

  let score = 0;
  if (hotHandEpisodes.length >= 3 && avgPostStreakPnl < 0) score = 80;
  else if (hotHandEpisodes.length >= 2 || frequencyOverconfidence) score = 60;
  else if (hotHandEpisodes.length >= 1) score = 40;
  else score = 15;

  let intervention = '';
  if (score >= 75) {
    intervention = `Overconfidence detected: After winning streaks you increase risk, but post-streak returns are negative. Maintain consistent sizing.`;
  } else if (score >= 50) {
    intervention = `Hot-hand tendency: ${hotHandEpisodes.length} episodes of increased risk after wins. Each trade is independent.`;
  } else {
    intervention = 'Good humility after winning trades.';
  }

  return {
    score,
    evidence: {
      hot_hand_episodes: hotHandEpisodes.length,
      avg_size_increase_after_wins_pct: hotHandEpisodes.length > 0 
        ? Number((hotHandEpisodes.reduce((sum, e) => sum + e.sizeIncreasePct, 0) / hotHandEpisodes.length).toFixed(1))
        : 0,
      avg_post_streak_pnl: Number(avgPostStreakPnl.toFixed(2)),
      win_rate_pct: Number((winRate * 100).toFixed(1)),
    },
    intervention,
    affectedTrades,
  };
}

// ============================================
// 7. Concentration Bias Detector
// Research: Statman (1987), Ivković et al. (2008)
// Key finding: HHI > 0.25 = dangerous concentration, need 20-30 stocks
// ============================================

function detectConcentration(trades: Trade[], positions: Position[]): DetectionResult {
  if (positions.length === 0) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const totalValue = positions.reduce((sum, p) => sum + p.current_value, 0);
  
  // Calculate market shares for HHI (Statman methodology)
  const marketShares = positions.map(p => p.current_value / totalValue);
  
  // Herfindahl-Hirschman Index = Sum of squared market shares
  const hhi = marketShares.reduce((sum, share) => sum + share * share, 0);

  const maxAllocation = Math.max(...marketShares) * 100;
  const topSymbol = positions.find(p => (p.current_value / totalValue) * 100 === maxAllocation)?.symbol || '';

  // Top 3 concentration
  const sortedShares = [...marketShares].sort((a, b) => b - a);
  const top3Concentration = sortedShares.slice(0, 3).reduce((sum, s) => sum + s, 0) * 100;

  // Scoring based on Statman (1987) HHI thresholds
  let score = 0;
  if (hhi > 0.50) score = 95; // Extreme concentration
  else if (hhi > 0.25) score = 70; // Statman danger threshold
  else if (hhi > 0.15) score = 45;
  else score = 15;

  let intervention = '';
  if (score >= 90) {
    intervention = `CRITICAL: ${maxAllocation.toFixed(0)}% in ${topSymbol}! HHI=${hhi.toFixed(2)} indicates extreme concentration. Diversify to 8-10+ symbols.`;
  } else if (score >= 70) {
    intervention = `High concentration (HHI=${hhi.toFixed(2)}). Top 3 = ${top3Concentration.toFixed(0)}%. Target <60% for top 3.`;
  } else if (score >= 45) {
    intervention = `Moderate concentration. Consider adding 3-5 more positions.`;
  } else {
    intervention = 'Well-diversified portfolio.';
  }

  return {
    score,
    evidence: {
      herfindahl_index: Number(hhi.toFixed(3)),
      max_allocation_pct: Number(maxAllocation.toFixed(1)),
      top_symbol: topSymbol,
      top_3_concentration_pct: Number(top3Concentration.toFixed(1)),
      num_positions: positions.length,
    },
    intervention,
    affectedTrades: [],
  };
}

// ============================================
// 8. Fee Drag Detector
// Research: Barber & Odean (2000, 2008)
// Key finding: Most active traders have 6.5% annual fee drag
// ============================================

function detectFeeDrag(trades: Trade[]): DetectionResult {
  if (trades.length === 0) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const grossPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0) + totalFees;
  const netPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Fee drag ratio (Barber & Odean methodology)
  const feeDragRatio = grossPnl !== 0 ? (totalFees / Math.abs(grossPnl)) * 100 : 0;

  // Annualized fee drag estimate
  const tradingDays = new Set(trades.map(t => t.timestamp.split('T')[0])).size;
  const totalVolume = trades.reduce((sum, t) => sum + t.total_value, 0);
  const annualizedFeeDrag = (totalFees / totalVolume) * (365 / Math.max(tradingDays, 1)) * 100;

  // Trades where fees exceeded profit
  const tradesWhereFeeExceededProfit = trades.filter(t => 
    Math.abs(t.pnl || 0) < t.fees
  ).length;
  const pctTradesBelowFee = (tradesWhereFeeExceededProfit / trades.length) * 100;

  // Scoring based on Barber & Odean thresholds
  let score = 0;
  if (feeDragRatio > 30 || annualizedFeeDrag > 5) score = 90; // Worse than top quintile
  else if (feeDragRatio > 15 || annualizedFeeDrag > 3) score = 70;
  else if (feeDragRatio > 5 || annualizedFeeDrag > 1.5) score = 45;
  else score = 15;

  let intervention = '';
  if (score >= 90) {
    intervention = `CRITICAL: Fees consuming ${feeDragRatio.toFixed(0)}% of gains (${annualizedFeeDrag.toFixed(1)}% annually). Reduce trading frequency by 75%.`;
  } else if (score >= 70) {
    intervention = `High fee drag (${feeDragRatio.toFixed(0)}% of profits). Cut frequency in half.`;
  } else if (score >= 45) {
    intervention = 'Moderate fee drag. Review if each trade justifies the cost.';
  } else {
    intervention = 'Fee efficiency is good.';
  }

  return {
    score,
    evidence: {
      total_fees: Number(totalFees.toFixed(2)),
      gross_pnl: Number(grossPnl.toFixed(2)),
      net_pnl: Number(netPnl.toFixed(2)),
      fee_drag_ratio_pct: Number(feeDragRatio.toFixed(1)),
      annualized_fee_drag_pct: Number(annualizedFeeDrag.toFixed(2)),
      pct_trades_where_fees_exceeded_profit: Number(pctTradesBelowFee.toFixed(1)),
    },
    intervention,
    affectedTrades: [],
  };
}

// ============================================
// 9. Churn Detector
// Research: Barber & Odean (2008) - "Attention-Induced Trading"
// Key finding: Round-trips within 7 days = churn, underperforms by 5.8%
// ============================================

function detectChurn(trades: Trade[]): DetectionResult {
  if (trades.length < 4) {
    return { score: 0, evidence: {}, intervention: '', affectedTrades: [] };
  }

  const symbolTrades = groupTradesBySymbol(trades);
  const churnInstances: {
    symbol: string;
    holdingDays: number;
    pnl: number;
    fees: number;
  }[] = [];

  const affectedTrades: string[] = [];

  for (const [symbol, symTrades] of symbolTrades) {
    const sorted = [...symTrades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (let i = 1; i < sorted.length; i++) {
      const buyTrade = sorted[i - 1];
      const sellTrade = sorted[i];
      
      if (buyTrade.action === 'BUY' && sellTrade.action === 'SELL') {
        const holdingDays = daysBetween(buyTrade.timestamp, sellTrade.timestamp);
        
        // Barber & Odean: <7 days = churn
        if (holdingDays < 7) {
          const pnl = sellTrade.pnl || ((sellTrade.price - buyTrade.price) * buyTrade.quantity);
          const fees = buyTrade.fees + sellTrade.fees;
          
          churnInstances.push({
            symbol,
            holdingDays,
            pnl,
            fees,
          });
          affectedTrades.push(sellTrade.id);
        }
      }
    }
  }

  // Calculate churn metrics
  const churnRate = trades.length > 0 ? (churnInstances.length / trades.length) * 100 : 0;
  const avgChurnPnl = churnInstances.length > 0
    ? churnInstances.reduce((sum, c) => sum + c.pnl, 0) / churnInstances.length
    : 0;
  const totalValueLostToChurn = churnInstances
    .filter(c => c.pnl - c.fees < 0)
    .reduce((sum, c) => sum + (c.pnl - c.fees), 0);

  // Scoring based on churn rate and profitability
  let score = 0;
  if (churnRate > 40 && avgChurnPnl < 0) score = 80; // Value-destructive churn
  else if (churnRate > 30) score = 60;
  else if (churnRate > 20) score = 40;
  else if (churnRate > 10) score = 25;
  else score = 10;

  let intervention = '';
  if (score >= 75) {
    intervention = `${churnRate.toFixed(0)}% of trades are churn (<7 day round-trips) losing avg $${Math.abs(avgChurnPnl).toFixed(0)}. Hold positions longer.`;
  } else if (score >= 50) {
    intervention = `Significant churn detected (${churnRate.toFixed(0)}% quick flips). Extend holding periods.`;
  } else if (score >= 25) {
    intervention = 'Some short-term trading. Consider if quick exits are justified.';
  } else {
    intervention = 'Good holding discipline.';
  }

  return {
    score,
    evidence: {
      churn_instances: churnInstances.length,
      churn_rate_pct: Number(churnRate.toFixed(1)),
      avg_churn_pnl: Number(avgChurnPnl.toFixed(2)),
      total_value_lost_to_churn: Number(totalValueLostToChurn.toFixed(2)),
      avg_churn_holding_days: churnInstances.length > 0
        ? Number((churnInstances.reduce((sum, c) => sum + c.holdingDays, 0) / churnInstances.length).toFixed(1))
        : 0,
    },
    intervention,
    affectedTrades,
  };
}

// ============================================
// Main Detection Function
// ============================================

export interface BiasAnalysisResult {
  biases: BiasDetection[];
  disciplineScore: number;
  summary: {
    totalBiases: number;
    criticalBiases: number;
    highBiases: number;
    topConcern: string;
  };
}

export function analyzeBiases(
  trades: Trade[], 
  positions: Position[] = []
): BiasAnalysisResult {
  const detectors: { type: BiasType; detect: () => DetectionResult }[] = [
    { type: 'overtrading', detect: () => detectOvertrading(trades) },
    { type: 'loss_aversion', detect: () => detectLossAversion(trades) },
    { type: 'revenge_trading', detect: () => detectRevengeTrading(trades) },
    { type: 'disposition_effect', detect: () => detectDispositionEffect(trades) },
    { type: 'risk_escalation', detect: () => detectRiskEscalation(trades) },
    { type: 'overconfidence', detect: () => detectOverconfidence(trades) },
    { type: 'concentration_bias', detect: () => detectConcentration(trades, positions) },
    { type: 'fee_drag', detect: () => detectFeeDrag(trades) },
    { type: 'churn', detect: () => detectChurn(trades) },
  ];

  const biases: BiasDetection[] = [];
  let totalScore = 0;
  const tradeById = new Map(trades.map(trade => [trade.id, trade]));

  for (const { type, detect } of detectors) {
    const result = detect();
    totalScore += result.score;

    if (result.score > 0) {
      const symbol = getBiasSymbolContext(result.evidence, result.affectedTrades, tradeById);
      const deterministicId = buildDeterministicBiasId(type, symbol, result.evidence);
      biases.push({
        id: deterministicId,
        session_id: 'current',
        bias_type: type,
        score: result.score,
        severity: getSeverity(result.score),
        evidence: {
          summary: result.intervention,
          key_metrics: result.evidence as Record<string, number>,
          timestamps: [],
        },
        metrics: result.evidence,
        affected_trades: result.affectedTrades,
        intervention: result.intervention,
        explanation: result.intervention,
        detected_at: new Date().toISOString(),
      });
    }
  }

  // Calculate discipline score (inverse of bias severity)
  const avgBiasScore = detectors.length > 0 ? totalScore / detectors.length : 0;
  const disciplineScore = Math.max(0, Math.min(100, 100 - avgBiasScore));

  // Sort by severity
  biases.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  const criticalBiases = biases.filter(b => b.severity === 'critical').length;
  const highBiases = biases.filter(b => b.severity === 'high').length;
  const topConcern = biases[0]?.bias_type || 'none';

  return {
    biases,
    disciplineScore: Math.round(disciplineScore),
    summary: {
      totalBiases: biases.length,
      criticalBiases,
      highBiases,
      topConcern,
    },
  };
}

export default { analyzeBiases };
