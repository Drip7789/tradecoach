'use client';

import { useMemo, useState } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import useBehaviorReport from '@/hooks/useBehaviorReport';
import { formatCurrency, formatCompact, formatPercent } from '@/lib/utils/formatters';
import { getScoreColor } from '@/constants/colors';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
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

const NATURAL_CHART_PALETTE = [
  '#739187',
  '#7FBF87',
  '#AFC99B',
  '#8AA88D',
  '#B3978D',
  '#D1BE97',
];

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
        style={{ filter: 'drop-shadow(0 0 12px rgba(127, 191, 135, 0.55))' }}
      />
    </g>
  );
};

export default function HomePage() {
  const { totalValue, totalPnl, totalPnlPercent, cashBalance, positions, allocations, trades, portfolioHistory } = usePortfolioStore();
  const { report } = useBehaviorReport();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartTab, setChartTab] = useState<'allocation' | 'performance'>('allocation');

  const disciplineScore = report?.disciplineScore ?? 100;
  const scoreColor = getScoreColor(disciplineScore);

  const maxAllocation = allocations.length > 0 
    ? Math.max(...allocations.map(a => a.percentage)) 
    : 100;
  const diversityScore = Math.round(100 - maxAllocation);

  // Add cash to allocations for the chart with a consistent natural palette.
  const chartData = useMemo(() => {
    const safeTotal = totalValue > 0 ? totalValue : 1;
    const cashAllocation = (cashBalance / safeTotal) * 100;
    const isCashSymbol = (symbol?: string) => (symbol || '').trim().toLowerCase() === 'cash';

    if (allocations.length > 0) {
      const nonCashAllocations = allocations.filter((allocation) => !isCashSymbol(allocation.symbol));
      const existingCashAllocation = allocations
        .filter((allocation) => isCashSymbol(allocation.symbol))
        .reduce((sum, allocation) => sum + allocation.percentage, 0);
      const effectiveCashAllocation = existingCashAllocation > 0 ? existingCashAllocation : cashAllocation;

      const mappedAllocations = nonCashAllocations.map((allocation, index) => ({
        ...allocation,
        color: NATURAL_CHART_PALETTE[index % NATURAL_CHART_PALETTE.length],
        value: allocation.percentage,
        actualValue: (allocation.percentage / 100) * totalValue,
      }));

      return [
        ...mappedAllocations,
        ...(effectiveCashAllocation > 1
          ? [{
              symbol: 'Cash',
              value: effectiveCashAllocation,
              percentage: effectiveCashAllocation,
              color: '#8B9A8A',
              actualValue: cashBalance,
            }]
          : []),
      ];
    }

    return [{
      symbol: 'Cash',
      value: 100,
      percentage: 100,
      color: '#8B9A8A',
      actualValue: cashBalance,
    }];
  }, [allocations, cashBalance, totalValue]);

  const hoveredData = activeIndex !== null ? chartData[activeIndex] : null;
  const performanceData = useMemo(
    () =>
      portfolioHistory.map((point) => ({
        t: point.t,
        time: new Date(point.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        equity: point.equity,
      })),
    [portfolioHistory]
  );

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-main mb-1">Dashboard</h1>
        <p className="text-theme-muted">Golden Era: discipline and sustainable habits over dopamine.</p>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Portfolio Value */}
        <div className="col-span-2 stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blueSmoke/15 border border-theme-soft flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blueSmoke" />
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
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-gradient-to-br from-limeSoft/35 via-blueSmoke/20 to-transparent blur-3xl" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-theme-main">
                {chartTab === 'allocation' ? 'Portfolio Allocation' : 'Portfolio Performance'}
              </h2>
              <PieChartIcon className="w-5 h-5 text-theme-accent" />
            </div>
            <div className="flex items-center gap-2 p-1 rounded-xl bg-theme-surface-2 border border-theme-soft">
              <button
                onClick={() => setChartTab('allocation')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  chartTab === 'allocation'
                    ? 'bg-blueSmoke text-white shadow-sm'
                    : 'text-theme-muted hover:text-theme-main'
                }`}
              >
                Allocation
              </button>
              <button
                onClick={() => setChartTab('performance')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  chartTab === 'performance'
                    ? 'bg-blueSmoke text-white shadow-sm'
                    : 'text-theme-muted hover:text-theme-main'
                }`}
              >
                Performance
              </button>
            </div>
          </div>

          {chartTab === 'allocation' ? (
            <>
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
                        stroke="rgba(236, 240, 204, 0.9)"
                        strokeWidth={2}
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
                            style={{ cursor: 'pointer', outline: 'none', filter: 'drop-shadow(0 0 6px rgba(115, 145, 135, 0.25))' }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="px-4 py-2 rounded-xl border border-theme-soft bg-theme-surface shadow-md">
                    <p className="text-3xl font-bold text-theme-main">{formatCompact(totalValue)}</p>
                  </div>
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
                      activeIndex === index
                        ? 'bg-mild border border-theme-soft shadow-md'
                        : 'hover:bg-theme-surface-2 border border-transparent'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-theme-main text-sm flex-1 truncate">{item.symbol}</span>
                    <span className="text-theme-muted text-sm">{item.percentage?.toFixed(1)}%</span>
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
                        <p className="text-theme-main font-semibold">{hoveredData.symbol}</p>
                        <p className="text-theme-muted text-sm">
                          {formatCurrency(hoveredData.actualValue || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">
                        {hoveredData.percentage?.toFixed(1)}%
                      </p>
                      <p className="text-theme-muted text-xs">of portfolio</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-theme-muted text-sm text-center">Hover over chart to see details</p>
                )}
              </div>
            </>
          ) : performanceData.length < 2 ? (
            <p className="text-theme-muted text-sm py-16 text-center">
              Performance history will appear as live prices update.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(179, 151, 141, 0.35)" />
                  <XAxis dataKey="time" tick={{ fill: '#51615A', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: '#51615A', fontSize: 11 }}
                    tickFormatter={(value) => formatCompact(Number(value))}
                    width={68}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#DEE2C7',
                      border: '1px solid #B3978D',
                      borderRadius: 10,
                      color: '#2E3A35',
                    }}
                    formatter={(value: number) => [formatCurrency(Number(value)), 'Equity']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#739187"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#7FBF87' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
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
              <div className="w-16 h-2 bg-theme-surface-2 border border-theme-soft rounded-full overflow-hidden shrink-0">
                <div className="h-full rounded-full transition-all" 
                     style={{ width: `${disciplineScore}%`, backgroundColor: scoreColor }} />
              </div>
            </div>
          </div>

          {/* Diversity Card */}
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blueSmoke/15 flex items-center justify-center shrink-0">
                <PieChartIcon className="w-6 h-6 text-blueSmoke" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">+{diversityScore} Diversity</p>
                <p className="text-slate-400 text-sm">{positions.length} assets in portfolio</p>
              </div>
              <div className="w-16 h-2 bg-theme-surface-2 border border-theme-soft rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-blueSmoke rounded-full" style={{ width: `${diversityScore}%` }} />
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
                  <div className="w-10 h-10 rounded-xl bg-blueSmoke/15 border border-theme-soft flex items-center justify-center">
                    <span className="text-sm font-bold text-blueSmoke">
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
