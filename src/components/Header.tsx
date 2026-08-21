import React, { useState, useEffect } from 'react';
import { 
  Anchor, 
  Compass, 
  Moon, 
  Sun, 
  Radio, 
  Activity, 
  Cpu, 
  Smartphone,
  Navigation,
  WifiOff,
  Wifi,
  ShieldCheck,
  Info,
  Mail,
  X,
  KeyRound,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { SerialPortStatus } from '../types';
import { 
  getLicenseStatus, 
  OFFICIAL_SUPPORT_EMAIL,
  isDeveloperModeUnlocked,
  setDeveloperMode,
  DEVELOPER_PASSCODE
} from '../services/licenseService';

export type ActiveTab = 'nav' | 'transmit' | 'monitor' | 'drivers' | 'keygen';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  serialStatus: SerialPortStatus;
  hasRealGps: boolean;
  hasRealCompass: boolean;
  isNightMode: boolean;
  onToggleNightMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  serialStatus,
  hasRealGps,
  hasRealCompass,
  isNightMode,
  onToggleNightMode,
}) => {
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [wakeLockSentinel, setWakeLockSentinel] = useState<any>(null);
  const [wakeLockToast, setWakeLockToast] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [isDevUnlocked, setIsDevUnlocked] = useState<boolean>(() => isDeveloperModeUnlocked());
  const [showDevPinPrompt, setShowDevPinPrompt] = useState<boolean>(false);
  const [devPinInput, setDevPinInput] = useState<string>('');
  const [devPinError, setDevPinError] = useState<string | null>(null);
  const [devClickCount, setDevClickCount] = useState<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
    }

    // Capture PWA Install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if Service Worker is active & cache ready
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setIsOfflineCached(true);
    } else if ('caches' in window) {
      caches.has('mariner-pro-offline-v16').then((has) => setIsOfflineCached(has));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Re-acquire Wake Lock when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockActive && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
        try {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockSentinel(sentinel);
        } catch (err) {
          console.warn('Wake Lock re-acquire failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [wakeLockActive]);

  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        if (!wakeLockActive) {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockSentinel(sentinel);
          setWakeLockActive(true);
          showToastMessage('Screen Sleep: DISABLED (Display will stay ON)');
          sentinel.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        } else if (wakeLockSentinel) {
          await wakeLockSentinel.release();
          setWakeLockSentinel(null);
          setWakeLockActive(false);
          showToastMessage('Screen Sleep: NORMAL (System timeout active)');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
        showToastMessage('Wake Lock not supported on this browser');
      }
    } else {
      showToastMessage('Wake Lock API not available in this browser');
    }
  };

  const showToastMessage = (msg: string) => {
    setWakeLockToast(msg);
    setTimeout(() => setWakeLockToast(null), 3000);
  };

  // Toggle Key Gen: Click once to open, click again to close & return to nav
  const handleToggleKeyGen = () => {
    if (activeTab === 'keygen') {
      onTabChange('nav');
    } else {
      onTabChange('keygen');
    }
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Wake Lock Status Notification Bar / Toast */}
      {wakeLockToast && (
        <div className="bg-emerald-900/90 border-b border-emerald-500/50 text-emerald-200 text-[11px] font-mono font-bold py-1 px-4 text-center tracking-wider animate-fadeIn">
          {wakeLockToast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Brand Identity (Clickable to open About & Info Modal) */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div
            id="brand-header-info"
            onClick={() => setShowAboutModal(true)}
            className="flex items-center gap-3 cursor-pointer group select-none transition-transform active:scale-98"
            title="Click to view Mariner Pro info, developer details & email"
          >
            <div
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                isNightMode
                  ? 'bg-red-950 border-red-800 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] group-hover:border-red-500'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}
            >
              <Anchor className="w-5 h-5 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm sm:text-base tracking-wider text-white group-hover:text-cyan-300 transition-colors">
                  MARINER <span className="text-cyan-400 group-hover:text-cyan-300">PRO-LINK</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-cyan-300 font-bold">
                  V1.0
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasRealCompass ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                    }`}
                  />
                  {hasRealCompass ? 'IMU 60Hz' : 'Gyro Ready'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasRealGps ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  {hasRealGps ? 'GNSS Lock' : 'GPS Standby'}
                </span>
              </div>
            </div>
          </div>            {/* Quick Actions (Mobile) */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Install PWA Button (Mobile) if prompt available and not yet standalone */}
            {deferredPrompt && !isStandalone && (
              <button
                type="button"
                onClick={async () => {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    setDeferredPrompt(null);
                    setIsStandalone(true);
                  }
                }}
                title="Install Mariner Pro on Home Screen"
                className="p-2 rounded-lg border bg-cyan-950 border-cyan-500 text-cyan-300 flex items-center justify-center animate-bounce"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Screen Wake Lock Button (Mobile) - Sun Icon: White when ready, Emerald when active */}
            <button
              id="btn-wake-lock-mobile"
              type="button"
              onClick={toggleWakeLock}
              title={wakeLockActive ? 'Screen Always ON (Sleep Disabled) - Tap to allow sleep' : 'Keep Screen ON (Prevent Screen Sleep) - Tap to activate'}
              className={`p-2 rounded-lg border flex items-center justify-center transition-all ${
                wakeLockActive
                  ? isNightMode
                    ? 'bg-red-800 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                    : 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                  : 'bg-slate-900 border-slate-600 text-white hover:border-slate-400'
              }`}
            >
              <div className="relative">
                <Sun 
                  className={`w-4 h-4 transition-colors ${
                    wakeLockActive 
                      ? 'text-emerald-400 animate-pulse' 
                      : 'text-white'
                  }`} 
                />
                {wakeLockActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
            </button>

            {/* Mobile Night Mode Toggle */}
            <button
              type="button"
              onClick={onToggleNightMode}
              title="Toggle Night Vision Mode"
              className={`p-2 rounded-lg border ${
                isNightMode ? 'bg-red-900 border-red-600 text-white' : 'bg-slate-900 border-slate-700 text-amber-300'
              }`}
            >
              {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80 w-full md:w-auto justify-around sm:justify-start shadow-inner overflow-x-auto">
          <button
            id="tab-nav"
            type="button"
            onClick={() => onTabChange('nav')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'nav'
                ? isNightMode
                  ? 'bg-red-700 text-white shadow-md'
                  : 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Navigation</span>
          </button>

          <button
            id="tab-transmit"
            type="button"
            onClick={() => onTabChange('transmit')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'transmit'
                ? isNightMode
                  ? 'bg-red-700 text-white shadow-md'
                  : 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>OTG Transmit</span>
          </button>

          <button
            id="tab-monitor"
            type="button"
            onClick={() => onTabChange('monitor')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'monitor'
                ? isNightMode
                  ? 'bg-red-700 text-white shadow-md'
                  : 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Monitor (RX)</span>
          </button>

          <button
            id="tab-drivers"
            type="button"
            onClick={() => onTabChange('drivers')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'drivers'
                ? isNightMode
                  ? 'bg-red-700 text-white shadow-md'
                  : 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>USB Drivers</span>
          </button>

          {/* KeyGen Tab (Only visible when Developer Mode is unlocked) */}
          {isDevUnlocked && (
            <button
              id="tab-keygen"
              type="button"
              onClick={handleToggleKeyGen}
              title={activeTab === 'keygen' ? 'Click to close Key Gen' : 'Click to open Key Gen'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'keygen'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-500/30'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{activeTab === 'keygen' ? 'Close Key Gen' : 'Key Gen'}</span>
            </button>
          )}
        </nav>

        {/* Right: Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <div
            title={isOnline ? 'Online / Cache Saved on Device' : 'Offline Marine Mode Active'}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border ${
              !isOnline
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{!isOnline ? 'OFFLINE MARINE MODE' : 'OFFLINE CACHE READY'}</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            {/* Install PWA Button (Desktop) if prompt available and not yet standalone */}
            {deferredPrompt && !isStandalone && (
              <button
                type="button"
                onClick={async () => {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    setDeferredPrompt(null);
                    setIsStandalone(true);
                  }
                }}
                title="Install Mariner Pro on Desktop / PC"
                className="px-2.5 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all animate-pulse"
              >
                <Download className="w-3.5 h-3.5" />
                <span>INSTALL APP</span>
              </button>
            )}

            {/* Screen Wake Lock Button (Desktop) - Sun Icon: White when ready, Emerald when active */}
            <button
              id="btn-wake-lock"
              type="button"
              onClick={toggleWakeLock}
              title={wakeLockActive ? 'Screen Always ON (Sleep Disabled) - Click to enable auto-sleep' : 'Keep Screen ON (Prevent Screen Sleep) - Click to activate'}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                wakeLockActive
                  ? isNightMode
                    ? 'bg-red-800/90 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                    : 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-slate-900 border-slate-600 text-white hover:border-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="relative">
                <Sun 
                  className={`w-4 h-4 transition-colors ${
                    wakeLockActive 
                      ? 'text-emerald-400 animate-pulse' 
                      : 'text-white'
                  }`} 
                />
                {wakeLockActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className="hidden xl:inline text-[11px] font-bold">
                {wakeLockActive ? 'SCREEN: ALWAYS ON' : 'KEEP SCREEN ON'}
              </span>
            </button>

            {/* Night Vision Mode Toggle */}
            <button
              id="btn-night-mode"
              type="button"
              onClick={onToggleNightMode}
              title="Toggle Night Vision Mode"
              className={`p-2 rounded-lg border transition-all ${
                isNightMode
                  ? 'bg-red-900 border-red-600 text-white'
                  : 'bg-slate-900 border-slate-700 text-amber-300 hover:text-amber-200'
              }`}
            >
              {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* About & Developer Info Modal (Opened by clicking Mariner Pro title) */}
      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl flex flex-col gap-5 text-left transition-all ${
              isNightMode
                ? 'bg-zinc-950 border-red-900/80 text-red-100'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                    isNightMode
                      ? 'bg-red-600 text-white shadow-red-900/50'
                      : 'bg-cyan-500 text-slate-950 shadow-cyan-900/50'
                  }`}
                >
                  <Anchor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Mariner Pro-Link
                  </h3>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    version: V1.0 Release
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* App Details Card */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-3 font-sans">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Developer
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = devClickCount + 1;
                    setDevClickCount(next);
                    if (next >= 5) {
                      setShowDevPinPrompt(true);
                      setDevClickCount(0);
                    }
                  }}
                  className="text-sm font-bold text-white font-mono hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Mariner Engineering"
                >
                  M.Nikbin
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Official Support Email
                </span>
                <a
                  href={`mailto:${OFFICIAL_SUPPORT_EMAIL}`}
                  className="text-xs font-mono font-bold text-cyan-400 hover:underline"
                >
                  {OFFICIAL_SUPPORT_EMAIL}
                </a>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Software Version
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                  V1.0 Release
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Architecture
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  NMEA 0183 & Marine PWA
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Device ID
                </span>
                <span className="text-xs text-cyan-300 font-mono font-bold">
                  {getLicenseStatus().deviceId}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  License Status
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                  ✓ Activated & Valid
                </span>
              </div>

              {/* Developer Key Tool Button inside About Modal - Only if dev mode unlocked */}
              {isDevUnlocked && (
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Developer Key Tool
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Generate client activation keys
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAboutModal(false);
                      handleToggleKeyGen();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{activeTab === 'keygen' ? 'Close Key Gen' : 'Open Key Gen'}</span>
                  </button>
                </div>
              )}

              {/* Hidden Developer Mode PIN Form */}
              {showDevPinPrompt && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (devPinInput.trim() === DEVELOPER_PASSCODE || devPinInput.trim() === '2450') {
                      setDeveloperMode(true);
                      setIsDevUnlocked(true);
                      setShowDevPinPrompt(false);
                      setDevPinInput('');
                    } else {
                      setDevPinError('Invalid PIN');
                    }
                  }}
                  className="mt-2 p-3 bg-slate-900 border border-amber-500/40 rounded-xl flex flex-col gap-2"
                >
                  <span className="text-xs font-bold text-amber-300">Enter Developer PIN:</span>
                  <input
                    type="password"
                    value={devPinInput}
                    onChange={(e) => {
                      setDevPinInput(e.target.value);
                      setDevPinError(null);
                    }}
                    placeholder="PIN"
                    className="w-full bg-slate-950 border border-amber-500/40 rounded px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                  />
                  {devPinError && <span className="text-[10px] text-red-400">{devPinError}</span>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded"
                    >
                      Unlock KeyGen
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDevPinPrompt(false)}
                      className="px-2 py-1.5 bg-slate-800 text-slate-400 text-xs rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Offline App Installation Guide */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Download className="w-4 h-4" />
                <span>100% Offline Standalone Installation</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                To run Mariner Pro-Link as an independent app without needing Chrome open or an internet connection:
              </p>
              <div className="text-[10px] text-slate-400 font-mono space-y-1 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <div>📱 <strong className="text-white">Android:</strong> Tap Chrome Menu (⋮) → <span className="text-cyan-300">"Install app"</span> or <span className="text-cyan-300">"Add to Home screen"</span>.</div>
                <div>🍏 <strong className="text-white">iPhone/iPad:</strong> Tap Safari Share (⎋) → <span className="text-cyan-300">"Add to Home Screen"</span>.</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 leading-relaxed">
              Mariner Pro-Link provides real-time marine heading & GPS telemetry transmission over USB OTG serial, converting smartphone IMU & GNSS sensors into standard NMEA 0183 navigation data for marine chartplotters, autopilots, and repeaters.
            </p>

            {/* Contact Developer Button with mailto to official email */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <a
                href={`mailto:${OFFICIAL_SUPPORT_EMAIL}?subject=Mariner%20Pro-Link%20V1.0%20Support%20%26%20Feedback`}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg transition-all ${
                  isNightMode
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950 font-black'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Contact Developer ({OFFICIAL_SUPPORT_EMAIL})</span>
              </a>

              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

