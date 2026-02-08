'use client';

import { useMemo } from 'react';
import { Trade } from '@/types';
import { BiasAnalysisResult } from '@/lib/services/biasDetector';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';

// Color palette
const COLORS = {
  profit: '#10B981',
  loss: '#EF4444',
  neutral: '#739187',
  background: '#D1BE97',
  grid: '#B3978D',
  text: '#2E3A35',
  accent: '#739187',
};

const PIE_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6'];

// ============================================
// 1. Cumulative P&L Chart
// ============================================
interface PnLChartProps {
  trades: Trade[];
  height?: number;
}

export function CumulativePnLChart({ trades, height = 200 }: PnLChartProps) {
  const data = useMemo(() => {
    const sorted = [...trades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let cumulative = 0;
    return sorted.map((trade, idx) => {
      cumulative += trade.pnl || 0;
      return {
        index: idx + 1,
        date: new Date(trade.timestamp).toLocaleDateString(),
        pnl: cumulative,
        tradePnl: trade.pnl || 0,
      };
    });
  }, [trades]);

  if (trades.length === 0) return null;

  const minPnl = data.reduce((min, d) => d.pnl < min ? d.pnl : min, data[0]?.pnl ?? 0);
  const maxPnl = data.reduce((max, d) => d.pnl > max ? d.pnl : max, data[0]?.pnl ?? 0);
  const isPositive = data[data.length - 1]?.pnl >= 0;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3">Cumulative P&L</h4>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? COLORS.profit : COLORS.loss} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isPositive ? COLORS.profit : COLORS.loss} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis 
            dataKey="index" 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
            domain={[minPnl * 1.1, maxPnl * 1.1]}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
            labelStyle={{ color: COLORS.text }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
          />
          <Area 
            type="monotone" 
            dataKey="pnl" 
            stroke={isPositive ? COLORS.profit : COLORS.loss}
            fill="url(#pnlGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 2. Win/Loss Distribution Pie Chart
// ============================================
interface WinLossChartProps {
  trades: Trade[];
  height?: number;
}

export function WinLossChart({ trades, height = 200 }: WinLossChartProps) {
  const data = useMemo(() => {
    const wins = trades.filter(t => (t.pnl || 0) > 0).length;
    const losses = trades.filter(t => (t.pnl || 0) < 0).length;
    const breakeven = trades.filter(t => (t.pnl || 0) === 0).length;
    
    return [
      { name: 'Wins', value: wins, color: COLORS.profit },
      { name: 'Losses', value: losses, color: COLORS.loss },
      ...(breakeven > 0 ? [{ name: 'Breakeven', value: breakeven, color: '#F59E0B' }] : []),
    ].filter(d => d.value > 0);
  }, [trades]);

  if (trades.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3">Win/Loss Distribution</h4>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 3. Trading Frequency by Hour Heatmap
// ============================================
interface FrequencyChartProps {
  trades: Trade[];
  height?: number;
}

export function TradingFrequencyChart({ trades, height = 200 }: FrequencyChartProps) {
  const data = useMemo(() => {
    const hourCounts: Record<number, { trades: number; pnl: number }> = {};
    
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = { trades: 0, pnl: 0 };
    }
    
    trades.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours();
      hourCounts[hour].trades++;
      hourCounts[hour].pnl += trade.pnl || 0;
    });
    
    return Object.entries(hourCounts).map(([hour, data]) => ({
      hour: `${hour}:00`,
      trades: data.trades,
      pnl: data.pnl,
      avgPnl: data.trades > 0 ? data.pnl / data.trades : 0,
    }));
  }, [trades]);

  if (trades.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3">Trading by Hour</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis 
            dataKey="hour" 
            stroke={COLORS.text}
            tick={{ fontSize: 9 }}
            interval={2}
          />
          <YAxis 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              name === 'trades' ? value : `$${value.toFixed(2)}`,
              name === 'trades' ? 'Trades' : 'Avg P&L'
            ]}
          />
          <Bar dataKey="trades" fill={COLORS.neutral} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 4. Bias Radar Chart
// ============================================
interface BiasRadarProps {
  analysis: BiasAnalysisResult;
  height?: number;
}

export function BiasRadarChart({ analysis, height = 250 }: BiasRadarProps) {
  const data = useMemo(() => {
    const biasLabels: Record<string, string> = {
      'overtrading': 'Overtrading',
      'loss_aversion': 'Loss Aversion',
      'revenge_trading': 'Revenge',
      'disposition_effect': 'Disposition',
      'risk_escalation': 'Risk Escalation',
      'overconfidence': 'Overconfidence',
      'concentration_bias': 'Concentration',
      'fee_drag': 'Fee Drag',
      'churn': 'Churn',
    };
    
    return analysis.biases.map(bias => ({
      bias: biasLabels[bias.bias_type] || bias.bias_type,
      score: bias.score,
      fullMark: 100,
    }));
  }, [analysis]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3">Bias Profile</h4>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={COLORS.grid} />
          <PolarAngleAxis 
            dataKey="bias" 
            tick={{ fontSize: 10, fill: COLORS.text }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fontSize: 9, fill: COLORS.text }}
          />
          <Radar
            name="Bias Score"
            dataKey="score"
            stroke={COLORS.accent}
            fill={COLORS.accent}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value}%`, 'Severity']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 5. Trade Size Over Time
// ============================================
interface TradeSizeChartProps {
  trades: Trade[];
  height?: number;
}

export function TradeSizeChart({ trades, height = 200 }: TradeSizeChartProps) {
  const data = useMemo(() => {
    const sorted = [...trades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return sorted.map((trade, idx) => ({
      index: idx + 1,
      size: trade.total_value,
      isLoss: (trade.pnl || 0) < 0,
    }));
  }, [trades]);

  if (trades.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3">Position Size Over Time</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis 
            dataKey="index" 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Position Size']}
          />
          <Bar 
            dataKey="size" 
            radius={[2, 2, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isLoss ? COLORS.loss : COLORS.profit} 
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 6. P&L by Asset
// ============================================
interface AssetPnLChartProps {
  trades: Trade[];
  height?: number;
}

export function AssetPnLChart({ trades, height = 200 }: AssetPnLChartProps) {
  const data = useMemo(() => {
    const assetPnL: Record<string, { pnl: number; trades: number }> = {};
    
    trades.forEach(trade => {
      if (!trade.symbol) return;
      if (!assetPnL[trade.symbol]) {
        assetPnL[trade.symbol] = { pnl: 0, trades: 0 };
      }
      assetPnL[trade.symbol].pnl += trade.pnl || 0;
      assetPnL[trade.symbol].trades++;
    });
    
    return Object.entries(assetPnL)
      .map(([symbol, data]) => ({
        symbol,
        pnl: data.pnl,
        trades: data.trades,
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8); // Top 8 assets
  }, [trades]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3">P&L by Asset</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis 
            type="number"
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
          />
          <YAxis 
            type="category"
            dataKey="symbol"
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
            width={50}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              `$${value.toFixed(2)}`,
              name === 'pnl' ? 'P&L' : 'Trades'
            ]}
          />
          <Bar 
            dataKey="pnl" 
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.pnl >= 0 ? COLORS.profit : COLORS.loss} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 7. Drawdown Chart
// ============================================
interface DrawdownChartProps {
  trades: Trade[];
  height?: number;
}

export function DrawdownChart({ trades, height = 200 }: DrawdownChartProps) {
  const data = useMemo(() => {
    const sorted = [...trades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let cumulative = 0;
    let peak = 0;
    
    return sorted.map((trade, idx) => {
      cumulative += trade.pnl || 0;
      peak = Math.max(peak, cumulative);
      const drawdown = peak > 0 ? ((cumulative - peak) / peak) * 100 : 0;
      
      return {
        index: idx + 1,
        drawdown: Math.min(0, drawdown),
        cumulative,
      };
    });
  }, [trades]);

  if (trades.length === 0) return null;

  const maxDrawdown = data.reduce((min, d) => d.drawdown < min ? d.drawdown : min, data[0]?.drawdown ?? 0);

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-1">Drawdown</h4>
      <p className="text-red-400 text-sm mb-3">Max: {maxDrawdown.toFixed(1)}%</p>
      <ResponsiveContainer width="100%" height={height - 30}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.loss} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.loss} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis 
            dataKey="index" 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
            domain={[maxDrawdown * 1.2, 0]}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
          />
          <Area 
            type="monotone" 
            dataKey="drawdown" 
            stroke={COLORS.loss}
            fill="url(#drawdownGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 8. Streak Analysis Chart
// ============================================
interface StreakChartProps {
  trades: Trade[];
  height?: number;
}

export function StreakChart({ trades, height = 150 }: StreakChartProps) {
  const data = useMemo(() => {
    const sorted = [...trades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const streaks: { type: 'win' | 'loss'; length: number; pnl: number }[] = [];
    let currentType: 'win' | 'loss' | null = null;
    let currentLength = 0;
    let currentPnl = 0;
    
    sorted.forEach(trade => {
      const isWin = (trade.pnl || 0) > 0;
      const type = isWin ? 'win' : 'loss';
      
      if (type === currentType) {
        currentLength++;
        currentPnl += trade.pnl || 0;
      } else {
        if (currentType !== null) {
          streaks.push({ type: currentType, length: currentLength, pnl: currentPnl });
        }
        currentType = type;
        currentLength = 1;
        currentPnl = trade.pnl || 0;
      }
    });
    
    if (currentType !== null) {
      streaks.push({ type: currentType, length: currentLength, pnl: currentPnl });
    }
    
    return streaks.slice(-15); // Last 15 streaks
  }, [trades]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-white font-medium mb-3">Win/Loss Streaks</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            stroke={COLORS.text}
            tick={{ fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: COLORS.background, 
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              name === 'length' ? `${value} trades` : `$${value.toFixed(2)}`,
              name === 'length' ? 'Streak Length' : 'P&L'
            ]}
          />
          <Bar 
            dataKey="length" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.type === 'win' ? COLORS.profit : COLORS.loss} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
