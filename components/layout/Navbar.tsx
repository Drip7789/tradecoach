'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Brain, 
  MessageCircle, 
  Settings,
  Zap
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/insights', label: 'Insights', icon: Brain },
  { href: '/trading', label: 'Trade', icon: TrendingUp, isMain: true },
  { href: '/coach', label: 'Coach', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-72 glass-card border-r border-white/5 p-6 z-40">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow-purple">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">BiasCoach</h1>
            <p className="text-xs text-slate-500">Trading Psychology</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-400' : 'group-hover:text-indigo-400'}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 pulse-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pro Card */}
        <div className="gradient-border p-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">QHacks 2026</p>
              <p className="text-xs text-slate-400">National Bank Challenge</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 z-50">
        <div className="flex justify-around items-center h-20 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            // Main trade button (center, elevated)
            if (item.isMain) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -mt-8"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 glow-purple' 
                      : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-indigo-500 hover:to-purple-600'
                  }`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">
                    {item.label}
                  </span>
                </Link>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-4 transition-all duration-300 ${
                  isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
