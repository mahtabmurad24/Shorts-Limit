export type LimitMode = 'both' | 'time' | 'shorts';

export interface ExtensionState {
  enabled: boolean;
  limitMode: LimitMode;
  dailyTimeLimitSeconds: number;
  dailyShortsLimit: number;
  usedSeconds: number;
  shortsWatched: number;
  lastResetDate: string;
  currentShortId: string | null;
  emergencyUnlocked: boolean;
  emergencyUnlockDate: string;
}

export type BlockReason = 'time' | 'shorts' | 'both' | null;

export interface LimitEvaluation {
  blocked: boolean;
  reason: BlockReason;
  emergencyUnlocked?: boolean;
}

export interface SimulatedTab {
  id: number;
  title: string;
  url: string;
  shortId: string | null;
  isShorts: boolean;
}
