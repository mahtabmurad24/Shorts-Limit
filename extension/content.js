/**
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
    const match = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
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

    overlay.innerHTML = `
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
        <h2 class="sl-block-title">${title}</h2>
        <p class="sl-block-subtitle">${subtitle}</p>

        <div class="sl-stats-grid">
          <div class="sl-stat-box">
            <div class="sl-stat-label">Today's usage</div>
            <div class="sl-stat-value">${usedMins} / ${limitMins} minutes</div>
          </div>
          <div class="sl-stat-box">
            <div class="sl-stat-label">Shorts watched</div>
            <div class="sl-stat-value">${state.shortsWatched} / ${state.dailyShortsLimit} Shorts</div>
          </div>
        </div>

        <button id="sl-btn-back-home" class="sl-btn-home">
          Back to YouTube
        </button>
      </div>
    `;

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
