'use client';

import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { BehaviorReport, computeBehaviorReport } from '@/lib/services/behaviorReport';

interface BehaviorInputs {
  tradesCount: number;
  positionsCount: number;
}

interface UseBehaviorReportResult {
  report: BehaviorReport | undefined;
  isReady: boolean;
  inputs: BehaviorInputs;
}

export function useBehaviorReport(): UseBehaviorReportResult {
  const { trades, positions } = usePortfolioStore(
    (state) => ({
      trades: state.trades,
      positions: state.positions,
    }),
    shallow
  );

  const report = useMemo(() => {
    // Recompute only when trading-relevant slices change.
    if (trades.length === 0 && positions.length === 0) {
      return undefined;
    }
    return computeBehaviorReport({ trades, positions });
  }, [trades, positions]);

  return {
    report,
    isReady: trades.length > 0 || positions.length > 0,
    inputs: {
      tradesCount: trades.length,
      positionsCount: positions.length,
    },
  };
}

export default useBehaviorReport;
