import React, { useState } from 'react';
import { NavigationTab, ApplicationMode } from '../types.ts';
import { 
  Activity, 
  ShieldAlert, 
  Cpu, 
  TrendingUp, 
  FlaskConical, 
  Layers, 
  Terminal, 
  Server,
  AlertTriangle,
  Lock,
  Settings
} from 'lucide-react';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  mode: ApplicationMode;
  onModeChange: (newMode: ApplicationMode) => void;
  killSwitchActive: boolean;
  onToggleKillSwitch: (active: boolean) => void;
  latencyMs: number;
  liveTradingEnabledEnv: boolean;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  mode,
  onModeChange,
  killSwitchActive,
  onToggleKillSwitch,
  latencyMs,
  liveTradingEnabledEnv,
  onOpenSettings,
}) => {
  const [showKillSwitchConfirm, setShowKillSwitchConfirm] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);

  const tabs: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'Overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'Trade', label: 'Trade', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'Research', label: 'Research', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'Strategies', label: 'Strategies', icon: <Layers className="w-4 h-4" /> },
    { id: 'System', label: 'System', icon: <Server className="w-4 h-4" /> },
  ];

  const getModeColor = (m: ApplicationMode) => {
    switch (m) {
      case 'RESEARCH': return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'BACKTEST': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'PAPER': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'LIVE_ARMED': return 'bg-orange-500/20 text-orange-400 border-orange-500/50 animate-pulse';
      case 'LIVE': return 'bg-rose-500/20 text-rose-400 border-rose-500/50 font-bold';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 flex items-center justify-between select-none sticky top-0 z-40">
      {/* Brand & Primary Navigation */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs tracking-wider">
            CDX
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-zinc-200 uppercase font-mono flex items-center gap-1.5">
              QUANT CORE <span className="text-[10px] text-zinc-500">v1.0</span>
            </div>
            <div className="text-[10px] text-zinc-500 leading-none">CoinDCX Futures Engine</div>
          </div>
        </div>

        {/* 5 Core Tabs Only */}
        <nav className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded-md border border-zinc-800/80">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Safety, Mode & Execution Controls */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>CoinDCX REST</span>
          <span className="text-zinc-600">|</span>
          <span>{latencyMs}ms</span>
        </div>

        {/* Current Mode Selector Badge */}
        <div className="relative">
          <button
            onClick={() => setShowModeSelect(!showModeSelect)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 cursor-pointer ${getModeColor(
              mode
            )}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            MODE: {mode}
          </button>

          {showModeSelect && (
            <div className="absolute right-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded-md shadow-2xl p-1.5 z-50 text-xs">
              <div className="text-[10px] uppercase font-mono text-zinc-500 px-2 py-1">Execution Modes</div>
              {(['RESEARCH', 'BACKTEST', 'PAPER', 'LIVE_ARMED'] as ApplicationMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onModeChange(m);
                    setShowModeSelect(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded font-mono text-xs flex items-center justify-between ${
                    mode === m ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <span>{m}</span>
                  {m === 'LIVE_ARMED' && !liveTradingEnabledEnv && (
                    <Lock className="w-3 h-3 text-zinc-500" />
                  )}
                </button>
              ))}
              {!liveTradingEnabledEnv && (
                <div className="mt-1 pt-1 border-t border-zinc-800 text-[10px] text-zinc-500 px-2 py-1 leading-tight">
                  LIVE locked in .env (LIVE_TRADING_ENABLED=false)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Platform Settings & Governance */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
          title="Platform Configuration, Credentials Status & Risk Gates"
        >
          <Settings className="w-3.5 h-3.5 text-sky-400" />
          <span>Config</span>
        </button>

        {/* Global Kill Switch */}
        <button
          onClick={() => setShowKillSwitchConfirm(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase border transition-all ${
            killSwitchActive
              ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse'
              : 'bg-zinc-900 text-rose-400 border-rose-900/60 hover:bg-rose-950/40 hover:border-rose-700'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          {killSwitchActive ? 'KILL SWITCH ACTIVE' : 'KILL SWITCH'}
        </button>
      </div>

      {/* Kill Switch Toggle Confirmation Modal */}
      {showKillSwitchConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="text-sm font-bold uppercase tracking-wider font-mono">
                {killSwitchActive ? 'Disarm Kill Switch?' : 'Activate Global Kill Switch?'}
              </div>
            </div>
            <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
              {killSwitchActive
                ? 'Disarming the kill switch will re-enable order intent processing according to the active execution mode and Risk Engine rules.'
                : 'Activating the Kill Switch immediately and unconditionally BLOCKS all new order intents and halts automated order submission across all strategies.'}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowKillSwitchConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onToggleKillSwitch(!killSwitchActive);
                  setShowKillSwitchConfirm(false);
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded text-white ${
                  killSwitchActive ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {killSwitchActive ? 'Confirm Disarm' : 'Confirm Kill Switch Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
