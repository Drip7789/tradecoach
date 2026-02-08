'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { usePortfolioStore } from '@/lib/stores/portfolioStore';
import { useGrowthStore } from '@/lib/stores/growthStore';
import { toast } from '@/components/shared/Toast';
import { 
  User, 
  Bell, 
  Shield, 
  Trash2, 
  RotateCcw,
  ChevronRight,
  Zap,
  Moon,
  Volume2,
  Info
} from 'lucide-react';

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, title, description, children, onClick, danger }: SettingRowProps) {
  const Wrapper = onClick ? 'button' : 'div';
  
  return (
    <Wrapper
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
        onClick ? 'hover:bg-white/5 cursor-pointer' : ''
      } ${danger ? 'hover:bg-red-500/10' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        danger ? 'bg-red-500/20' : 'bg-white/10'
      }`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className={`font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{title}</p>
        {description && <p className="text-slate-400 text-sm">{description}</p>}
      </div>
      {children || (onClick && <ChevronRight className="w-5 h-5 text-slate-400" />)}
    </Wrapper>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-12 h-7 rounded-full transition-all relative ${
        enabled ? 'bg-indigo-500' : 'bg-slate-600'
      }`}
    >
      <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${
        enabled ? 'left-6' : 'left-1'
      }`} />
    </button>
  );
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const resetPortfolio = usePortfolioStore((state) => state.resetPortfolio);
  const resetGrowth = useGrowthStore((state) => state.resetAll);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    resetPortfolio();
    setShowResetConfirm(false);
    toast.success('Portfolio Reset', 'Your portfolio has been reset to $100,000');
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      'Clear all app data? This will reset portfolio and Growth Mode progression.'
    );
    if (!confirmed) return;

    resetPortfolio();
    resetGrowth();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('biascoach-settings');
    }
    settings.setShowConnectionIndicator(true);
    toast.success('Data Cleared', 'All trades and settings have been deleted');
  };

  return (
    <div className="min-h-screen p-6 pb-28 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-main mb-1">Settings</h1>
        <p className="text-theme-muted">Customize your BiasCoach experience</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Paper Trader</h2>
            <p className="text-slate-400">QHacks 2026 Demo</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1 text-center p-4 rounded-xl bg-white/5">
            <p className="text-2xl font-bold text-white capitalize">{settings.riskLevel}</p>
            <p className="text-slate-400 text-xs">Risk Level</p>
          </div>
          <div className="flex-1 text-center p-4 rounded-xl bg-white/5">
            <p className="text-2xl font-bold text-emerald-400">Demo</p>
            <p className="text-slate-400 text-xs">Mode</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Preferences */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Preferences</p>
          </div>
          
          <div className="divide-y divide-white/5">
            <SettingRow
              icon={<Moon className="w-5 h-5 text-indigo-400" />}
              title="Dark Mode"
              description="Always on for trading focus"
            >
              <Toggle enabled={true} onChange={() => {}} />
            </SettingRow>
            
            <SettingRow
              icon={<Bell className="w-5 h-5 text-amber-400" />}
              title="Bias Alerts"
              description="Get notified when biases are detected"
            >
              <Toggle 
                enabled={settings.notificationsEnabled} 
                onChange={settings.toggleNotifications} 
              />
            </SettingRow>
            
            <SettingRow
              icon={<Volume2 className="w-5 h-5 text-emerald-400" />}
              title="Sound Effects"
              description="Audio feedback for trades"
            >
              <Toggle enabled={true} onChange={() => {}} />
            </SettingRow>
          </div>
        </div>

        {/* Risk Settings */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Risk Management</p>
          </div>
          
          <div className="p-4">
            <SettingRow
              icon={<Shield className="w-5 h-5 text-indigo-400" />}
              title="Risk Level"
              description="Adjust your trading risk tolerance"
            />
            
            <div className="flex gap-3 mt-4 ml-14">
              {['conservative', 'moderate', 'aggressive'].map((level) => (
                <button
                  key={level}
                  onClick={() => settings.setRiskLevel(level as 'conservative' | 'moderate' | 'aggressive')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                    settings.riskLevel === level
                      ? level === 'conservative'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : level === 'moderate'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data & Reset */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Data</p>
          </div>
          
          <div className="divide-y divide-white/5">
            <SettingRow
              icon={<RotateCcw className="w-5 h-5 text-amber-400" />}
              title="Reset Portfolio"
              description="Start fresh with $100,000"
              onClick={() => setShowResetConfirm(true)}
            />
            
            <SettingRow
              icon={<Trash2 className="w-5 h-5 text-red-400" />}
              title="Clear All Data"
              description="Delete all trades and settings"
              danger
              onClick={handleClearAll}
            />
          </div>
        </div>

        {/* About */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">About</p>
          </div>
          
          <div className="divide-y divide-white/5">
            <SettingRow
              icon={<Info className="w-5 h-5 text-slate-400" />}
              title="BiasCoach v1.0"
              description="Built for QHacks 2026"
            />
            <SettingRow
              icon={<Zap className="w-5 h-5 text-amber-400" />}
              title="National Bank Challenge"
              description="Bias Detector Edition"
            />
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Reset Portfolio?</h3>
            <p className="text-slate-400 text-center mb-6">
              This will clear all your trades and reset your balance to $100,000.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-amber-500/30 transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
