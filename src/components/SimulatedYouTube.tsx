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
      <div className="bg-[#171722] border-b border-[#27283c] px-4 py-3 flex items-center justify-between gap-3 text-sm">
        {/* Navigation & Refresh Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5 mr-1">
            <span className="w-3 h-3 rounded-full bg-red-500/90 inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block shadow-sm"></span>
          </div>
          <button
            onClick={onReload}
            title="Reload page (Tests refresh immunity - view count does NOT increment twice)"
            className="p-1.5 text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 flex items-center bg-[#0c0d13] border border-[#27283c] rounded-xl px-3 py-1.5 text-neutral-200 font-mono text-xs sm:text-sm truncate shadow-inner">
          <Lock className="w-3.5 h-3.5 text-emerald-400 mr-2.5 shrink-0" />
          <span className="text-neutral-500">https://</span>
          <span className="text-white font-semibold truncate">{currentUrl}</span>
        </div>

        {/* Visibility & Focus Simulators */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleTabVisible}
            title="Toggle Tab Visibility (Tests document.hidden)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isTabVisible
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            }`}
          >
            {isTabVisible ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tab: Visible</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Tab: Hidden</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleTabFocused}
            title="Toggle Window Focus (Tests document.hasFocus())"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isTabFocused
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            }`}
          >
            <span>Focus: {isTabFocused ? 'Active' : 'Blurred'}</span>
          </button>
        </div>
      </div>

      {/* Heartbeat Status Strip */}
      <div className="bg-[#12131b] px-4 py-2 border-b border-[#222332] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {isTrackingActive ? (
            <span className="flex items-center gap-2 text-emerald-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              Tracking Active Shorts Watch Time (1-second tick)
            </span>
          ) : (
            <span className="flex items-center gap-2 text-neutral-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
              Tracking Paused {!isShortsPage ? '(Not on /shorts/ path)' : !isTabVisible ? '(Tab is hidden)' : !isTabFocused ? '(Window blurred)' : evaluation.blocked ? '(Limit reached - blocked)' : '(Extension disabled)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-neutral-400 text-xs">
          <span>Active Video ID: <strong className="text-white font-mono px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">{isShortsPage ? currentShort.id : 'None'}</strong></span>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex">
        {/* Left YouTube Navigation Bar */}
        <div className="w-20 bg-[#0c0d12] border-r border-[#222332] flex flex-col items-center py-5 gap-7 shrink-0 select-none">
          <button
            onClick={onNavigateHome}
            title="YouTube Home"
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition cursor-pointer w-16 ${
              !isShortsPage ? 'text-red-500 bg-red-500/15 font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => onNavigateDirect(`www.youtube.com/shorts/${currentShort.id}`)}
            title="YouTube Shorts"
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition cursor-pointer w-16 ${
              isShortsPage ? 'text-red-500 bg-red-500/15 font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M17.77 10.32l-1.2-.5L18 9.06a3.74 3.74 0 0 0-3.5-5.28c-.76 0-1.48.24-2.08.66l-5.69 4.02a3.73 3.73 0 0 0 1.25 6.94l1.2.5-1.43.76a3.75 3.75 0 0 0 3.5 5.28c.76 0 1.48-.24 2.08-.66l5.69-4.02a3.73 3.73 0 0 0-1.25-6.94z" />
            </svg>
            <span className="text-xs font-medium">Shorts</span>
          </button>

          <button
            onClick={onNavigateHome}
            title="Subscriptions"
            className="flex flex-col items-center gap-1.5 p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-xl transition cursor-pointer w-16"
          >
            <Compass className="w-6 h-6" />
            <span className="text-xs font-medium">Explore</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative flex items-center justify-center p-6 bg-[#0a0a0f] overflow-hidden">
          {/* Normal YouTube Homepage view if navigated home */}
          {!isShortsPage ? (
            <div className="w-full max-w-lg text-center p-8 bg-[#141520] rounded-2xl border border-[#27293e] flex flex-col items-center gap-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center border border-red-500/25">
                <Home className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white">YouTube Home Feed</h2>
              <p className="text-sm text-neutral-300 leading-relaxed max-w-md">
                You are currently browsing standard long-form YouTube. Shorts Limit is idle and does not block standard video viewing or increment daily Shorts counters.
              </p>
              <button
                onClick={() => onNavigateDirect(`www.youtube.com/shorts/${currentShort.id}`)}
                className="mt-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Go to YouTube Shorts
              </button>
            </div>
          ) : evaluation.blocked && !state.emergencyUnlocked ? (
            /* ========================================================== */
            /*  THE REAL BLOCK SCREEN OVERLAY                             */
            /* ========================================================== */
            <div className="absolute inset-0 bg-[#090a10df] backdrop-blur-xl z-50 flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
              <div className="bg-[#151722] border border-[#2c2e44] rounded-3xl p-8 max-w-[460px] w-full text-center shadow-2xl flex flex-col items-center">
                {/* Block Icon */}
                <div className="w-16 h-16 rounded-2xl bg-red-500/15 text-red-500 border border-red-500/30 flex items-center justify-center mb-5 shadow-lg shadow-red-500/10">
                  <svg
                    viewBox="0 0 24 24"
                    width="32"
                    height="32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>

                {/* Dynamic Title */}
                <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
                  {blockTitle}
                </h2>
                <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
                  {blockSubtitle}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3.5 w-full mb-6">
                  <div className={`border rounded-2xl p-4 text-center ${
                    state.limitMode === 'shorts' ? 'bg-[#181926] border-[#25273a] opacity-70' : 'bg-[#1c1e2e] border-[#2e314a]'
                  }`}>
                    <div className="text-xs font-semibold text-neutral-400 mb-1.5 flex items-center justify-center gap-1.5">
                      <span>Today's usage</span>
                      {state.limitMode === 'shorts' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">Untracked</span>
                      )}
                    </div>
                    <div className="text-base font-extrabold text-white tabular-nums">
                      {state.limitMode === 'shorts'
                        ? `${formatMinutes(state.usedSeconds)} mins`
                        : `${formatMinutes(state.usedSeconds)} / ${formatMinutes(state.dailyTimeLimitSeconds)} mins`}
                    </div>
                  </div>

                  <div className={`border rounded-2xl p-4 text-center ${
                    state.limitMode === 'time' ? 'bg-[#181926] border-[#25273a] opacity-70' : 'bg-[#1c1e2e] border-[#2e314a]'
                  }`}>
                    <div className="text-xs font-semibold text-neutral-400 mb-1.5 flex items-center justify-center gap-1.5">
                      <span>Shorts watched</span>
                      {state.limitMode === 'time' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">Untracked</span>
                      )}
                    </div>
                    <div className="text-base font-extrabold text-white tabular-nums">
                      {state.limitMode === 'time'
                        ? `${state.shortsWatched} Shorts`
                        : `${state.shortsWatched} / ${state.dailyShortsLimit} Shorts`}
                    </div>
                  </div>
                </div>

                {/* Back to YouTube Button */}
                <button
                  onClick={onNavigateHome}
                  className="w-full py-3.5 px-5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition shadow-xl shadow-red-600/30 cursor-pointer"
                >
                  Back to YouTube
                </button>

                {/* Anti-Bypass note */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Anti-bypass: Emergency unlock is isolated in extension popup</span>
                </div>
              </div>
            </div>
          ) : (
            /* Active Shorts Reel Player View */
            <div className="relative w-[320px] h-[520px] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between p-5 bg-gradient-to-b border border-neutral-800">
              {/* Animated Reel Background */}
              <div className={`absolute inset-0 bg-gradient-to-b ${currentShort.bgGradient} opacity-90`} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/80" />

              {/* Reel Header */}
              <div className="relative z-10 flex justify-between items-center text-white/90">
                <span className="text-xs font-bold bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  Short #{activeShortIndex + 1} of {SAMPLE_SHORTS.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Center Play indicator if paused */}
              {!isPlaying && (
                <div className="relative z-10 self-center bg-black/60 rounded-full p-4 text-white/90 shadow-xl">
                  <Play className="w-8 h-8" />
                </div>
              )}

              {/* Reel Meta & Creator */}
              <div className="relative z-10 flex justify-between items-end gap-3">
                <div className="flex-1 text-white">
                  <p className="text-sm font-bold mb-1 hover:underline cursor-pointer">
                    {currentShort.author}
                  </p>
                  <p className="text-xs text-neutral-100 line-clamp-2 leading-relaxed mb-1.5 font-medium">
                    {currentShort.title}
                  </p>
                  <span className="text-xs text-red-300 font-semibold">
                    {currentShort.tags}
                  </span>
                </div>

                {/* Right Action Stack */}
                <div className="flex flex-col items-center gap-3.5 text-white">
                  <div className="flex flex-col items-center">
                    <button className="w-9 h-9 rounded-full bg-neutral-900/70 backdrop-blur-md flex items-center justify-center hover:bg-red-500/40 transition cursor-pointer">
                      <Heart className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-[11px] mt-1 font-bold">{currentShort.likes}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="w-9 h-9 rounded-full bg-neutral-900/70 backdrop-blur-md flex items-center justify-center hover:bg-neutral-800 transition cursor-pointer">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-[11px] mt-1 font-bold">{currentShort.comments}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="w-9 h-9 rounded-full bg-neutral-900/70 backdrop-blur-md flex items-center justify-center hover:bg-neutral-800 transition cursor-pointer">
                      <Share2 className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-[11px] mt-1 font-bold">Share</span>
                  </div>
                </div>
              </div>

              {/* Floating Reel Navigation Buttons */}
              <div className="absolute right-[-56px] top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-20">
                <button
                  onClick={() => onNavigateShort('prev')}
                  title="Previous Short (SPA navigation)"
                  className="w-10 h-10 rounded-full bg-[#1c1c29] border border-[#2e2e44] text-neutral-200 hover:text-white hover:bg-neutral-800 flex items-center justify-center shadow-xl transition cursor-pointer"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigateShort('next')}
                  title="Next Short (SPA navigation - increments view count)"
                  className="w-10 h-10 rounded-full bg-[#1c1c29] border border-[#2e2e44] text-neutral-200 hover:text-white hover:bg-neutral-800 flex items-center justify-center shadow-xl transition cursor-pointer"
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
