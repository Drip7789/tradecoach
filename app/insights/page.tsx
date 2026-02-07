'use client';

import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { analyzeBiases } from '@/lib/services/biasDetector';
import { getBiasDefinition } from '@/constants/biasDefinitions';
import { getScoreColor, getSeverityColor } from '@/constants/colors';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Shield,
  ChevronRight,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';

export default function InsightsPage() {
  const { trades, positions } = usePortfolioStore();
  
  const analysis = analyzeBiases(trades, positions);
  const { biases, disciplineScore, summary } = analysis;
  const scoreColor = getScoreColor(disciplineScore);

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Insights</h1>
        <p className="text-slate-400">Your trading psychology analysis</p>
      </div>

      {/* Discipline Score Card */}
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Score Circle */}
          <div className="relative flex flex-col items-center">
            <div className="w-40 h-40 rounded-full flex items-center justify-center"
                 style={{ 
                   background: `conic-gradient(${scoreColor} ${disciplineScore * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                 }}>
              <div className="w-32 h-32 rounded-full bg-background-primary flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{disciplineScore}</span>
                <span className="text-slate-400 text-sm">/ 100</span>
              </div>
            </div>
            {/* Badge positioned below the circle */}
            <div className="mt-4 px-4 py-1.5 rounded-full text-sm font-medium"
                 style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}>
              {getScoreLabel(disciplineScore)}
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">Discipline Score</h2>
            <p className="text-slate-400 mb-6 max-w-md">
              {disciplineScore >= 80 
                ? "Outstanding! You're trading with excellent discipline and emotional control."
                : disciplineScore >= 60
                  ? "Good progress! A few areas need attention, but you're on the right track."
                  : "There's room for improvement. Let's work on building better trading habits."
              }
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-white">{trades.length} trades</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-white">{summary.criticalBiases + summary.highBiases} warnings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card text-center">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{summary.criticalBiases}</p>
          <p className="text-slate-400 text-xs mt-1">Critical</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <Target className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{summary.highBiases}</p>
          <p className="text-slate-400 text-xs mt-1">High</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {9 - summary.criticalBiases - summary.highBiases}
          </p>
          <p className="text-slate-400 text-xs mt-1">Healthy</p>
        </div>
      </div>

      {/* Biases List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Detected Patterns</h2>
          <Brain className="w-5 h-5 text-slate-400" />
        </div>
        
        {trades.length < 3 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Not enough data yet</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              Make at least 3 trades to unlock your personalized bias analysis and insights.
            </p>
          </div>
        ) : biases.filter(b => b.score > 20).length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Looking great!</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              No significant biases detected. Keep up the disciplined trading!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {biases.filter(b => b.score > 20).map((bias) => {
              const definition = getBiasDefinition(bias.bias_type);
              const severityColor = getSeverityColor(bias.severity);
              
              return (
                <div key={bias.id} className="glass-card glass-card-hover p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: `${severityColor}15` }}
                    >
                      {definition.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white">
                          {definition.name}
                        </h3>
                        <span 
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase"
                          style={{ backgroundColor: `${severityColor}20`, color: severityColor }}
                        >
                          {bias.severity}
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-sm mb-4">
                        {bias.intervention}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${bias.score}%`, backgroundColor: severityColor }}
                          />
                        </div>
                        <span className="text-slate-400 text-sm font-medium w-12 text-right">
                          {bias.score}%
                        </span>
                      </div>

                      {/* Interventions */}
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                          Suggested Actions
                        </p>
                        <ul className="space-y-2">
                          {definition.interventions.slice(0, 2).map((intervention, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                              <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                              {intervention}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
