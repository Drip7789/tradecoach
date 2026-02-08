'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import useBehaviorReport from '@/hooks/useBehaviorReport';
import { formatCurrency, formatCompact, formatPercent } from '@/lib/utils/formatters';
import { getScoreColor } from '@/constants/colors';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { 
  TrendingUp, 
  Shield, 
  PieChart as PieChartIcon,
  Activity,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Active shape renderer for hover effect
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}
      />
    </g>
  );
};

export default function HomePage() {
  const { totalValue, totalPnl, totalPnlPercent, cashBalance, positions, allocations, trades } = usePortfolioStore();
  const { report } = useBehaviorReport();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const disciplineScore = report?.disciplineScore ?? 100;
  const scoreColor = getScoreColor(disciplineScore);

  const maxAllocation = allocations.length > 0 
    ? Math.max(...allocations.map(a => a.percentage)) 
    : 100;
  const diversityScore = Math.round(100 - maxAllocation);

  // Add cash to allocations for the chart
  const cashAllocation = (cashBalance / totalValue) * 100;
  const chartData = allocations.length > 0 
    ? [
        ...allocations.map(a => ({ 
          ...a, 
          value: a.percentage,
          actualValue: (a.percentage / 100) * totalValue 
        })),
        ...(cashAllocation > 1 ? [{
          symbol: 'Cash',
          value: cashAllocation,
          percentage: cashAllocation,
          color: '#64748B',
          actualValue: cashBalance
        }] : [])
      ]
    : [{ symbol: 'Cash', value: 100, percentage: 100, color: '#64748B', actualValue: cashBalance }];

  const hoveredData = activeIndex !== null ? chartData[activeIndex] : null;

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-400">Golden Era: discipline and sustainable habits over dopamine.</p>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Portfolio Value */}
        <div className="col-span-2 stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-slate-400 text-sm">Portfolio Value</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              totalPnl >= 0 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {totalPnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {formatPercent(Math.abs(totalPnlPercent))}
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{formatCurrency(totalValue)}</p>
          <p className={`text-sm ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)} today
          </p>
        </div>

        {/* Cash Balance */}
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-slate-400 text-xs mb-1">Available</p>
          <p className="text-xl font-bold text-white">{formatCurrency(cashBalance, { compact: true })}</p>
        </div>

        {/* Discipline Score */}
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" 
               style={{ backgroundColor: `${scoreColor}20` }}>
            <Shield className="w-4 h-4" style={{ color: scoreColor }} />
          </div>
          <p className="text-slate-400 text-xs mb-1">Discipline</p>
          <p className="text-xl font-bold" style={{ color: scoreColor }}>{disciplineScore}/100</p>
        </div>
      </div>

      {/* Chart and Allocations */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Donut Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Portfolio Allocation</h2>
            <PieChartIcon className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="relative flex justify-center items-center">
            <div className="w-56 h-56 chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                    activeIndex={activeIndex !== null ? activeIndex : undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ cursor: 'pointer', outline: 'none' }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold text-white">{formatCompact(totalValue)}</p>
              <p className={`text-sm font-medium ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatPercent(totalPnlPercent)}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {chartData.slice(0, 6).map((item, index) => (
              <div 
                key={item.symbol} 
                className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer ${
                  activeIndex === index ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 text-sm flex-1 truncate">{item.symbol}</span>
                <span className="text-slate-500 text-sm">{item.percentage?.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Hover Info Panel - Shows below legend when hovering */}
          <div className={`mt-4 p-4 rounded-xl bg-white/5 border border-white/10 transition-all ${
            hoveredData ? 'opacity-100' : 'opacity-0'
          }`}>
            {hoveredData ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: hoveredData.color }} 
                  />
                  <div>
                    <p className="text-white font-semibold">{hoveredData.symbol}</p>
                    <p className="text-slate-400 text-sm">
                      {formatCurrency(hoveredData.actualValue || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">
                    {hoveredData.percentage?.toFixed(1)}%
                  </p>
                  <p className="text-slate-400 text-xs">of portfolio</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center">Hover over chart to see details</p>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-4">
          {/* Discipline Card */}
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                   style={{ backgroundColor: `${scoreColor}15` }}>
                <Shield className="w-6 h-6" style={{ color: scoreColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{disciplineScore}% Discipline Score</p>
                <p className="text-slate-400 text-sm">
                  {disciplineScore >= 80 ? 'Excellent trading habits' : 
                   disciplineScore >= 60 ? 'Good, room for improvement' : 
                   'Needs attention'}
                </p>
              </div>
              <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden shrink-0">
                <div className="h-full rounded-full transition-all" 
                     style={{ width: `${disciplineScore}%`, backgroundColor: scoreColor }} />
              </div>
            </div>
          </div>

          {/* Diversity Card */}
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                <PieChartIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">+{diversityScore} Diversity</p>
                <p className="text-slate-400 text-sm">{positions.length} assets in portfolio</p>
              </div>
              <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${diversityScore}%` }} />
              </div>
            </div>
          </div>

          {/* Activity Card */}
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{trades.length} Total Trades</p>
                <p className="text-slate-400 text-sm">This session</p>
              </div>
            </div>
          </div>

          {/* Risk Card */}
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                maxAllocation > 60 ? 'bg-red-500/15' : maxAllocation > 40 ? 'bg-amber-500/15' : 'bg-emerald-500/15'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  maxAllocation > 60 ? 'text-red-400' : maxAllocation > 40 ? 'text-amber-400' : 'text-emerald-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{Math.round(maxAllocation)}% Concentration</p>
                <p className="text-slate-400 text-sm">
                  {maxAllocation > 60 ? 'High risk - diversify!' : maxAllocation > 40 ? 'Moderate risk' : 'Well diversified'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Positions */}
      {positions.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Positions</h2>
          <div className="space-y-3">
            {positions.map((position) => (
              <div 
                key={position.symbol}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-400">
                      {position.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{position.symbol}</p>
                    <p className="text-slate-400 text-sm">{position.quantity} units</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{formatCurrency(position.current_value)}</p>
                  <p className={`text-sm flex items-center gap-1 justify-end ${
                    position.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {position.pnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {formatCurrency(Math.abs(position.pnl))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
