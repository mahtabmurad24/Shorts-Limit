import React, { useState } from 'react';
import { ExtensionState, LimitEvaluation } from '../types/extension';
import { RotateCcw, AlertTriangle, ShieldCheck, Clock, PlaySquare } from 'lucide-react';

interface SimulatedPopupProps {
  state: ExtensionState;
  evaluation: LimitEvaluation;
  onUpdateState: (patch: Partial<ExtensionState>) => void;
  onResetUsage: () => void;
  onEmergencyUnlock: () => void;
}

export const SimulatedPopup: React.FC<SimulatedPopupProps> = ({
  state,
  evaluation,
  onUpdateState,
  onResetUsage,
  onEmergencyUnlock,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [customTimeOpen, setCustomTimeOpen] = useState(false);
  const [customTimeVal, setCustomTimeVal] = useState('');
  const [customShortsOpen, setCustomShortsOpen] = useState(false);
  const [customShortsVal, setCustomShortsVal] = useState('');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const timeRatio = Math.min(
    100,
    Math.round((state.usedSeconds / state.dailyTimeLimitSeconds) * 100)
  );
  const shortsRatio = Math.min(
    100,
    Math.round((state.shortsWatched / state.dailyShortsLimit) * 100)
  );

  const isEmergencyActive =
    state.emergencyUnlocked &&
    state.emergencyUnlockDate === state.lastResetDate;

  const timePresets = [
    { label: '5m', sec: 300 },
    { label: '10m', sec: 600 },
    { label: '15m', sec: 900 },
    { label: '20m', sec: 1200 },
    { label: '30m', sec: 1800 },
  ];

  const shortsPresets = [10, 20, 30, 50, 100];

  const handleCustomTimeSave = () => {
    const mins = parseInt(customTimeVal, 10);
    if (mins && mins > 0) {
      onUpdateState({ dailyTimeLimitSeconds: mins * 60 });
      setCustomTimeOpen(false);
      setCustomTimeVal('');
    }
  };

  const handleCustomShortsSave = () => {
    const count = parseInt(customShortsVal, 10);
    if (count && count > 0) {
      onUpdateState({ dailyShortsLimit: count });
      setCustomShortsOpen(false);
      setCustomShortsVal('');
    }
  };

  return (
    <div className="relative w-[380px] max-w-full bg-[#0c0d13] text-[#f3f4f6] rounded-2xl border border-[#27283c] shadow-2xl p-5 text-sm flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-500 border border-red-500/25 flex items-center justify-center shadow-sm">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight leading-none block">
              Shorts Limit
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              Daily Control &amp; Focus
            </span>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-block w-11 h-6 cursor-pointer">
          <input
            type="checkbox"
            className="opacity-0 w-0 h-0 peer"
            checked={state.enabled}
            onChange={(e) => onUpdateState({ enabled: e.target.checked })}
          />
          <span className="absolute inset-0 bg-neutral-700/80 rounded-full transition-colors peer-checked:bg-red-500"></span>
          <span className="absolute left-[3px] bottom-[3px] h-[18px] w-[18px] bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-md"></span>
        </label>
      </div>

      {/* Today's Progress Card */}
      <div className="bg-[#141520] border border-[#26273c] rounded-xl p-4 flex flex-col gap-3.5 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
            Today's Activity
          </span>
          {!state.enabled ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
              Disabled
            </span>
          ) : isEmergencyActive ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Emergency Access
            </span>
          ) : evaluation.blocked ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Limit Reached
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          )}
        </div>

        {/* Watch Time */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-neutral-400" />
              Watch Time
            </span>
            <span className="text-base font-bold text-white tabular-nums tracking-tight">
              {formatTime(state.usedSeconds)} / {formatTime(state.dailyTimeLimitSeconds)}
            </span>
          </div>
          <div className="h-2 bg-[#1f2030] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                evaluation.blocked && evaluation.reason !== 'shorts'
                  ? 'bg-red-500 shadow-sm shadow-red-500/50'
                  : 'bg-gradient-to-r from-red-500 to-rose-400'
              }`}
              style={{ width: `${timeRatio}%` }}
            />
          </div>
        </div>

        {/* Shorts Watched */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
              <PlaySquare className="w-4 h-4 text-neutral-400" />
              Shorts Watched
            </span>
            <span className="text-base font-bold text-white tabular-nums tracking-tight">
              {state.shortsWatched} / {state.dailyShortsLimit}
            </span>
          </div>
          <div className="h-2 bg-[#1f2030] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                evaluation.blocked && evaluation.reason !== 'time'
                  ? 'bg-red-500 shadow-sm shadow-red-500/50'
                  : 'bg-gradient-to-r from-red-500 to-orange-400'
              }`}
              style={{ width: `${shortsRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Restrictions Settings */}
      <div className="bg-[#141520] border border-[#26273c] rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          Daily Restrictions
        </span>

        {/* Restriction Mode Selector */}
        <div className="bg-[#1c1d2c] border border-[#2c2e44] rounded-xl p-2.5 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-neutral-200">Enforce Limits</span>
            <span className="font-bold text-red-400 text-xs px-2 py-0.5 rounded bg-red-500/10">
              {state.limitMode === 'both'
                ? 'Both Active'
                : state.limitMode === 'time'
                ? 'Time Only Active'
                : 'Shorts Only Active'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onUpdateState({ limitMode: 'both' })}
              className={`py-2 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                state.limitMode === 'both'
                  ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/30'
                  : 'bg-[#131420] text-neutral-300 hover:text-white border border-[#27293e]'
              }`}
            >
              Both Together
            </button>
            <button
              onClick={() => onUpdateState({ limitMode: 'time' })}
              className={`py-2 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                state.limitMode === 'time'
                  ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/30'
                  : 'bg-[#131420] text-neutral-300 hover:text-white border border-[#27293e]'
              }`}
            >
              Time Only
            </button>
            <button
              onClick={() => onUpdateState({ limitMode: 'shorts' })}
              className={`py-2 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                state.limitMode === 'shorts'
                  ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/30'
                  : 'bg-[#131420] text-neutral-300 hover:text-white border border-[#27293e]'
              }`}
            >
              Shorts Only
            </button>
          </div>
        </div>

        {/* Time Limit Setting */}
        <div
          className={`flex flex-col gap-2.5 transition-opacity duration-200 ${
            state.limitMode === 'shorts' ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              Daily Time Limit
              {state.limitMode === 'shorts' && (
                <span className="text-[11px] font-medium px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded-md border border-neutral-700">
                  Inactive
                </span>
              )}
            </span>
            <span className="text-sm font-bold text-red-400">
              {Math.round(state.dailyTimeLimitSeconds / 60)} min
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {timePresets.map((p) => {
              const isActive = state.dailyTimeLimitSeconds === p.sec;
              return (
                <button
                  key={p.sec}
                  onClick={() => onUpdateState({ dailyTimeLimitSeconds: p.sec })}
                  className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-500 text-white font-bold shadow-sm shadow-red-500/30'
                      : 'bg-[#1e2030] text-neutral-300 hover:bg-[#282a40] hover:text-white border border-[#282a40]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={() => setCustomTimeOpen(!customTimeOpen)}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !timePresets.some((p) => p.sec === state.dailyTimeLimitSeconds)
                  ? 'bg-red-500 text-white font-bold shadow-sm shadow-red-500/30'
                  : 'bg-[#1e2030] text-neutral-300 hover:bg-[#282a40] hover:text-white border border-[#282a40]'
              }`}
            >
              Custom
            </button>
          </div>

          {customTimeOpen && (
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                min="1"
                max="720"
                value={customTimeVal}
                onChange={(e) => setCustomTimeVal(e.target.value)}
                placeholder="Minutes"
                className="flex-1 bg-[#1e2030] border border-[#2f314c] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
              />
              <button
                onClick={handleCustomTimeSave}
                className="bg-red-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-red-600 transition cursor-pointer"
              >
                Set
              </button>
            </div>
          )}
        </div>

        {/* Shorts Limit Setting */}
        <div
          className={`flex flex-col gap-2.5 transition-opacity duration-200 ${
            state.limitMode === 'time' ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              Daily Shorts Limit
              {state.limitMode === 'time' && (
                <span className="text-[11px] font-medium px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded-md border border-neutral-700">
                  Inactive
                </span>
              )}
            </span>
            <span className="text-sm font-bold text-red-400">
              {state.dailyShortsLimit} Shorts
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {shortsPresets.map((count) => {
              const isActive = state.dailyShortsLimit === count;
              return (
                <button
                  key={count}
                  onClick={() => onUpdateState({ dailyShortsLimit: count })}
                  className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-500 text-white font-bold shadow-sm shadow-red-500/30'
                      : 'bg-[#1e2030] text-neutral-300 hover:bg-[#282a40] hover:text-white border border-[#282a40]'
                  }`}
                >
                  {count}
                </button>
              );
            })}
            <button
              onClick={() => setCustomShortsOpen(!customShortsOpen)}
              className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !shortsPresets.includes(state.dailyShortsLimit)
                  ? 'bg-red-500 text-white font-bold shadow-sm shadow-red-500/30'
                  : 'bg-[#1e2030] text-neutral-300 hover:bg-[#282a40] hover:text-white border border-[#282a40]'
              }`}
            >
              Custom
            </button>
          </div>

          {customShortsOpen && (
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                min="1"
                max="1000"
                value={customShortsVal}
                onChange={(e) => setCustomShortsVal(e.target.value)}
                placeholder="Shorts count"
                className="flex-1 bg-[#1e2030] border border-[#2f314c] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
              />
              <button
                onClick={handleCustomShortsSave}
                className="bg-red-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-red-600 transition cursor-pointer"
              >
                Set
              </button>
            </div>
          )}
        </div>

        {/* Reset Today's Usage */}
        <div className="pt-2 border-t border-[#26273c]">
          <button
            onClick={() => setShowResetModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-transparent border border-[#2a2c42] hover:bg-[#1f2132] text-neutral-300 hover:text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-neutral-400" />
            Reset Today's Usage
          </button>
        </div>
      </div>

      {/* Emergency Access Section (Visually Separated) */}
      <div className="bg-[#151119] border border-[#3b1c24] rounded-xl p-4 flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/20 text-red-300 rounded border border-red-500/30 tracking-wider">
            OVERRIDE
          </span>
          <h3 className="text-sm font-bold text-red-200">
            Emergency Access
          </h3>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          {isEmergencyActive
            ? 'Emergency unlock already used today. Access is allowed until midnight.'
            : 'Need emergency access to Shorts? Single unlock allowed per calendar day.'}
        </p>

        <button
          disabled={isEmergencyActive}
          onClick={() => setShowEmergencyModal(true)}
          className={`text-xs font-bold py-2.5 px-4 rounded-xl border transition-all cursor-pointer ${
            isEmergencyActive
              ? 'bg-[#181924] text-neutral-500 border-[#28293c] cursor-not-allowed'
              : 'bg-red-500/20 border-red-500/50 text-red-200 hover:bg-red-500 hover:text-white shadow-sm shadow-red-500/20'
          }`}
        >
          {isEmergencyActive ? 'Emergency Unlock Used Today' : 'Emergency Unlock'}
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 rounded-2xl z-50">
          <div className="bg-[#161824] border border-[#2b2d42] rounded-xl p-5 w-full flex flex-col gap-3 shadow-2xl">
            <h4 className="font-bold text-base text-white">Reset Usage?</h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This will reset your watch time and Shorts view count for today back to zero.
            </p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg border border-neutral-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetUsage();
                  setShowResetModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition shadow-md cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Unlock Confirmation Dialog */}
      {showEmergencyModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 rounded-2xl z-50">
          <div className="bg-[#17131b] border border-[#421d26] rounded-xl p-5 w-full flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-base text-white">Emergency Unlock</h4>
            </div>
            <p className="text-xs text-neutral-200 leading-relaxed">
              You've reached today's Shorts restriction.
              Emergency access will allow Shorts again for the rest of today, while your usage continues to be tracked.
            </p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg border border-neutral-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onEmergencyUnlock();
                  setShowEmergencyModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition shadow-md cursor-pointer"
              >
                Unlock for Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
