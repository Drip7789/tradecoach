'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Brain, 
  MessageCircle, 
  Settings,
  Sprout,
  Zap
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/insights', label: 'Insights', icon: Brain },
  { href: '/trading', label: 'Trade', icon: TrendingUp, isMain: true },
  { href: '/coach', label: 'Coach', icon: MessageCircle },
  { href: '/growth', label: 'Growth', icon: Sprout },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-72 glass-card border-r border-ivoryBrown p-6 z-40 shadow-md">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-lime-400 border border-emerald-400/30 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Pine tree - three tiers */}
              <path d="M12 3L7 9h2L5 15h3l-2 5h12l-2-5h3l-4-6h2L12 3z" fill="rgba(255,255,255,0.95)" />
              {/* Trunk */}
              <rect x="10" y="20" width="4" height="2" rx="0.5" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-theme-main tracking-tight">Money Trees</h1>
            <p className="text-xs text-theme-accent font-medium">Discipline Compounds</p>
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
                    ? 'bg-blueSmoke text-white border border-blueSmoke ring-1 ring-blueSmoke/50 shadow-md shadow-blueSmoke/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-mild'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'group-hover:text-blueSmoke'}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-limeSoft pulse-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pro Card */}
        <div className="gradient-border p-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-limeSoft flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-theme-main">QHacks 2026</p>
              <p className="text-xs text-theme-muted">National Bank Challenge</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-ivoryBrown z-50">
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
                      ? 'bg-blueSmoke glow-purple' 
                      : 'bg-ivoryBrown hover:bg-blueSmoke'
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
                className={`flex flex-col items-center py-2 px-4 rounded-xl border transition-all duration-300 ${
                  isActive
                    ? 'text-blueSmoke bg-mild border-blueSmoke shadow-sm'
                    : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-theme-surface-2'
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
