// Verbatim contents of all extension files for in-app code inspection and instant ZIP download

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const EXTENSION_MANIFEST = `{
  "manifest_version": 3,
  "name": "Shorts Limit",
  "version": "1.0.0",
  "description": "Limit YouTube Shorts using daily watch time and Shorts view count limits.",
  "permissions": [
    "storage",
    "alarms",
    "tabs"
  ],
  "host_permissions": [
    "*://*.youtube.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Shorts Limit",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.youtube.com/*"
      ],
      "js": [
        "content.js"
      ],
      "run_at": "document_start"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
`;

export const EXTENSION_BACKGROUND = `/**
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
  return \`\${year}-\${month}-\${day}\`;
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
`;

export const EXTENSION_CONTENT = `/**
 * Shorts Limit - Content Script (Manifest V3)
 * Injected into YouTube to track active Shorts time, count distinct Shorts views,
 * monitor SPA navigation, and display the anti-bypass block overlay when limits are hit.
 */

(() => {
  // Guard against duplicate injection
  if (window.__SHORTS_LIMIT_INITIALIZED__) return;
  window.__SHORTS_LIMIT_INITIALIZED__ = true;

  let currentVideoId = null;
  let lastCheckedUrl = location.href;
  let isCurrentlyBlocked = false;
  let heartbeatTimer = null;
  let blockObserver = null;

  /**
   * Helper: Extracts Shorts video ID from a URL pathname.
   * e.g. /shorts/ABC123 -> ABC123
   */
  function extractShortsVideoId(pathname) {
    if (!pathname) return null;
    const match = pathname.match(/^\\/shorts\\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Helper: Checks if the current page is a Shorts view.
   */
  function isShortsPage() {
    return location.pathname.startsWith("/shorts");
  }

  /**
   * Formats seconds into human-readable minutes (e.g. 15 / 15 minutes)
   */
  function formatMinutes(seconds) {
    const mins = Math.ceil(seconds / 60);
    return mins;
  }

  /**
   * Pauses all playing HTML5 videos on the page to prevent background audio.
   */
  function pauseAllVideos() {
    try {
      const videos = document.querySelectorAll("video");
      videos.forEach((video) => {
        if (!video.paused) {
          video.pause();
        }
      });
    } catch (e) {
      // Ignore errors if DOM is inaccessible
    }
  }

  /**
   * Builds and inserts the Block Screen overlay.
   * Strictly adheres to design specifications:
   * - Centered card
   * - Dynamic title matching exceeded limit
   * - Accurate usage & count statistics
   * - [ Back to YouTube ] button navigating to https://www.youtube.com/
   * - NO Emergency Unlock button on this screen.
   */
  function showBlockScreen(state, limitStatus) {
    isCurrentlyBlocked = true;
    pauseAllVideos();

    let overlay = document.getElementById("shorts-limit-block-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "shorts-limit-block-overlay";
      document.documentElement.appendChild(overlay);
    }

    // Determine dynamic title and subtitle
    let title = "Shorts Limit Reached";
    let subtitle = "You've reached your Shorts limit for today.";

    if (limitStatus.reason === "time") {
      title = "Time Limit Reached";
      subtitle = "You've used all your Shorts time for today.";
    } else if (limitStatus.reason === "shorts") {
      title = "Shorts Limit Reached";
      subtitle = "You've reached your maximum number of Shorts for today.";
    } else if (limitStatus.reason === "both") {
      title = "Daily Shorts Limit Reached";
      subtitle = "You've reached both of your Shorts limits for today.";
    }

    const usedMins = formatMinutes(state.usedSeconds);
    const limitMins = formatMinutes(state.dailyTimeLimitSeconds);

    overlay.innerHTML = \`
      <style>
        #shorts-limit-block-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background-color: rgba(11, 11, 15, 0.98) !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          color: #f3f4f6 !important;
          backdrop-filter: blur(12px) !important;
          pointer-events: all !important;
          user-select: none !important;
        }

        .sl-block-card {
          background: #18181f !important;
          border: 1px solid #2a2a38 !important;
          border-radius: 16px !important;
          padding: 36px 32px !important;
          max-width: 440px !important;
          width: 90% !important;
          text-align: center !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6) !important;
        }

        .sl-icon-wrapper {
          width: 60px !important;
          height: 60px !important;
          border-radius: 50% !important;
          background: rgba(239, 68, 68, 0.12) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 auto 20px auto !important;
          color: #ef4444 !important;
        }

        .sl-icon-wrapper svg {
          width: 30px !important;
          height: 30px !important;
          stroke: currentColor !important;
          stroke-width: 2.2 !important;
          fill: none !important;
        }

        .sl-block-title {
          font-size: 22px !important;
          font-weight: 700 !important;
          color: #ffffff !important;
          margin: 0 0 8px 0 !important;
          letter-spacing: -0.02em !important;
        }

        .sl-block-subtitle {
          font-size: 14px !important;
          color: #9ca3af !important;
          margin: 0 0 26px 0 !important;
          line-height: 1.5 !important;
        }

        .sl-stats-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 12px !important;
          margin-bottom: 28px !important;
        }

        .sl-stat-box {
          background: #20202b !important;
          border: 1px solid #2d2d3d !important;
          border-radius: 12px !important;
          padding: 14px 10px !important;
        }

        .sl-stat-label {
          font-size: 12px !important;
          font-weight: 500 !important;
          color: #9ca3af !important;
          margin-bottom: 6px !important;
          text-transform: none !important;
        }

        .sl-stat-value {
          font-size: 17px !important;
          font-weight: 700 !important;
          color: #f3f4f6 !important;
        }

        .sl-btn-home {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          padding: 13px 20px !important;
          background: #ef4444 !important;
          color: #ffffff !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          border: none !important;
          border-radius: 10px !important;
          cursor: pointer !important;
          text-decoration: none !important;
          transition: background 0.15s ease !important;
        }

        .sl-btn-home:hover {
          background: #dc2626 !important;
        }
      </style>

      <div class="sl-block-card">
        <div class="sl-icon-wrapper">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
        </div>
        <h2 class="sl-block-title">\${title}</h2>
        <p class="sl-block-subtitle">\${subtitle}</p>

        <div class="sl-stats-grid">
          <div class="sl-stat-box">
            <div class="sl-stat-label">Today's usage</div>
            <div class="sl-stat-value">\${usedMins} / \${limitMins} minutes</div>
          </div>
          <div class="sl-stat-box">
            <div class="sl-stat-label">Shorts watched</div>
            <div class="sl-stat-value">\${state.shortsWatched} / \${state.dailyShortsLimit} Shorts</div>
          </div>
        </div>

        <button id="sl-btn-back-home" class="sl-btn-home">
          Back to YouTube
        </button>
      </div>
    \`;

    const backBtn = overlay.querySelector("#sl-btn-back-home");
    if (backBtn) {
      backBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = "https://www.youtube.com/";
      };
    }
  }

  /**
   * Removes the Block Screen overlay if present.
   */
  function hideBlockScreen() {
    isCurrentlyBlocked = false;
    const overlay = document.getElementById("shorts-limit-block-overlay");
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Checks current status with the background service worker.
   */
  function checkStatus() {
    if (!chrome.runtime?.id) return;

    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (chrome.runtime.lastError || !response) return;

      const { state, limitStatus } = response;
      if (!isShortsPage()) {
        hideBlockScreen();
        return;
      }

      if (limitStatus.blocked) {
        showBlockScreen(state, limitStatus);
      } else {
        hideBlockScreen();
      }
    });
  }

  /**
   * Handles navigation event: checks if a new Short video ID is present.
   */
  function handleUrlChange() {
    const newUrl = location.href;
    if (newUrl === lastCheckedUrl && !isShortsPage()) {
      return;
    }
    lastCheckedUrl = newUrl;

    if (!isShortsPage()) {
      hideBlockScreen();
      return;
    }

    const videoId = extractShortsVideoId(location.pathname);
    if (videoId && videoId !== currentVideoId) {
      currentVideoId = videoId;
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage(
          { type: "SHORTS_NAVIGATED", videoId },
          (response) => {
            if (chrome.runtime.lastError || !response) return;
            if (response.limitStatus?.blocked) {
              showBlockScreen(response.state, response.limitStatus);
            } else {
              hideBlockScreen();
            }
          }
        );
      }
    } else {
      checkStatus();
    }
  }

  /**
   * Starts active time tracking heartbeat.
   * Only ticks when:
   * 1. Currently on /shorts/* page
   * 2. Document is visible (!document.hidden)
   * 3. Window has active focus (document.hasFocus())
   * 4. Not currently blocked
   */
  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(() => {
      // Must be on shorts, visible, and window focused
      if (!isShortsPage()) return;
      if (document.hidden) return;
      if (!document.hasFocus()) return;
      if (isCurrentlyBlocked) {
        pauseAllVideos();
        return;
      }

      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: "HEARTBEAT_TICK" }, (response) => {
          if (chrome.runtime.lastError || !response) return;
          if (response.limitStatus?.blocked) {
            showBlockScreen(response.state, response.limitStatus);
          }
        });
      }
    }, 1000);
  }

  /**
   * Anti-Bypass Guard:
   * Continuously ensures overlay persists if limit is reached
   * and prevents playback while blocked.
   */
  function setupAntiBypassObserver() {
    if (blockObserver) blockObserver.disconnect();

    blockObserver = new MutationObserver(() => {
      if (isCurrentlyBlocked && isShortsPage()) {
        pauseAllVideos();
        const overlay = document.getElementById("shorts-limit-block-overlay");
        if (!overlay) {
          checkStatus();
        }
      }
    });

    blockObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Hook YouTube SPA navigation events
  window.addEventListener("yt-navigate-finish", handleUrlChange);
  window.addEventListener("yt-page-data-updated", handleUrlChange);
  window.addEventListener("popstate", handleUrlChange);

  // Fallback poller for fast SPA transitions
  setInterval(() => {
    if (location.href !== lastCheckedUrl) {
      handleUrlChange();
    }
  }, 250);

  // Page visibility & focus listeners to immediately update video pausing or status
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      checkStatus();
    }
  });

  window.addEventListener("focus", () => {
    checkStatus();
  });

  // Listen to messages from background (broadcast or emergency unlock)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "STATUS_UPDATE") {
      if (!isShortsPage()) {
        hideBlockScreen();
        return;
      }
      if (message.limitStatus?.blocked) {
        showBlockScreen(message.state, message.limitStatus);
      } else {
        hideBlockScreen();
      }
    }
  });

  // Listen to storage changes for instant multi-tab sync
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      checkStatus();
    }
  });

  // Initialize
  handleUrlChange();
  startHeartbeat();
  setupAntiBypassObserver();
})();
`;

export const EXTENSION_POPUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shorts Limit</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <h1 class="brand-title">Shorts Limit</h1>
      </div>
      <label class="switch" title="Enable / Disable Shorts Limit">
        <input type="checkbox" id="toggle-enabled" checked>
        <span class="slider"></span>
      </label>
    </header>

    <!-- Today's Progress Card -->
    <section class="card progress-card">
      <div class="card-header">
        <span class="card-subtitle">TODAY'S ACTIVITY</span>
        <span id="badge-status" class="status-badge active">Active</span>
      </div>

      <!-- Time Usage -->
      <div class="stat-group">
        <div class="stat-meta">
          <span class="stat-label">Watch Time</span>
          <span class="stat-fraction" id="time-display">00:00 / 15:00</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="time-progress" style="width: 0%"></div>
        </div>
      </div>

      <!-- Shorts Views -->
      <div class="stat-group">
        <div class="stat-meta">
          <span class="stat-label">Shorts Watched</span>
          <span class="stat-fraction" id="shorts-display">0 / 30</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="shorts-progress" style="width: 0%"></div>
        </div>
      </div>
    </section>

    <!-- Settings Section -->
    <section class="card settings-card">
      <div class="settings-header-row">
        <h2 class="section-title">Daily Restrictions</h2>
      </div>

      <!-- Restriction Mode Selector -->
      <div class="mode-selector-group">
        <div class="mode-label-row">
          <span class="setting-title">Enforce Limits</span>
          <span class="mode-active-summary" id="mode-summary">Both Active</span>
        </div>
        <div class="mode-toggle-grid" id="mode-selector">
          <button class="mode-btn active" data-mode="both">Both Together</button>
          <button class="mode-btn" data-mode="time">Time Only</button>
          <button class="mode-btn" data-mode="shorts">Shorts Only</button>
        </div>
      </div>

      <!-- Time Limit Presets -->
      <div class="setting-item" id="time-setting-item">
        <div class="setting-label-row">
          <span class="setting-title">
            Daily Time Limit
            <span class="inactive-tag hidden" id="time-inactive-tag">Inactive</span>
          </span>
          <span class="current-limit-val" id="current-time-label">15 min</span>
        </div>
        <div class="preset-grid" id="time-presets">
          <button class="preset-btn" data-time="300">5m</button>
          <button class="preset-btn" data-time="600">10m</button>
          <button class="preset-btn active" data-time="900">15m</button>
          <button class="preset-btn" data-time="1200">20m</button>
          <button class="preset-btn" data-time="1800">30m</button>
          <button class="preset-btn custom-toggle" id="time-custom-toggle">Custom</button>
        </div>
        <div class="custom-input-row hidden" id="time-custom-row">
          <input type="number" id="time-custom-input" min="1" max="720" placeholder="Minutes">
          <button class="btn-save-custom" id="time-custom-save">Set</button>
        </div>
      </div>

      <!-- Shorts Limit Presets -->
      <div class="setting-item" id="shorts-setting-item">
        <div class="setting-label-row">
          <span class="setting-title">
            Daily Shorts Limit
            <span class="inactive-tag hidden" id="shorts-inactive-tag">Inactive</span>
          </span>
          <span class="current-limit-val" id="current-shorts-label">30 Shorts</span>
        </div>
        <div class="preset-grid" id="shorts-presets">
          <button class="preset-btn" data-shorts="10">10</button>
          <button class="preset-btn" data-shorts="20">20</button>
          <button class="preset-btn active" data-shorts="30">30</button>
          <button class="preset-btn" data-shorts="50">50</button>
          <button class="preset-btn" data-shorts="100">100</button>
          <button class="preset-btn custom-toggle" id="shorts-custom-toggle">Custom</button>
        </div>
        <div class="custom-input-row hidden" id="shorts-custom-row">
          <input type="number" id="shorts-custom-input" min="1" max="1000" placeholder="Count">
          <button class="btn-save-custom" id="shorts-custom-save">Set</button>
        </div>
      </div>

      <!-- Reset Today's Usage -->
      <div class="reset-row">
        <button class="btn-secondary" id="btn-reset-usage">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset Today's Usage
        </button>
      </div>
    </section>

    <!-- Emergency Access Section (Visually Separated) -->
    <section class="card emergency-card" id="emergency-section">
      <div class="emergency-header">
        <span class="emergency-tag">OVERRIDE</span>
        <h3 class="emergency-title">Emergency Access</h3>
      </div>
      <p class="emergency-desc" id="emergency-desc">
        Need temporary access to Shorts?
      </p>
      <button class="btn-emergency" id="btn-emergency-unlock">
        Emergency Unlock
      </button>
    </section>

    <!-- Reset Confirmation Modal -->
    <div class="modal-backdrop hidden" id="reset-modal">
      <div class="modal-dialog">
        <h4 class="modal-title">Reset Usage?</h4>
        <p class="modal-body">This will reset your watch time and Shorts view count for today back to zero.</p>
        <div class="modal-actions">
          <button class="btn-dialog-cancel" id="btn-cancel-reset">Cancel</button>
          <button class="btn-dialog-danger" id="btn-confirm-reset">Reset</button>
        </div>
      </div>
    </div>

    <!-- Emergency Unlock Confirmation Modal -->
    <div class="modal-backdrop hidden" id="emergency-modal">
      <div class="modal-dialog">
        <h4 class="modal-title">Emergency Unlock</h4>
        <p class="modal-body">
          You've reached today's Shorts restriction.
          Emergency access will allow Shorts again for the rest of today, while your usage continues to be tracked.
        </p>
        <div class="modal-actions">
          <button class="btn-dialog-cancel" id="btn-cancel-emergency">Cancel</button>
          <button class="btn-dialog-confirm" id="btn-confirm-emergency">Unlock for Today</button>
        </div>
      </div>
    </div>

  </div>
  <script src="popup.js"></script>
</body>
</html>
`;

export const EXTENSION_POPUP_CSS = `/* Shorts Limit - Modern Dark Popup Styling */

:root {
  --bg-main: #0c0d13;
  --bg-card: #141520;
  --bg-elevated: #1c1d2c;
  --bg-input: #1e2030;
  --border-subtle: #26273c;
  --border-card: #27283c;
  --border-focus: #ef4444;
  --text-primary: #f3f4f6;
  --text-secondary: #d1d5db;
  --text-muted: #9ca3af;
  --accent-red: #ef4444;
  --accent-red-hover: #dc2626;
  --accent-green: #10b981;
  --accent-amber: #f59e0b;
  --font-stack: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 380px;
  background-color: var(--bg-main);
  color: var(--text-primary);
  font-family: var(--font-stack);
  font-size: 14px;
  line-height: 1.5;
  user-select: none;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

.popup-container {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 2px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--accent-red);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #ffffff;
  line-height: 1.1;
}

.brand-subtitle {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #374151;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

input:checked + .slider {
  background-color: var(--accent-red);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* Cards */
.card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Progress Card */
.progress-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-subtitle {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-green);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-badge.blocked {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-badge.unlocked {
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-amber);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-fraction {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.progress-track {
  height: 8px;
  background-color: var(--bg-elevated);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f87171);
  border-radius: 9999px;
  transition: width 0.3s ease;
}

/* Settings Card */
.settings-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Restriction Mode Selector */
.mode-selector-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  padding: 12px;
}

.mode-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-label-row span {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.mode-active-summary {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-red);
}

.mode-toggle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mode-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  white-space: nowrap;
}

.mode-btn:hover {
  background: #2a2c42;
  color: #fff;
}

.mode-btn.active {
  background: var(--accent-red);
  border-color: var(--accent-red);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
}

.inactive-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  background: rgba(107, 114, 128, 0.25);
  color: #9ca3af;
  border-radius: 6px;
  margin-left: 6px;
  letter-spacing: 0.02em;
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.inactive-tag.hidden {
  display: none;
}

.setting-item.inactive {
  opacity: 0.45;
  pointer-events: none;
  filter: grayscale(0.5);
  transition: opacity 0.2s ease;
}

.stat-group.inactive {
  opacity: 0.5;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 0.2s ease;
}

.setting-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.current-limit-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-red);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.preset-btn {
  background: var(--bg-elevated);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.preset-btn:hover {
  background: #2a2c42;
  color: #fff;
}

.preset-btn.active {
  background: var(--accent-red);
  border-color: var(--accent-red);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);
}

.custom-input-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.custom-input-row.hidden {
  display: none;
}

.custom-input-row input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  padding: 7px 12px;
  outline: none;
}

.custom-input-row input:focus {
  border-color: var(--accent-red);
}

.btn-save-custom {
  background: var(--accent-red);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 0 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-save-custom:hover {
  background: var(--accent-red-hover);
}

/* Reset Button */
.reset-row {
  padding-top: 8px;
  border-top: 1px solid var(--border-card);
}

.btn-secondary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--border-card);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 9px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: #3b3c4f;
}

/* Emergency Card */
.emergency-card {
  background: #151119;
  border: 1px solid #3b1c24;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.emergency-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emergency-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-radius: 4px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  letter-spacing: 0.05em;
}

.emergency-title {
  font-size: 14px;
  font-weight: 700;
  color: #fca5a5;
}

.emergency-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.btn-emergency {
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(239, 68, 68, 0.45);
  border-radius: 10px;
  color: #fca5a5;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-emergency:hover:not(:disabled) {
  background: var(--accent-red);
  border-color: var(--accent-red);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
}

.btn-emergency:disabled {
  background: #1a1a24;
  border-color: #2b2b3b;
  color: #555869;
  cursor: not-allowed;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  z-index: 100;
}

.modal-backdrop.hidden {
  display: none;
}

.modal-dialog {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 14px;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.modal-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.btn-dialog-cancel {
  background: transparent;
  border: 1px solid var(--border-card);
  color: var(--text-secondary);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
}

.btn-dialog-cancel:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-dialog-danger {
  background: var(--accent-red);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 16px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
}

.btn-dialog-danger:hover {
  background: var(--accent-red-hover);
}

.btn-dialog-confirm {
  background: #f59e0b;
  color: #111827;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 16px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}

.btn-dialog-confirm:hover {
  background: #d97706;
}
`;

export const EXTENSION_POPUP_JS = `/**
 * Shorts Limit - Popup Controller
 * Manages configuration UI, live progress indicators, limit settings,
 * confirmation modals, and emergency unlock operations.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const toggleEnabled = document.getElementById("toggle-enabled");
  const badgeStatus = document.getElementById("badge-status");
  const timeDisplay = document.getElementById("time-display");
  const timeProgress = document.getElementById("time-progress");
  const shortsDisplay = document.getElementById("shorts-display");
  const shortsProgress = document.getElementById("shorts-progress");

  const currentTimeLabel = document.getElementById("current-time-label");
  const timeSettingItem = document.getElementById("time-setting-item");
  const timeInactiveTag = document.getElementById("time-inactive-tag");
  const timePresetsContainer = document.getElementById("time-presets");
  const timeCustomToggle = document.getElementById("time-custom-toggle");
  const timeCustomRow = document.getElementById("time-custom-row");
  const timeCustomInput = document.getElementById("time-custom-input");
  const timeCustomSave = document.getElementById("time-custom-save");

  const currentShortsLabel = document.getElementById("current-shorts-label");
  const shortsSettingItem = document.getElementById("shorts-setting-item");
  const shortsInactiveTag = document.getElementById("shorts-inactive-tag");
  const shortsPresetsContainer = document.getElementById("shorts-presets");
  const shortsCustomToggle = document.getElementById("shorts-custom-toggle");
  const shortsCustomRow = document.getElementById("shorts-custom-row");
  const shortsCustomInput = document.getElementById("shorts-custom-input");
  const shortsCustomSave = document.getElementById("shorts-custom-save");

  const modeSelector = document.getElementById("mode-selector");
  const modeSummary = document.getElementById("mode-summary");

  const btnResetUsage = document.getElementById("btn-reset-usage");
  const resetModal = document.getElementById("reset-modal");
  const btnCancelReset = document.getElementById("btn-cancel-reset");
  const btnConfirmReset = document.getElementById("btn-confirm-reset");

  const emergencyDesc = document.getElementById("emergency-desc");
  const btnEmergencyUnlock = document.getElementById("btn-emergency-unlock");
  const emergencyModal = document.getElementById("emergency-modal");
  const btnCancelEmergency = document.getElementById("btn-cancel-emergency");
  const btnConfirmEmergency = document.getElementById("btn-confirm-emergency");

  let currentState = null;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return \`\${String(mins).padStart(2, "0")}:\${String(secs).padStart(2, "0")}\`;
  }

  function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return \`\${year}-\${month}-\${day}\`;
  }

  function renderState(state) {
    if (!state) return;
    currentState = state;

    // Toggle
    toggleEnabled.checked = !!state.enabled;

    // Time progress
    const usedSec = state.usedSeconds || 0;
    const limitSec = state.dailyTimeLimitSeconds || 900;
    const timeRatio = Math.min(100, Math.round((usedSec / limitSec) * 100));

    timeDisplay.textContent = \`\${formatTime(usedSec)} / \${formatTime(limitSec)}\`;
    timeProgress.style.width = \`\${timeRatio}%\`;

    // Shorts progress
    const watched = state.shortsWatched || 0;
    const limitShorts = state.dailyShortsLimit || 30;
    const shortsRatio = Math.min(100, Math.round((watched / limitShorts) * 100));

    shortsDisplay.textContent = \`\${watched} / \${limitShorts}\`;
    shortsProgress.style.width = \`\${shortsRatio}%\`;

    // Status Badge
    const today = getTodayDateString();
    const isEmergency = state.emergencyUnlocked && state.emergencyUnlockDate === today;
    const mode = state.limitMode || "both";
    const checkTime = mode === "both" || mode === "time";
    const checkShorts = mode === "both" || mode === "shorts";
    const isExceeded = (checkTime && usedSec >= limitSec) || (checkShorts && watched >= limitShorts);

    if (!state.enabled) {
      badgeStatus.className = "status-badge";
      badgeStatus.textContent = "Disabled";
      badgeStatus.style.background = "#374151";
      badgeStatus.style.color = "#9ca3af";
    } else if (isEmergency) {
      badgeStatus.className = "status-badge unlocked";
      badgeStatus.textContent = "Emergency Access";
    } else if (isExceeded) {
      badgeStatus.className = "status-badge blocked";
      badgeStatus.textContent = "Limit Reached";
    } else {
      badgeStatus.className = "status-badge active";
      badgeStatus.textContent = "Active";
    }

    // Restriction Mode UI updates
    const modeBtns = modeSelector.querySelectorAll(".mode-btn");
    modeBtns.forEach((btn) => {
      if (btn.dataset.mode === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    if (mode === "both") {
      modeSummary.textContent = "Both Active";
      timeSettingItem.classList.remove("inactive");
      timeInactiveTag.classList.add("hidden");
      shortsSettingItem.classList.remove("inactive");
      shortsInactiveTag.classList.add("hidden");
    } else if (mode === "time") {
      modeSummary.textContent = "Time Only Active";
      timeSettingItem.classList.remove("inactive");
      timeInactiveTag.classList.add("hidden");
      shortsSettingItem.classList.add("inactive");
      shortsInactiveTag.classList.remove("hidden");
    } else if (mode === "shorts") {
      modeSummary.textContent = "Shorts Only Active";
      timeSettingItem.classList.add("inactive");
      timeInactiveTag.classList.remove("hidden");
      shortsSettingItem.classList.remove("inactive");
      shortsInactiveTag.classList.add("hidden");
    }

    // Settings labels & active preset highlights
    const limitMins = Math.round(limitSec / 60);
    currentTimeLabel.textContent = \`\${limitMins} min\`;

    const timeBtns = timePresetsContainer.querySelectorAll(".preset-btn[data-time]");
    let matchedTimePreset = false;
    timeBtns.forEach((btn) => {
      const btnTime = parseInt(btn.dataset.time, 10);
      if (btnTime === limitSec) {
        btn.classList.add("active");
        matchedTimePreset = true;
      } else {
        btn.classList.remove("active");
      }
    });
    if (!matchedTimePreset) {
      timeCustomToggle.classList.add("active");
    } else {
      timeCustomToggle.classList.remove("active");
    }

    currentShortsLabel.textContent = \`\${limitShorts} Shorts\`;
    const shortsBtns = shortsPresetsContainer.querySelectorAll(".preset-btn[data-shorts]");
    let matchedShortsPreset = false;
    shortsBtns.forEach((btn) => {
      const btnCount = parseInt(btn.dataset.shorts, 10);
      if (btnCount === limitShorts) {
        btn.classList.add("active");
        matchedShortsPreset = true;
      } else {
        btn.classList.remove("active");
      }
    });
    if (!matchedShortsPreset) {
      shortsCustomToggle.classList.add("active");
    } else {
      shortsCustomToggle.classList.remove("active");
    }

    // Emergency Access UI
    if (isEmergency) {
      emergencyDesc.textContent = "Emergency unlock already used today.";
      btnEmergencyUnlock.textContent = "Emergency Unlock Used";
      btnEmergencyUnlock.disabled = true;
    } else {
      emergencyDesc.textContent = "Need temporary access to Shorts?";
      btnEmergencyUnlock.textContent = "Emergency Unlock";
      btnEmergencyUnlock.disabled = false;
    }
  }

  // Load Initial State
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
    if (res?.state) {
      renderState(res.state);
    }
  });

  // Storage listener for live ticker while popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      chrome.storage.local.get(null, (state) => {
        renderState(state);
      });
    }
  });

  // Enable/Disable toggle
  toggleEnabled.addEventListener("change", () => {
    const enabled = toggleEnabled.checked;
    chrome.storage.local.set({ enabled });
  });

  // Mode Selector buttons (Both / Time Only / Shorts Only)
  modeSelector.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-btn");
    if (btn && btn.dataset.mode) {
      const mode = btn.dataset.mode;
      chrome.storage.local.set({ limitMode: mode });
    }
  });

  // Time preset buttons
  timePresetsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset-btn[data-time]");
    if (btn) {
      const timeSec = parseInt(btn.dataset.time, 10);
      timeCustomRow.classList.add("hidden");
      chrome.storage.local.set({ dailyTimeLimitSeconds: timeSec });
    }
  });

  timeCustomToggle.addEventListener("click", () => {
    timeCustomRow.classList.toggle("hidden");
    if (!timeCustomRow.classList.contains("hidden")) {
      timeCustomInput.focus();
    }
  });

  timeCustomSave.addEventListener("click", () => {
    const mins = parseInt(timeCustomInput.value, 10);
    if (mins && mins > 0) {
      const sec = mins * 60;
      timeCustomRow.classList.add("hidden");
      timeCustomInput.value = "";
      chrome.storage.local.set({ dailyTimeLimitSeconds: sec });
    }
  });

  // Shorts preset buttons
  shortsPresetsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset-btn[data-shorts]");
    if (btn) {
      const count = parseInt(btn.dataset.shorts, 10);
      shortsCustomRow.classList.add("hidden");
      chrome.storage.local.set({ dailyShortsLimit: count });
    }
  });

  shortsCustomToggle.addEventListener("click", () => {
    shortsCustomRow.classList.toggle("hidden");
    if (!shortsCustomRow.classList.contains("hidden")) {
      shortsCustomInput.focus();
    }
  });

  shortsCustomSave.addEventListener("click", () => {
    const count = parseInt(shortsCustomInput.value, 10);
    if (count && count > 0) {
      shortsCustomRow.classList.add("hidden");
      shortsCustomInput.value = "";
      chrome.storage.local.set({ dailyShortsLimit: count });
    }
  });

  // Reset Today's Usage Modal
  btnResetUsage.addEventListener("click", () => {
    resetModal.classList.remove("hidden");
  });

  btnCancelReset.addEventListener("click", () => {
    resetModal.classList.add("hidden");
  });

  btnConfirmReset.addEventListener("click", () => {
    resetModal.classList.add("hidden");
    chrome.runtime.sendMessage({ type: "RESET_TODAY_USAGE" }, (res) => {
      if (res?.state) {
        renderState(res.state);
      }
    });
  });

  // Emergency Unlock Modal
  btnEmergencyUnlock.addEventListener("click", () => {
    if (btnEmergencyUnlock.disabled) return;
    emergencyModal.classList.remove("hidden");
  });

  btnCancelEmergency.addEventListener("click", () => {
    emergencyModal.classList.add("hidden");
  });

  btnConfirmEmergency.addEventListener("click", () => {
    emergencyModal.classList.add("hidden");
    chrome.runtime.sendMessage({ type: "TRIGGER_EMERGENCY_UNLOCK" }, (res) => {
      if (res?.state) {
        renderState(res.state);
      }
    });
  });
});
`;

export const ALL_EXTENSION_FILES: ExtensionFile[] = [
  {
    name: "manifest.json",
    path: "manifest.json",
    language: "json",
    description: "Manifest V3 declaration, permissions (storage, alarms, tabs), background worker and content scripts",
    content: EXTENSION_MANIFEST
  },
  {
    name: "background.js",
    path: "background.js",
    language: "javascript",
    description: "Service worker managing storage, daily date reset, rate-limited time ticks, Shorts counter, multi-tab sync, and limit mode",
    content: EXTENSION_BACKGROUND
  },
  {
    name: "content.js",
    path: "content.js",
    language: "javascript",
    description: "Content script tracking active Shorts page, SPA transitions, video ID extraction, anti-bypass block screen",
    content: EXTENSION_CONTENT
  },
  {
    name: "popup.html",
    path: "popup.html",
    language: "html",
    description: "Compact 360px popup HTML with mode toggle (both / time only / shorts only), presets, modals, and emergency access",
    content: EXTENSION_POPUP_HTML
  },
  {
    name: "popup.css",
    path: "popup.css",
    language: "css",
    description: "Polished dark UI styles, smooth animations, mode switcher, switch controls, and accessible typography",
    content: EXTENSION_POPUP_CSS
  },
  {
    name: "popup.js",
    path: "popup.js",
    language: "javascript",
    description: "Popup client script coordinating real-time stats, limit mode selection, limit presets, reset confirm, and emergency unlock",
    content: EXTENSION_POPUP_JS
  }
];
