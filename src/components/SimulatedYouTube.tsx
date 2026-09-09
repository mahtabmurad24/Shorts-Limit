import React, { useState } from 'react';
import { ExtensionState, LimitEvaluation } from '../types/extension';
import {
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Volume2,
  Heart,
  MessageCircle,
  Share2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Compass,
  Home,
  Play,
  Pause,
} from 'lucide-react';

interface SimulatedYouTubeProps {
  state: ExtensionState;
  evaluation: LimitEvaluation;
  activeShortIndex: number;
  onNavigateShort: (direction: 'next' | 'prev') => void;
  onReload: () => void;
  onNavigateHome: () => void;
  onNavigateDirect: (path: string) => void;
  currentUrl: string;
  isTabVisible: boolean;
  onToggleTabVisible: () => void;
  isTabFocused: boolean;
  onToggleTabFocused: () => void;
}

const SAMPLE_SHORTS = [
  {
    id: 'ABC123_cyber',
    title: 'Top 5 Productivity Tips for Programmers in 2026',
    author: '@CodeCraft',
    likes: '142K',
    comments: '1.8K',
    bgGradient: 'from-blue-950 via-slate-900 to-indigo-950',
    tags: '#coding #tech #devtools',
  },
  {
    id: 'DEF456_urban',
    title: 'Hidden Tokyo Alleyways at 2 AM',
    author: '@TokyoVibes',
    likes: '89K',
    comments: '950',
    bgGradient: 'from-purple-950 via-neutral-900 to-rose-950',
    tags: '#tokyo #travel #japan',
  },
  {
    id: 'GHI789_coffee',
    title: 'How to brew espresso like a World Barista Champion',
    author: '@CoffeeScience',
    likes: '230K',
    comments: '3.4K',
    bgGradient: 'from-amber-950 via-stone-900 to-neutral-950',
    tags: '#coffee #espresso #morning',
  },
  {
    id: 'JKL101_design',
    title: 'Optical illusion secrets used in luxury UI design',
    author: '@DesignPro',
    likes: '67K',
    comments: '720',
    bgGradient: 'from-emerald-950 via-zinc-900 to-teal-950',
    tags: '#ui #design #typography',
  },
];

export const SimulatedYouTube: React.FC<SimulatedYouTubeProps> = ({
  state,
  evaluation,
  activeShortIndex,
  onNavigateShort,
  onReload,
  onNavigateHome,
  onNavigateDirect,
  currentUrl,
  isTabVisible,
  onToggleTabVisible,
  isTabFocused,
  onToggleTabFocused,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const isShortsPage = currentUrl.includes('/shorts/');
  const currentShort = SAMPLE_SHORTS[activeShortIndex % SAMPLE_SHORTS.length];

  const formatMinutes = (seconds: number) => {
    return Math.ceil(seconds / 60);
  };

  const isTrackingActive =
    state.enabled &&
    isShortsPage &&
    isTabVisible &&
    isTabFocused &&
    (!evaluation.blocked || state.emergencyUnlocked);

  // Dynamic Block Message
  let blockTitle = "Shorts Limit Reached";
  let blockSubtitle = "You've reached your Shorts limit for today.";

  if (evaluation.reason === 'time') {
    blockTitle = "Time Limit Reached";
    blockSubtitle = "You've used all your Shorts time for today.";
  } else if (evaluation.reason === 'shorts') {
    blockTitle = "Shorts Limit Reached";
    blockSubtitle = "You've reached your maximum number of Shorts for today.";
  } else if (evaluation.reason === 'both') {
    blockTitle = "Daily Shorts Limit Reached";
    blockSubtitle = "You've reached both of your Shorts limits for today.";
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f12] rounded-2xl border border-[#272838] overflow-hidden shadow-2xl min-h-[580px]">
      {/* Browser Chrome Bar */}
      <div className="bg-[#171720] border-b border-[#272838] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
        {/* Navigation & Refresh Controls */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-1">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
          </div>
          <button
            onClick={onReload}
            title="Reload page (Tests refresh immunity - view count does NOT increment twice)"
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 flex items-center bg-[#0c0d12] border border-[#272838] rounded-lg px-2.5 py-1 text-neutral-300 font-mono text-[11px] truncate">
          <Lock className="w-3 h-3 text-emerald-500 mr-2 shrink-0" />
          <span className="text-neutral-500">https://</span>
          <span className="text-white font-medium truncate">{currentUrl}</span>
        </div>

        {/* Visibility & Focus Simulators */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleTabVisible}
            title="Toggle Tab Visibility (Tests document.hidden)"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition ${
              isTabVisible
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {isTabVisible ? (
              <>
                <Eye className="w-3 h-3 text-emerald-400" />
                Visible
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-amber-400" />
                Hidden
              </>
            )}
          </button>

          <button
            onClick={onToggleTabFocused}
            title="Toggle Window Focus (Tests document.hasFocus())"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition ${
              isTabFocused
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            Focus: {isTabFocused ? 'On' : 'Blurred'}
          </button>
        </div>
      </div>

      {/* Heartbeat Status Strip */}
      <div className="bg-[#12121a] px-4 py-1.5 border-b border-[#222230] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {isTrackingActive ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Tracking active Shorts watch time (1s tick)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-neutral-500" />
              Tracking paused {!isShortsPage ? '(Not on Shorts)' : !isTabVisible ? '(Tab hidden)' : !isTabFocused ? '(Window blurred)' : evaluation.blocked ? '(Blocked)' : '(Disabled)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-neutral-400">
          <span>Active Short ID: <strong className="text-neutral-200 font-mono">{isShortsPage ? currentShort.id : 'None'}</strong></span>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex">
        {/* Left YouTube Navigation Bar */}
        <div className="w-16 bg-[#0c0d12] border-r border-[#222230] flex flex-col items-center py-4 gap-6 shrink-0">
          <button
            onClick={onNavigateHome}
            title="YouTube Home"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
              !isShortsPage ? 'text-red-500 bg-red-500/10' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px]">Home</span>
          </button>

          <button
            onClick={() => onNavigateDirect(`www.youtube.com/shorts/${currentShort.id}`)}
            title="YouTube Shorts"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
              isShortsPage ? 'text-red-500 bg-red-500/10' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17.77 10.32l-1.2-.5L18 9.06a3.74 3.74 0 0 0-3.5-5.28c-.76 0-1.48.24-2.08.66l-5.69 4.02a3.73 3.73 0 0 0 1.25 6.94l1.2.5-1.43.76a3.75 3.75 0 0 0 3.5 5.28c.76 0 1.48-.24 2.08-.66l5.69-4.02a3.73 3.73 0 0 0-1.25-6.94z" />
            </svg>
            <span className="text-[9px]">Shorts</span>
          </button>

          <button
            onClick={onNavigateHome}
            title="Subscriptions"
            className="flex flex-col items-center gap-1 p-2 text-neutral-400 hover:text-white rounded-lg transition"
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px]">Explore</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-[#0a0a0e] overflow-hidden">
          {/* Normal YouTube Homepage view if navigated home */}
          {!isShortsPage ? (
            <div className="w-full max-w-lg text-center p-8 bg-[#14141d] rounded-2xl border border-[#272838] flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">YouTube Home Page</h2>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
                You are currently on standard YouTube. The Shorts Limit extension is idle and does not block standard video viewing or increment Shorts time.
              </p>
              <button
                onClick={() => onNavigateDirect(`www.youtube.com/shorts/${currentShort.id}`)}
                className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-xs rounded-lg transition"
              >
                Go to YouTube Shorts
              </button>
            </div>
          ) : evaluation.blocked && !state.emergencyUnlocked ? (
            /* ========================================================== */
            /*  THE REAL BLOCK SCREEN OVERLAY                             */
            /*  Strictly matching prompt specifications:                  */
            /*  - Centered card                                           */
            /*  - Dynamic title & subtitle                                */
            /*  - Usage stats: Today's usage & Shorts watched             */
            /*  - [ Back to YouTube ] button navigating to home           */
            /*  - NO Emergency Unlock button on this screen               */
            /* ========================================================== */
            <div className="absolute inset-0 bg-[#0b0b0fa5] backdrop-blur-xl z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
              <div className="bg-[#18181f] border border-[#2a2a38] rounded-2xl p-8 max-w-[420px] w-full text-center shadow-2xl flex flex-col items-center">
                {/* Block Icon */}
                <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>

                {/* Dynamic Title */}
                <h2 className="text-xl font-bold text-white mb-1.5 tracking-tight">
                  {blockTitle}
                </h2>
                <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                  {blockSubtitle}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  <div className={`border rounded-xl p-3.5 text-center ${
                    state.limitMode === 'shorts' ? 'bg-[#181822] border-[#252532] opacity-75' : 'bg-[#20202b] border-[#2d2d3d]'
                  }`}>
                    <div className="text-[11px] font-medium text-neutral-400 mb-1 flex items-center justify-center gap-1">
                      <span>Today's usage</span>
                      {state.limitMode === 'shorts' && (
                        <span className="text-[9px] px-1 bg-neutral-800 text-neutral-400 rounded">Untracked</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      {state.limitMode === 'shorts'
                        ? `${formatMinutes(state.usedSeconds)} mins`
                        : `${formatMinutes(state.usedSeconds)} / ${formatMinutes(state.dailyTimeLimitSeconds)} mins`}
                    </div>
                  </div>
                  <div className={`border rounded-xl p-3.5 text-center ${
                    state.limitMode === 'time' ? 'bg-[#181822] border-[#252532] opacity-75' : 'bg-[#20202b] border-[#2d2d3d]'
                  }`}>
                    <div className="text-[11px] font-medium text-neutral-400 mb-1 flex items-center justify-center gap-1">
                      <span>Shorts watched</span>
                      {state.limitMode === 'time' && (
                        <span className="text-[9px] px-1 bg-neutral-800 text-neutral-400 rounded">Untracked</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      {state.limitMode === 'time'
                        ? `${state.shortsWatched} Shorts`
                        : `${state.shortsWatched} / ${state.dailyShortsLimit} Shorts`}
                    </div>
                  </div>
                </div>

                {/* Back to YouTube Button */}
                <button
                  onClick={onNavigateHome}
                  className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-red-500/20"
                >
                  Back to YouTube
                </button>

                {/* Anti-Bypass note */}
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-neutral-500">
                  <CheckCircle2 className="w-3 h-3 text-neutral-500" />
                  <span>Anti-bypass active: Emergency unlock is strictly isolated in popup</span>
                </div>
              </div>
            </div>
          ) : (
            /* Active Shorts Reel Player View */
            <div className="relative w-[300px] h-[480px] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 bg-gradient-to-b border border-neutral-800">
              {/* Animated Reel Background */}
              <div className={`absolute inset-0 bg-gradient-to-b ${currentShort.bgGradient} opacity-90`} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/80" />

              {/* Reel Header */}
              <div className="relative z-10 flex justify-between items-center text-white/90">
                <span className="text-[11px] font-semibold bg-black/40 backdrop-blur px-2 py-0.5 rounded-full border border-white/10">
                  Short #{activeShortIndex + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Center Play indicator if paused */}
              {!isPlaying && (
                <div className="relative z-10 self-center bg-black/60 rounded-full p-4 text-white/80">
                  <Play className="w-8 h-8" />
                </div>
              )}

              {/* Reel Meta & Creator */}
              <div className="relative z-10 flex justify-between items-end gap-2">
                <div className="flex-1 text-white">
                  <p className="text-xs font-bold mb-1 hover:underline cursor-pointer">
                    {currentShort.author}
                  </p>
                  <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed mb-1.5">
                    {currentShort.title}
                  </p>
                  <span className="text-[10px] text-red-400 font-medium">
                    {currentShort.tags}
                  </span>
                </div>

                {/* Right Action Stack */}
                <div className="flex flex-col items-center gap-3 text-white">
                  <div className="flex flex-col items-center">
                    <button className="w-8 h-8 rounded-full bg-neutral-900/60 backdrop-blur flex items-center justify-center hover:bg-red-500/40 transition">
                      <Heart className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-[9px] mt-0.5 font-bold">{currentShort.likes}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="w-8 h-8 rounded-full bg-neutral-900/60 backdrop-blur flex items-center justify-center hover:bg-neutral-800 transition">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-[9px] mt-0.5 font-bold">{currentShort.comments}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="w-8 h-8 rounded-full bg-neutral-900/60 backdrop-blur flex items-center justify-center hover:bg-neutral-800 transition">
                      <Share2 className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-[9px] mt-0.5 font-bold">Share</span>
                  </div>
                </div>
              </div>

              {/* Floating Reel Navigation Buttons */}
              <div className="absolute right-[-54px] top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                <button
                  onClick={() => onNavigateShort('prev')}
                  title="Previous Short (SPA navigation)"
                  className="w-9 h-9 rounded-full bg-[#1c1c27] border border-[#2e2e42] text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center shadow-lg transition"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigateShort('next')}
                  title="Next Short (SPA navigation - increments view count)"
                  className="w-9 h-9 rounded-full bg-[#1c1c27] border border-[#2e2e42] text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center shadow-lg transition"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
