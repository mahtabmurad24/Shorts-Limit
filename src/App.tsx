import React, { useState, useEffect, useRef } from 'react';
import { ExtensionState, LimitEvaluation } from './types/extension';
import { SimulatedYouTube } from './components/SimulatedYouTube';
import { SimulatedPopup } from './components/SimulatedPopup';
import { CodeInspector } from './components/CodeInspector';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { downloadExtensionZip } from './utils/zipExporter';
import {
  FolderArchive,
  PlaySquare,
  FileCode,
  BookOpen,
  Sparkles,
  FastForward,
  RotateCcw,
  SunMedium,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'docs'>('simulator');
  const [isDownloading, setIsDownloading] = useState(false);

  // Simulated extension state (mimicking chrome.storage.local)
  const [state, setState] = useState<ExtensionState>({
    enabled: true,
    limitMode: 'both',          // 'both' | 'time' | 'shorts'
    dailyTimeLimitSeconds: 900, // 15 minutes
    dailyShortsLimit: 30,       // 30 shorts
    usedSeconds: 452,          // ~7:32 used to match prompt mockup
    shortsWatched: 18,         // 18 shorts watched
    lastResetDate: '2026-09-09',
    currentShortId: 'ABC123_cyber',
    emergencyUnlocked: false,
    emergencyUnlockDate: '',
  });

  // Simulated browser environment states
  const [activeShortIndex, setActiveShortIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('www.youtube.com/shorts/ABC123_cyber');
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isTabFocused, setIsTabFocused] = useState(true);

  // Evaluate blocking condition
  const evaluateLimits = (st: ExtensionState): LimitEvaluation => {
    if (!st.enabled) return { blocked: false, reason: null };

    if (st.emergencyUnlocked && st.emergencyUnlockDate === st.lastResetDate) {
      return { blocked: false, reason: null, emergencyUnlocked: true };
    }

    const mode = st.limitMode || 'both';
    const checkTime = mode === 'both' || mode === 'time';
    const checkShorts = mode === 'both' || mode === 'shorts';

    const timeExceeded = checkTime && st.usedSeconds >= st.dailyTimeLimitSeconds;
    const shortsExceeded = checkShorts && st.shortsWatched >= st.dailyShortsLimit;

    if (timeExceeded && shortsExceeded) {
      return { blocked: true, reason: 'both' };
    }
    if (timeExceeded) {
      return { blocked: true, reason: 'time' };
    }
    if (shortsExceeded) {
      return { blocked: true, reason: 'shorts' };
    }

    return { blocked: false, reason: null };
  };

  const evaluation = evaluateLimits(state);

  // Real-time ticking effect: increments usedSeconds by 1 every second
  // ONLY if on Shorts, visible, focused, and not blocked (or emergency unlocked)
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const isShorts = currentUrl.includes('/shorts/');
        const currentEval = evaluateLimits(prev);

        if (
          prev.enabled &&
          isShorts &&
          isTabVisible &&
          isTabFocused &&
          (!currentEval.blocked || prev.emergencyUnlocked)
        ) {
          return {
            ...prev,
            usedSeconds: prev.usedSeconds + 1,
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUrl, isTabVisible, isTabFocused]);

  // Navigate between Shorts (SPA navigation)
  const SHORT_IDS = ['ABC123_cyber', 'DEF456_urban', 'GHI789_coffee', 'JKL101_design'];

  const handleNavigateShort = (direction: 'next' | 'prev') => {
    const nextIndex =
      direction === 'next'
        ? (activeShortIndex + 1) % SHORT_IDS.length
        : (activeShortIndex - 1 + SHORT_IDS.length) % SHORT_IDS.length;

    const newId = SHORT_IDS[nextIndex];
    setActiveShortIndex(nextIndex);
    setCurrentUrl(`www.youtube.com/shorts/${newId}`);

    // If new short video ID is detected, increment view count
    setState((prev) => {
      if (prev.currentShortId !== newId && prev.enabled) {
        return {
          ...prev,
          shortsWatched: prev.shortsWatched + 1,
          currentShortId: newId,
        };
      }
      return prev;
    });
  };

  // Reload current Short (tests that reload does NOT increment counter)
  const handleReload = () => {
    // Current video ID remains unchanged!
    // No increment occurs!
  };

  const handleNavigateHome = () => {
    setCurrentUrl('www.youtube.com/');
  };

  const handleNavigateDirect = (path: string) => {
    setCurrentUrl(path);
  };

  const handleUpdateState = (patch: Partial<ExtensionState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const handleResetUsage = () => {
    setState((prev) => ({
      ...prev,
      usedSeconds: 0,
      shortsWatched: 0,
      currentShortId: null,
    }));
  };

  const handleEmergencyUnlock = () => {
    setState((prev) => ({
      ...prev,
      emergencyUnlocked: true,
      emergencyUnlockDate: prev.lastResetDate,
    }));
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
    } finally {
      setIsDownloading(false);
    }
  };

  // Fast test actions
  const handleQuickAddMinute = () => {
    setState((prev) => ({ ...prev, usedSeconds: prev.usedSeconds + 60 }));
  };

  const handleQuickAddFiveShorts = () => {
    setState((prev) => ({ ...prev, shortsWatched: prev.shortsWatched + 5 }));
  };

  const handleTriggerTimeLimit = () => {
    setState((prev) => ({
      ...prev,
      usedSeconds: prev.dailyTimeLimitSeconds,
    }));
  };

  const handleTriggerShortsLimit = () => {
    setState((prev) => ({
      ...prev,
      shortsWatched: prev.dailyShortsLimit,
    }));
  };

  const handleSimulateNextDay = () => {
    setState((prev) => ({
      ...prev,
      usedSeconds: 0,
      shortsWatched: 0,
      currentShortId: null,
      emergencyUnlocked: false,
      emergencyUnlockDate: '',
      lastResetDate: '2026-09-10',
    }));
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-neutral-200 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0e0f17]/90 backdrop-blur-md border-b border-[#202130] px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-red-500/25 border border-red-500/30 bg-[#1e1418] flex items-center justify-center">
            <img
              src="/icons/icon48.png"
              alt="Shorts Limit Icon"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to SVG if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none -z-0">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Shorts Limit
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold border border-red-500/30">
                Manifest V3 Extension
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Daily Watch Time &amp; Shorts Count Restrictions for YouTube
            </p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center bg-[#141520] border border-[#262738] rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'simulator'
                ? 'bg-[#222436] text-white shadow-sm border border-[#35374e]'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <PlaySquare className="w-3.5 h-3.5 text-red-400" />
            Interactive Simulator
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'code'
                ? 'bg-[#222436] text-white shadow-sm border border-[#35374e]'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            Extension Code
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'docs'
                ? 'bg-[#222436] text-white shadow-sm border border-[#35374e]'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            Installation & Architecture
          </button>
        </div>

        {/* Right Download Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-red-600/30 transition cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            {isDownloading ? 'Packaging Files...' : 'Download Extension (.ZIP)'}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
        {activeTab === 'simulator' && (
          <>
            {/* Quick Testing Bar */}
            <div className="bg-[#12131b] border border-[#252636] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-neutral-400 font-medium">
                  <FastForward className="w-4 h-4 text-red-400" />
                  <span>Test Mode:</span>
                </div>
                {/* Active Mode Pills */}
                <div className="flex items-center bg-[#191b26] p-0.5 rounded-lg border border-[#282a3c]">
                  <button
                    onClick={() => handleUpdateState({ limitMode: 'both' })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      state.limitMode === 'both'
                        ? 'bg-red-500 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Both Together
                  </button>
                  <button
                    onClick={() => handleUpdateState({ limitMode: 'time' })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      state.limitMode === 'time'
                        ? 'bg-red-500 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Time Only
                  </button>
                  <button
                    onClick={() => handleUpdateState({ limitMode: 'shorts' })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      state.limitMode === 'shorts'
                        ? 'bg-red-500 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Shorts Only
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleQuickAddMinute}
                  className="px-2.5 py-1.5 bg-[#1a1c27] hover:bg-[#252738] text-neutral-300 rounded-lg border border-[#2b2d40] transition"
                >
                  +1m Watch Time
                </button>
                <button
                  onClick={handleQuickAddFiveShorts}
                  className="px-2.5 py-1.5 bg-[#1a1c27] hover:bg-[#252738] text-neutral-300 rounded-lg border border-[#2b2d40] transition"
                >
                  +5 Shorts Views
                </button>
                <button
                  onClick={handleTriggerTimeLimit}
                  className="px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg border border-red-500/30 transition font-medium"
                >
                  Reach Time Limit
                </button>
                <button
                  onClick={handleTriggerShortsLimit}
                  className="px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg border border-red-500/30 transition font-medium"
                >
                  Reach Shorts Limit
                </button>
                <button
                  onClick={handleSimulateNextDay}
                  className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg border border-amber-500/30 transition font-medium"
                >
                  Simulate Midnight Reset
                </button>
                <button
                  onClick={handleResetUsage}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700 transition"
                >
                  Reset to 0
                </button>
              </div>
            </div>

            {/* Side-by-Side Simulator Workstation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7/12: Simulated YouTube Shorts Tab */}
              <div className="lg:col-span-8 flex flex-col gap-2">
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Simulated YouTube Shorts Tab
                    </span>
                    <span className="text-neutral-500 text-[11px]">
                      (Content Script &amp; Block Screen active)
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px]">
                    Use the controls inside to test SPA transitions and anti-bypass
                  </span>
                </div>

                <SimulatedYouTube
                  state={state}
                  evaluation={evaluation}
                  activeShortIndex={activeShortIndex}
                  onNavigateShort={handleNavigateShort}
                  onReload={handleReload}
                  onNavigateHome={handleNavigateHome}
                  onNavigateDirect={handleNavigateDirect}
                  currentUrl={currentUrl}
                  isTabVisible={isTabVisible}
                  onToggleTabVisible={() => setIsTabVisible(!isTabVisible)}
                  isTabFocused={isTabFocused}
                  onToggleTabFocused={() => setIsTabFocused(!isTabFocused)}
                />
              </div>

              {/* Right 4/12: Extension Popup UI */}
              <div className="lg:col-span-4 flex flex-col gap-2 items-center lg:items-start">
                <div className="w-full flex items-center justify-between px-1 text-xs">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Extension Popup (360px)
                  </span>
                  <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Synced
                  </span>
                </div>

                <SimulatedPopup
                  state={state}
                  evaluation={evaluation}
                  onUpdateState={handleUpdateState}
                  onResetUsage={handleResetUsage}
                  onEmergencyUnlock={handleEmergencyUnlock}
                />

                {/* Companion Hint Card */}
                <div className="w-[360px] bg-[#12131c] border border-[#242536] rounded-xl p-3 text-[11px] text-neutral-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    How to test Independent Limits:
                  </div>
                  <p>
                    1. Switch mode to <strong>Time Only</strong>: reaching the Shorts count limit will not block you.
                  </p>
                  <p>
                    2. Switch mode to <strong>Shorts Only</strong>: spending watch time will not block you until Shorts count is reached.
                  </p>
                  <p>
                    3. Select <strong>Both Together</strong>: whichever limit is reached first triggers the block!
                  </p>
                </div>

                {/* Extension Icons Showcase Card */}
                <div className="w-[360px] bg-[#12131c] border border-[#242536] rounded-xl p-3.5 text-[11px] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">Extension Icons</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                      Generated &amp; Packaged
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-[#181a24] p-2.5 rounded-lg border border-[#262838]">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shadow border border-red-500/30 bg-[#251317] flex-shrink-0">
                      <img
                        src="/icons/icon128.png"
                        alt="Extension Icon 128"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span className="font-medium text-white">Custom Brand Icon</span>
                      <span className="text-neutral-400 text-[10px]">
                        Included in ZIP archive:
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-300">
                        <span className="px-1.5 py-0.5 bg-[#202230] rounded border border-neutral-700">16x16</span>
                        <span className="px-1.5 py-0.5 bg-[#202230] rounded border border-neutral-700">48x48</span>
                        <span className="px-1.5 py-0.5 bg-[#202230] rounded border border-neutral-700">128x128</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'code' && <CodeInspector />}

        {activeTab === 'docs' && <ArchitectureDocs />}
      </main>
    </div>
  );
}
