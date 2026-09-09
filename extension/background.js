/**
 * Shorts Limit - Background Service Worker (Manifest V3)
 * Handles storage, daily resets, centralized time tracking, view counting,
 * multi-tab synchronization, and limit enforcement.
 */

// Default settings and storage structure
const DEFAULT_STATE = {
  enabled: true,
  limitMode: "both",          // "both" | "time" | "shorts"
  dailyTimeLimitSeconds: 900, // 15 minutes default
  dailyShortsLimit: 30,       // 30 shorts default
  usedSeconds: 0,
  shortsWatched: 0,
  lastResetDate: getTodayDateString(),
  currentShortId: null,
  emergencyUnlocked: false,
  emergencyUnlockDate: ""
};

// Rate limiter for active time ticking to prevent double-counting across tabs
let lastTickTimestamp = 0;

/**
 * Returns the current date in local YYYY-MM-DD format.
 */
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves the current state from chrome.storage.local,
 * merging with default values if any are missing.
 */
async function getState() {
  const data = await chrome.storage.local.get(null);
  return { ...DEFAULT_STATE, ...data };
}

/**
 * Saves partial or full state to chrome.storage.local.
 */
async function saveState(partial) {
  await chrome.storage.local.set(partial);
}

/**
 * Performs daily reset check:
 * If the current local calendar date differs from state.lastResetDate,
 * resets usedSeconds, shortsWatched, currentShortId, and emergency unlock state.
 */
async function checkAndApplyDailyReset(state) {
  const today = getTodayDateString();
  if (state.lastResetDate !== today) {
    const updated = {
      ...state,
      usedSeconds: 0,
      shortsWatched: 0,
      currentShortId: null,
      emergencyUnlocked: false,
      emergencyUnlockDate: "",
      lastResetDate: today
    };
    await chrome.storage.local.set(updated);
    return updated;
  }
  return state;
}

/**
 * Evaluates whether any limit has been reached.
 * Returns { blocked: boolean, reason: 'time' | 'shorts' | 'both' | null }
 */
function evaluateLimits(state) {
  if (!state.enabled) {
    return { blocked: false, reason: null };
  }

  const today = getTodayDateString();
  // If emergency unlocked for today, allow Shorts access while continuing to track
  if (state.emergencyUnlocked && state.emergencyUnlockDate === today) {
    return { blocked: false, reason: null, emergencyUnlocked: true };
  }

  const mode = state.limitMode || "both";
  const checkTime = mode === "both" || mode === "time";
  const checkShorts = mode === "both" || mode === "shorts";

  const timeExceeded = checkTime && state.usedSeconds >= state.dailyTimeLimitSeconds;
  const shortsExceeded = checkShorts && state.shortsWatched >= state.dailyShortsLimit;

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
}

/**
 * Broadcasts status updates to all YouTube Shorts tabs.
 */
async function broadcastStatusToTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
    const state = await getState();
    const limitStatus = evaluateLimits(state);

    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "STATUS_UPDATE",
          state,
          limitStatus
        }).catch(() => {
          // Tab might be in non-content-script state, safely ignore
        });
      }
    }
  } catch (err) {
    console.error("[Shorts Limit] Broadcast error:", err);
  }
}

// Initialize on extension installation / startup
chrome.runtime.onInstalled.addListener(async () => {
  const current = await getState();
  const checked = await checkAndApplyDailyReset(current);
  await chrome.storage.local.set(checked);

  // Set up periodic alarm for checking daily date flip
  chrome.alarms.create("dailyResetCheck", { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(async () => {
  const current = await getState();
  await checkAndApplyDailyReset(current);
});

// Periodic alarm listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "dailyResetCheck") {
    const current = await getState();
    const checked = await checkAndApplyDailyReset(current);
    if (checked !== current) {
      broadcastStatusToTabs();
    }
  }
});

// Message listener from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    let state = await getState();
    state = await checkAndApplyDailyReset(state);

    switch (message.type) {
      case "GET_STATUS": {
        const limitStatus = evaluateLimits(state);
        sendResponse({ state, limitStatus });
        break;
      }

      // Time tracking heartbeat from active visible Shorts tab
      case "HEARTBEAT_TICK": {
        if (!state.enabled) {
          sendResponse({ state, limitStatus: { blocked: false } });
          return;
        }

        const limitStatusBefore = evaluateLimits(state);
        // If already blocked and not emergency unlocked, don't count and reply blocked
        if (limitStatusBefore.blocked) {
          sendResponse({ state, limitStatus: limitStatusBefore });
          return;
        }

        // Multi-tab anti-double-counting guard:
        // Ensure at most 1 second is added per 850ms interval across all tabs
        const now = Date.now();
        if (now - lastTickTimestamp >= 850) {
          lastTickTimestamp = now;
          state.usedSeconds += 1;
          await chrome.storage.local.set({ usedSeconds: state.usedSeconds });
        }

        const limitStatusAfter = evaluateLimits(state);
        if (limitStatusAfter.blocked) {
          broadcastStatusToTabs();
        }

        sendResponse({ state, limitStatus: limitStatusAfter });
        break;
      }

      // View count registration when navigating to a new Shorts video ID
      case "SHORTS_NAVIGATED": {
        const videoId = message.videoId;
        if (!videoId) {
          sendResponse({ state, limitStatus: evaluateLimits(state) });
          return;
        }

        // Check if this is truly a new Short
        if (state.currentShortId !== videoId) {
          // If enabled, count this new Short view
          if (state.enabled) {
            state.shortsWatched += 1;
            state.currentShortId = videoId;
            await chrome.storage.local.set({
              shortsWatched: state.shortsWatched,
              currentShortId: state.currentShortId
            });
          }
        }

        const limitStatus = evaluateLimits(state);
        if (limitStatus.blocked) {
          broadcastStatusToTabs();
        }

        sendResponse({ state, limitStatus });
        break;
      }

      // Triggered by Emergency Unlock from popup
      case "TRIGGER_EMERGENCY_UNLOCK": {
        const today = getTodayDateString();
        // Allowed only once per day
        if (!state.emergencyUnlocked || state.emergencyUnlockDate !== today) {
          state.emergencyUnlocked = true;
          state.emergencyUnlockDate = today;
          await chrome.storage.local.set({
            emergencyUnlocked: true,
            emergencyUnlockDate: today
          });
          broadcastStatusToTabs();
          sendResponse({ success: true, state, limitStatus: evaluateLimits(state) });
        } else {
          sendResponse({ success: false, message: "Emergency unlock already used today." });
        }
        break;
      }

      // Triggered by Reset Today's Usage in popup
      case "RESET_TODAY_USAGE": {
        state.usedSeconds = 0;
        state.shortsWatched = 0;
        state.currentShortId = null;
        await chrome.storage.local.set({
          usedSeconds: 0,
          shortsWatched: 0,
          currentShortId: null
        });
        broadcastStatusToTabs();
        sendResponse({ success: true, state, limitStatus: evaluateLimits(state) });
        break;
      }

      default:
        sendResponse({ state, limitStatus: evaluateLimits(state) });
        break;
    }
  })();

  return true; // Keep message channel open for async response
});
