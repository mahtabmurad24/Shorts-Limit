/**
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
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

    timeDisplay.textContent = `${formatTime(usedSec)} / ${formatTime(limitSec)}`;
    timeProgress.style.width = `${timeRatio}%`;

    // Shorts progress
    const watched = state.shortsWatched || 0;
    const limitShorts = state.dailyShortsLimit || 30;
    const shortsRatio = Math.min(100, Math.round((watched / limitShorts) * 100));

    shortsDisplay.textContent = `${watched} / ${limitShorts}`;
    shortsProgress.style.width = `${shortsRatio}%`;

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
    currentTimeLabel.textContent = `${limitMins} min`;

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

    currentShortsLabel.textContent = `${limitShorts} Shorts`;
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
