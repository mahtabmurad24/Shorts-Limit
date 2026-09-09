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
    <div className="relative w-[360px] bg-[#0c0d12] text-[#f3f4f6] rounded-2xl border border-[#272838] shadow-2xl p-4 text-[13px] flex flex-col gap-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="font-bold text-base text-white tracking-tight">
            Shorts Limit
          </span>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-block w-10 h-[22px] cursor-pointer">
          <input
            type="checkbox"
            className="opacity-0 w-0 h-0 peer"
            checked={state.enabled}
            onChange={(e) => onUpdateState({ enabled: e.target.checked })}
          />
          <span className="absolute inset-0 bg-neutral-700 rounded-full transition-colors peer-checked:bg-red-500"></span>
          <span className="absolute left-[3px] bottom-[3px] h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-[18px]"></span>
        </label>
      </div>

      {/* Today's Progress Card */}
      <div className="bg-[#15161e] border border-[#272838] rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold tracking-wider text-neutral-400">
            TODAY'S ACTIVITY
          </span>
          {!state.enabled ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
              Disabled
            </span>
          ) : isEmergencyActive ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              Emergency Access
            </span>
          ) : evaluation.blocked ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
              Limit Reached
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              Active
            </span>
          )}
        </div>

        {/* Watch Time */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              Watch Time
            </span>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatTime(state.usedSeconds)} / {formatTime(state.dailyTimeLimitSeconds)}
            </span>
          </div>
          <div className="h-1.5 bg-[#1e1f2b] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                evaluation.blocked && evaluation.reason !== 'shorts'
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-red-500 to-rose-400'
              }`}
              style={{ width: `${timeRatio}%` }}
            />
          </div>
        </div>

        {/* Shorts Watched */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
              <PlaySquare className="w-3.5 h-3.5 text-neutral-400" />
              Shorts Watched
            </span>
            <span className="text-sm font-bold text-white tabular-nums">
              {state.shortsWatched} / {state.dailyShortsLimit}
            </span>
          </div>
          <div className="h-1.5 bg-[#1e1f2b] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                evaluation.blocked && evaluation.reason !== 'time'
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-red-500 to-orange-400'
              }`}
              style={{ width: `${shortsRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Restrictions Settings */}
      <div className="bg-[#15161e] border border-[#272838] rounded-xl p-3.5 flex flex-col gap-3.5">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Daily Restrictions
        </span>

        {/* Restriction Mode Selector */}
        <div className="bg-[#1c1d29] border border-[#2c2d3f] rounded-lg p-2 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-medium text-neutral-300">Enforce Limits</span>
            <span className="font-semibold text-red-400 text-[10px]">
              {state.limitMode === 'both'
                ? 'Both Active'
                : state.limitMode === 'time'
                ? 'Time Only Active'
                : 'Shorts Only Active'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => onUpdateState({ limitMode: 'both' })}
              className={`py-1 px-1 rounded text-[10px] font-semibold transition-all ${
                state.limitMode === 'both'
                  ? 'bg-red-500 text-white font-bold shadow'
                  : 'bg-[#141520] text-neutral-400 hover:text-white border border-[#28293d]'
              }`}
            >
              Both Together
            </button>
            <button
              onClick={() => onUpdateState({ limitMode: 'time' })}
              className={`py-1 px-1 rounded text-[10px] font-semibold transition-all ${
                state.limitMode === 'time'
                  ? 'bg-red-500 text-white font-bold shadow'
                  : 'bg-[#141520] text-neutral-400 hover:text-white border border-[#28293d]'
              }`}
            >
              Time Only
            </button>
            <button
              onClick={() => onUpdateState({ limitMode: 'shorts' })}
              className={`py-1 px-1 rounded text-[10px] font-semibold transition-all ${
                state.limitMode === 'shorts'
                  ? 'bg-red-500 text-white font-bold shadow'
                  : 'bg-[#141520] text-neutral-400 hover:text-white border border-[#28293d]'
              }`}
            >
              Shorts Only
            </button>
          </div>
        </div>

        {/* Time Limit Setting */}
        <div
          className={`flex flex-col gap-2 transition-opacity duration-200 ${
            state.limitMode === 'shorts' ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
              Daily Time Limit
              {state.limitMode === 'shorts' && (
                <span className="text-[9px] px-1.5 py-0.2 bg-neutral-800 text-neutral-400 rounded">
                  Inactive
                </span>
              )}
            </span>
            <span className="text-xs font-semibold text-red-400">
              {Math.round(state.dailyTimeLimitSeconds / 60)} min
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {timePresets.map((p) => {
              const isActive = state.dailyTimeLimitSeconds === p.sec;
              return (
                <button
                  key={p.sec}
                  onClick={() => onUpdateState({ dailyTimeLimitSeconds: p.sec })}
                  className={`py-1.5 px-0.5 rounded text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-red-500 text-white font-bold'
                      : 'bg-[#1e1f2b] text-neutral-300 hover:bg-[#2a2b3b] border border-[#272838]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={() => setCustomTimeOpen(!customTimeOpen)}
              className={`py-1.5 px-0.5 rounded text-[11px] font-semibold transition-all ${
                !timePresets.some((p) => p.sec === state.dailyTimeLimitSeconds)
                  ? 'bg-red-500 text-white font-bold'
                  : 'bg-[#1e1f2b] text-neutral-300 hover:bg-[#2a2b3b] border border-[#272838]'
              }`}
            >
              Custom
            </button>
          </div>

          {customTimeOpen && (
            <div className="flex gap-1.5 mt-1">
              <input
                type="number"
                min="1"
                max="720"
                value={customTimeVal}
                onChange={(e) => setCustomTimeVal(e.target.value)}
                placeholder="Minutes"
                className="flex-1 bg-[#1e1f2b] border border-[#272838] rounded px-2 py-1 text-xs text-white outline-none focus:border-red-500"
              />
              <button
                onClick={handleCustomTimeSave}
                className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-600"
              >
                Set
              </button>
            </div>
          )}
        </div>

        {/* Shorts Limit Setting */}
        <div
          className={`flex flex-col gap-2 transition-opacity duration-200 ${
            state.limitMode === 'time' ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
              Daily Shorts Limit
              {state.limitMode === 'time' && (
                <span className="text-[9px] px-1.5 py-0.2 bg-neutral-800 text-neutral-400 rounded">
                  Inactive
                </span>
              )}
            </span>
            <span className="text-xs font-semibold text-red-400">
              {state.dailyShortsLimit} Shorts
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {shortsPresets.map((count) => {
              const isActive = state.dailyShortsLimit === count;
              return (
                <button
                  key={count}
                  onClick={() => onUpdateState({ dailyShortsLimit: count })}
                  className={`py-1.5 px-0.5 rounded text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-red-500 text-white font-bold'
                      : 'bg-[#1e1f2b] text-neutral-300 hover:bg-[#2a2b3b] border border-[#272838]'
                  }`}
                >
                  {count}
                </button>
              );
            })}
            <button
              onClick={() => setCustomShortsOpen(!customShortsOpen)}
              className={`py-1.5 px-0.5 rounded text-[11px] font-semibold transition-all ${
                !shortsPresets.includes(state.dailyShortsLimit)
                  ? 'bg-red-500 text-white font-bold'
                  : 'bg-[#1e1f2b] text-neutral-300 hover:bg-[#2a2b3b] border border-[#272838]'
              }`}
            >
              Custom
            </button>
          </div>

          {customShortsOpen && (
            <div className="flex gap-1.5 mt-1">
              <input
                type="number"
                min="1"
                max="1000"
                value={customShortsVal}
                onChange={(e) => setCustomShortsVal(e.target.value)}
                placeholder="Shorts count"
                className="flex-1 bg-[#1e1f2b] border border-[#272838] rounded px-2 py-1 text-xs text-white outline-none focus:border-red-500"
              />
              <button
                onClick={handleCustomShortsSave}
                className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-red-600"
              >
                Set
              </button>
            </div>
          )}
        </div>

        {/* Reset Today's Usage */}
        <div className="pt-2 border-t border-[#272838]">
          <button
            onClick={() => setShowResetModal(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-transparent border border-[#272838] hover:bg-[#1e1f2b] text-neutral-300 text-xs font-medium py-2 px-3 rounded-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Today's Usage
          </button>
        </div>
      </div>

      {/* Emergency Access Section (Visually Separated) */}
      <div className="bg-[#141118] border border-[#361a20] rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded tracking-wider">
            OVERRIDE
          </span>
          <h3 className="text-[13px] font-bold text-red-300">
            Emergency Access
          </h3>
        </div>

        <p className="text-[11px] text-neutral-400 leading-tight">
          {isEmergencyActive
            ? 'Emergency unlock already used today.'
            : 'Need temporary access to Shorts?'}
        </p>

        <button
          disabled={isEmergencyActive}
          onClick={() => setShowEmergencyModal(true)}
          className={`text-xs font-semibold py-2 px-3 rounded-lg border transition-all ${
            isEmergencyActive
              ? 'bg-[#1a1a24] text-neutral-500 border-[#2b2b3b] cursor-not-allowed'
              : 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25 hover:text-white cursor-pointer'
          }`}
        >
          {isEmergencyActive ? 'Emergency Unlock Used' : 'Emergency Unlock'}
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl z-50">
          <div className="bg-[#15161e] border border-[#272838] rounded-xl p-4 w-full flex flex-col gap-2.5 shadow-2xl">
            <h4 className="font-bold text-sm text-white">Reset Usage?</h4>
            <p className="text-xs text-neutral-400">
              This will reset your watch time and Shorts view count for today back to zero.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 rounded border border-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetUsage();
                  setShowResetModal(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Unlock Confirmation Dialog */}
      {showEmergencyModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl z-50">
          <div className="bg-[#15161e] border border-[#361a20] rounded-xl p-4 w-full flex flex-col gap-2.5 shadow-2xl">
            <div className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white">Emergency Unlock</h4>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              You've reached today's Shorts restriction.
              Emergency access will allow Shorts again for the rest of today, while your usage continues to be tracked.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 rounded border border-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onEmergencyUnlock();
                  setShowEmergencyModal(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded shadow"
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
