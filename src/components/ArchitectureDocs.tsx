import React from 'react';
import {
  Clock,
  PlaySquare,
  Layers,
  Calendar,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 text-neutral-300 text-sm">
      {/* Installation Guide Card */}
      <div className="bg-[#15161e] border border-[#272838] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2.5 text-white mb-4">
          <Terminal className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-bold">Manual Installation Instructions</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono">
            No Chrome Web Store needed
          </span>
        </div>

        <ol className="list-decimal list-inside space-y-2.5 text-xs text-neutral-300 leading-relaxed pl-1">
          <li>
            Click the <strong className="text-white">"Download Extension (.ZIP)"</strong> button at the top of this page.
          </li>
          <li>
            Extract the downloaded <code className="text-red-400 bg-neutral-900 px-1.5 py-0.5 rounded">shorts-limit-extension.zip</code> file to a folder on your computer (e.g. <code className="text-red-400 bg-neutral-900 px-1.5 py-0.5 rounded">~/Downloads/Shorts-Limit</code>).
          </li>
          <li>
            Open Google Chrome (or Chromium, Brave, Edge, Arc) and enter <code className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">chrome://extensions</code> in your address bar.
          </li>
          <li>
            In the top-right corner of the Extensions page, toggle on <strong className="text-white">Developer mode</strong>.
          </li>
          <li>
            In the top-left toolbar, click the <strong className="text-white">Load unpacked</strong> button.
          </li>
          <li>
            Select the folder where you extracted the extension files (the folder containing <code className="text-white">manifest.json</code>).
          </li>
          <li>
            The <strong className="text-white">Shorts Limit</strong> extension icon will appear in your Chrome toolbar. Pin it to access your daily stats and limits at any time!
          </li>
        </ol>
      </div>

      {/* Deep Dive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Time Tracking */}
        <div className="bg-[#15161e] border border-[#272838] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Clock className="w-4 h-4 text-red-400" />
            <h4>1. How Time Tracking Works</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Time tracking measures actual active attention on YouTube Shorts. The content script monitors the player and verifies four strict criteria before transmitting a heartbeat tick:
          </p>
          <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
            <li><strong>Path check:</strong> URL must begin with <code className="text-red-400">/shorts/</code>. Leaving Shorts pauses the timer immediately.</li>
            <li><strong>Visibility API:</strong> Uses <code className="text-neutral-200">document.hidden</code> and the <code className="text-neutral-200">visibilitychange</code> event. Background tabs never accumulate time.</li>
            <li><strong>Focus check:</strong> Uses <code className="text-neutral-200">document.hasFocus()</code> so time stops if Chrome is unfocused or minimized.</li>
            <li><strong>Anti-tamper persistence:</strong> Stored in <code className="text-neutral-200">chrome.storage.local</code>. Page reloads, browser restarts, and navigations never reset the timer.</li>
          </ul>
        </div>

        {/* 2. Shorts View Counting */}
        <div className="bg-[#15161e] border border-[#272838] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <PlaySquare className="w-4 h-4 text-red-400" />
            <h4>2. How Shorts Counting Works</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            To prevent accidental double-counting from React re-renders, SPA history pushes, or page reloads, each video is identified by its unique video ID (e.g. <code className="text-neutral-200">/shorts/ABC123</code> → ID <code className="text-neutral-200">ABC123</code>):
          </p>
          <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
            <li><strong>Unique session ID:</strong> The background worker tracks <code className="text-neutral-200">currentShortId</code>.</li>
            <li><strong>Refresh immunity:</strong> If you refresh <code className="text-red-400">/shorts/ABC123</code>, <code className="text-neutral-200">currentShortId === videoId</code>, so count does not increment.</li>
            <li><strong>SPA Transition hook:</strong> Listens to <code className="text-neutral-200">yt-navigate-finish</code>, <code className="text-neutral-200">popstate</code>, and fallback URL diffing to catch next/previous reel transitions.</li>
            <li><strong>New video registration:</strong> Moving to <code className="text-red-400">/shorts/DEF456</code> increments the counter by 1 and stores the new ID.</li>
          </ul>
        </div>

        {/* 3. Multi-Tab Synchronization */}
        <div className="bg-[#15161e] border border-[#272838] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Layers className="w-4 h-4 text-red-400" />
            <h4>3. How Multiple Tabs Are Handled</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Users frequently open YouTube across multiple tabs or windows. Shorts Limit coordinates them through a centralized background service worker:
          </p>
          <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
            <li><strong>Shared global state:</strong> All tabs read and report to the same <code className="text-neutral-200">chrome.storage.local</code> database.</li>
            <li><strong>Tick rate limiter:</strong> The background worker enforces a strict 850ms rate limiter. Even if two tabs heartbeat simultaneously, at most 1 second of watch time is added per real second.</li>
            <li><strong>Broadcast enforcement:</strong> When a limit is reached in any tab, the background worker broadcasts a <code className="text-neutral-200">STATUS_UPDATE</code> to all open YouTube tabs to block them immediately.</li>
          </ul>
        </div>

        {/* 4. Daily Reset */}
        <div className="bg-[#15161e] border border-[#272838] rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Calendar className="w-4 h-4 text-red-400" />
            <h4>4. How the Daily Reset Works</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The extension automatically resets your usage at midnight based on your local calendar date:
          </p>
          <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
            <li><strong>Local calendar format:</strong> Uses local date string format <code className="text-neutral-200">YYYY-MM-DD</code> (e.g. <code className="text-neutral-200">2026-09-09</code>).</li>
            <li><strong>Automatic evaluation:</strong> Checked on every heartbeat, every navigation, browser startup, and via a recurring <code className="text-neutral-200">chrome.alarms</code> trigger every 60 seconds.</li>
            <li><strong>Zero-effort reset:</strong> If <code className="text-neutral-200">lastResetDate !== today</code>, resets <code className="text-neutral-200">usedSeconds = 0</code>, <code className="text-neutral-200">shortsWatched = 0</code>, and clears emergency unlock.</li>
          </ul>
        </div>
      </div>

      {/* 5. Independent Restriction Modes (Both, Time Only, Shorts Only) */}
      <div className="bg-[#15161e] border border-[#272838] rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-white">
          <Layers className="w-5 h-5 text-red-400" />
          <h3 className="text-base font-bold text-white">5. Independent Restriction Modes & Custom Extension Icons</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-300">
          <div className="space-y-2">
            <h5 className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-red-400" />
              Configure Only Time, Only Shorts, or Both Together
            </h5>
            <p className="text-neutral-400 leading-relaxed">
              Users can customize how restrictions operate through the popup's <strong>Restriction Mode</strong> selector:
            </p>
            <ul className="text-neutral-300 space-y-1 list-disc list-inside">
              <li><strong>Both Together:</strong> Both daily watch time and Shorts view limits are active. Whichever threshold is reached first triggers the block screen.</li>
              <li><strong>Time Only:</strong> Only the watch time is enforced. The user can watch as many Shorts as desired within their daily time allotment without being blocked by count.</li>
              <li><strong>Shorts Only:</strong> Only the number of viewed Shorts is enforced. The user can spend time carefully watching without time-based interruption.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Icon & Packaging Specifications
            </h5>
            <p className="text-neutral-400 leading-relaxed">
              The extension features custom minimalist icons featuring the signature YouTube play badge fused with an hourglass timer emblem.
            </p>
            <ul className="text-neutral-300 space-y-1 list-disc list-inside">
              <li><code className="text-neutral-200">icons/icon16.png</code>: Displayed in the browser tab bar and favicon context.</li>
              <li><code className="text-neutral-200">icons/icon48.png</code>: Rendered in Chrome's <code className="text-neutral-200">chrome://extensions</code> manager.</li>
              <li><code className="text-neutral-200">icons/icon128.png</code>: High-resolution badge for extension installation and Web Store display.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Emergency Unlock & Anti-Bypass Rules */}
      <div className="bg-[#16121a] border border-[#381c24] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2.5 text-white mb-3">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h3 className="text-base font-bold text-red-200">Emergency Access & Anti-Bypass Architecture</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-300">
          <div className="space-y-2">
            <h5 className="font-bold text-white flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              Strictly Isolated from Block Screen
            </h5>
            <p className="text-neutral-400 leading-relaxed">
              As required by the specification, the Shorts Block Screen contains <strong>NO</strong> emergency unlock button, bypass link, or shortcut. The block screen only contains the stats and the <code className="text-neutral-200">[ Back to YouTube ]</code> button.
            </p>
            <p className="text-neutral-400 leading-relaxed">
              Emergency access can <strong>only</strong> be triggered through the extension popup via an intentional, confirmed dialog.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Single Use Per Day & Continual Tracking
            </h5>
            <p className="text-neutral-400 leading-relaxed">
              Emergency access is valid only once per day. Once confirmed, the button permanently switches to <code className="text-neutral-200">[ Emergency Unlock Used ]</code> and is disabled until midnight.
            </p>
            <p className="text-neutral-400 leading-relaxed">
              Critically, emergency access does not reset counters—usage continues to tick (e.g. <code className="text-red-400">18:32 / 15:00</code> and <code className="text-red-400">42 / 30 Shorts</code>) so the user maintains complete mindfulness of excess consumption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
