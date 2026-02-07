// Portfolio State Store (Zustand)
// Manages portfolio state across the app with real-time updates

import { create } from 'zustand';
import { Position, Trade, AssetAllocation, AssetType } from '@/types';
import { getChartColor } from '@/constants/colors';

interface PortfolioState {
  // Portfolio data
  cashBalance: number;
  positions: Position[];
  trades: Trade[];
  
  // Computed values
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  allocations: AssetAllocation[];
  
  // Actions
  executeBuy: (symbol: string, quantity: number, price: number, fees: number, assetType: AssetType) => boolean;
  executeSell: (symbol: string, quantity: number, price: number, fees: number) => boolean;
  updatePrices: (prices: Record<string, number>) => void;
  resetPortfolio: () => void;
}

// Starting demo balance
const INITIAL_CASH = 100000;

// Calculate allocations including cash
const calculateAllocations = (positions: Position[], cashBalance: number, totalValue: number): AssetAllocation[] => {
  const allocations: AssetAllocation[] = [];
  
  // Add cash as first allocation (gray color)
  if (cashBalance > 0 && totalValue > 0) {
    allocations.push({
      symbol: 'Cash',
      value: cashBalance,
      percentage: (cashBalance / totalValue) * 100,
      color: '#64748B', // Slate gray for cash
      asset_type: 'cash' as AssetType,
    });
  }
  
  // Add position allocations
  positions.forEach((position, index) => {
    if (position.current_value > 0 && totalValue > 0) {
      allocations.push({
        symbol: position.symbol,
        value: position.current_value,
        percentage: (position.current_value / totalValue) * 100,
        color: getChartColor(index),
        asset_type: position.asset_type,
      });
    }
  });
  
  return allocations;
};

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  // Initial state
  cashBalance: INITIAL_CASH,
  positions: [],
  trades: [],
  totalValue: INITIAL_CASH,
  totalPnl: 0,
  totalPnlPercent: 0,
  allocations: [{
    symbol: 'Cash',
    value: INITIAL_CASH,
    percentage: 100,
    color: '#64748B',
    asset_type: 'cash' as AssetType,
  }],
  
  // Execute a BUY trade
  executeBuy: (symbol: string, quantity: number, price: number, fees: number, assetType: AssetType): boolean => {
    const state = get();
    const totalCost = (quantity * price) + fees;
    
    // Check if user has enough cash
    if (totalCost > state.cashBalance) {
      return false; // Not enough funds
    }
    
    // Deduct from cash
    const newCashBalance = state.cashBalance - totalCost;
    
    // Update or create position
    const existingPositionIndex = state.positions.findIndex(p => p.symbol === symbol);
    let newPositions: Position[];
    
    if (existingPositionIndex >= 0) {
      // Update existing position (average cost basis)
      const existing = state.positions[existingPositionIndex];
      const totalQuantity = existing.quantity + quantity;
      const totalCostBasis = (existing.avg_cost * existing.quantity) + (price * quantity);
      const newAvgCost = totalCostBasis / totalQuantity;
      const currentValue = totalQuantity * price;
      const pnl = currentValue - (newAvgCost * totalQuantity);
      
      newPositions = [...state.positions];
      newPositions[existingPositionIndex] = {
        ...existing,
        quantity: totalQuantity,
        avg_cost: newAvgCost,
        current_price: price,
        current_value: currentValue,
        pnl,
        pnl_percent: (pnl / (newAvgCost * totalQuantity)) * 100,
      };
    } else {
      // Create new position
      const currentValue = quantity * price;
      newPositions = [...state.positions, {
        symbol,
        quantity,
        avg_cost: price,
        current_price: price,
        current_value: currentValue,
        pnl: 0,
        pnl_percent: 0,
        asset_type: assetType,
      }];
    }
    
    // Create trade record
    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      session_id: 'demo-session-1',
      user_id: 'demo-user',
      symbol,
      action: 'BUY',
      quantity,
      price,
      total_value: quantity * price,
      fees,
      timestamp: new Date().toISOString(),
      asset_type: assetType,
    };
    
    // Calculate new totals
    const positionsValue = newPositions.reduce((sum, p) => sum + p.current_value, 0);
    const newTotalValue = newCashBalance + positionsValue;
    const totalCostBasis = newPositions.reduce((sum, p) => sum + (p.avg_cost * p.quantity), 0);
    const newTotalPnl = newPositions.reduce((sum, p) => sum + p.pnl, 0);
    const newTotalPnlPercent = totalCostBasis > 0 ? (newTotalPnl / totalCostBasis) * 100 : 0;
    
    set({
      cashBalance: newCashBalance,
      positions: newPositions,
      trades: [newTrade, ...state.trades],
      totalValue: newTotalValue,
      totalPnl: newTotalPnl,
      totalPnlPercent: newTotalPnlPercent,
      allocations: calculateAllocations(newPositions, newCashBalance, newTotalValue),
    });
    
    return true;
  },
  
  // Execute a SELL trade
  executeSell: (symbol: string, quantity: number, price: number, fees: number): boolean => {
    const state = get();
    
    // Find position
    const positionIndex = state.positions.findIndex(p => p.symbol === symbol);
    if (positionIndex < 0) {
      return false; // No position to sell
    }
    
    const position = state.positions[positionIndex];
    if (quantity > position.quantity) {
      return false; // Can't sell more than you own
    }
    
    // Calculate proceeds
    const proceeds = (quantity * price) - fees;
    const newCashBalance = state.cashBalance + proceeds;
    
    // Update position
    let newPositions: Position[];
    const remainingQuantity = position.quantity - quantity;
    
    if (remainingQuantity <= 0) {
      // Remove position entirely
      newPositions = state.positions.filter((_, i) => i !== positionIndex);
    } else {
      // Reduce position
      const currentValue = remainingQuantity * price;
      const pnl = currentValue - (position.avg_cost * remainingQuantity);
      
      newPositions = [...state.positions];
      newPositions[positionIndex] = {
        ...position,
        quantity: remainingQuantity,
        current_price: price,
        current_value: currentValue,
        pnl,
        pnl_percent: (pnl / (position.avg_cost * remainingQuantity)) * 100,
      };
    }
    
    // Calculate realized P&L for this sell
    const realizedPnl = (price - position.avg_cost) * quantity - fees;
    
    // Create trade record
    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      session_id: 'demo-session-1',
      user_id: 'demo-user',
      symbol,
      action: 'SELL',
      quantity,
      price,
      total_value: quantity * price,
      fees,
      timestamp: new Date().toISOString(),
      asset_type: position.asset_type,
      pnl: realizedPnl,
    };
    
    // Calculate new totals
    const positionsValue = newPositions.reduce((sum, p) => sum + p.current_value, 0);
    const newTotalValue = newCashBalance + positionsValue;
    const totalCostBasis = newPositions.reduce((sum, p) => sum + (p.avg_cost * p.quantity), 0);
    const newTotalPnl = newPositions.reduce((sum, p) => sum + p.pnl, 0);
    const newTotalPnlPercent = totalCostBasis > 0 ? (newTotalPnl / totalCostBasis) * 100 : 0;
    
    set({
      cashBalance: newCashBalance,
      positions: newPositions,
      trades: [newTrade, ...state.trades],
      totalValue: newTotalValue,
      totalPnl: newTotalPnl,
      totalPnlPercent: newTotalPnlPercent,
      allocations: calculateAllocations(newPositions, newCashBalance, newTotalValue),
    });
    
    return true;
  },
  
  // Update prices for all positions
  updatePrices: (prices: Record<string, number>) => {
    const state = get();
    
    const newPositions = state.positions.map(position => {
      const newPrice = prices[position.symbol] || prices[position.symbol.toUpperCase()] || position.current_price;
      const currentValue = position.quantity * newPrice;
      const pnl = currentValue - (position.avg_cost * position.quantity);
      
      return {
        ...position,
        current_price: newPrice,
        current_value: currentValue,
        pnl,
        pnl_percent: (pnl / (position.avg_cost * position.quantity)) * 100,
      };
    });
    
    const positionsValue = newPositions.reduce((sum, p) => sum + p.current_value, 0);
    const newTotalValue = state.cashBalance + positionsValue;
    const totalCostBasis = newPositions.reduce((sum, p) => sum + (p.avg_cost * p.quantity), 0);
    const newTotalPnl = newPositions.reduce((sum, p) => sum + p.pnl, 0);
    const newTotalPnlPercent = totalCostBasis > 0 ? (newTotalPnl / totalCostBasis) * 100 : 0;
    
    set({
      positions: newPositions,
      totalValue: newTotalValue,
      totalPnl: newTotalPnl,
      totalPnlPercent: newTotalPnlPercent,
      allocations: calculateAllocations(newPositions, state.cashBalance, newTotalValue),
    });
  },
  
  // Reset to initial state
  resetPortfolio: () => {
    set({
      cashBalance: INITIAL_CASH,
      positions: [],
      trades: [],
      totalValue: INITIAL_CASH,
      totalPnl: 0,
      totalPnlPercent: 0,
      allocations: [{
        symbol: 'Cash',
        value: INITIAL_CASH,
        percentage: 100,
        color: '#64748B',
        asset_type: 'cash' as AssetType,
      }],
    });
  },
}));

export default usePortfolioStore;

