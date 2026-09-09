import JSZip from 'jszip';
import { ALL_EXTENSION_FILES } from '../data/extensionFiles';

const README_CONTENT = `# Shorts Limit - Chrome / Chromium Extension (Manifest V3)

A complete Chrome extension that limits YouTube Shorts using two independent daily restrictions:
1. **Daily Time Limit** (e.g. 15 minutes/day)
2. **Daily Shorts View Limit** (e.g. 30 Shorts/day)

## Manual Installation (No Web Store required)

1. Extract this zip file into a dedicated folder (e.g. \`Shorts-Limit-Extension\`).
2. Open Google Chrome (or Brave / Chromium / Edge).
3. Navigate to \`chrome://extensions\` in your address bar.
4. In the top right corner, toggle on **Developer mode**.
5. Click the **Load unpacked** button in the top left toolbar.
6. Select the extracted folder containing \`manifest.json\`.
7. The **Shorts Limit** icon will appear in your Chrome toolbar. Pin it for quick access!

## Key Features
- **Independent Limits**: Set daily watch time and Shorts view limits independently.
- **SPA Aware**: Detects YouTube SPA navigation across \`/shorts/...\` seamlessly.
- **Accurate View Counting**: Deduplicates page refreshes and re-renders by tracking unique Shorts video IDs.
- **Active Time Only**: Only counts watch time when tab is actively visible, focused, and on a Shorts URL.
- **Multi-Tab Synchronized**: Centralized background state prevents double-counting and synchronizes block/unblock state across all tabs.
- **Anti-Bypass Block Screen**: Full-screen impenetrable overlay with pause/mute lock.
- **Emergency Access**: Isolated in the extension popup with confirmation; strictly forbidden on the block screen itself.
`;

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // Add root files
  ALL_EXTENSION_FILES.forEach((file) => {
    zip.file(file.path, file.content);
  });

  // Add README
  zip.file('README.md', README_CONTENT);

  // Add icons folder
  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    for (const size of [16, 48, 128]) {
      try {
        const response = await fetch(`/icons/icon${size}.png`);
        if (response.ok) {
          const blob = await response.blob();
          iconsFolder.file(`icon${size}.png`, blob);
        }
      } catch (e) {
        console.warn(`Could not load icon${size}.png from public, skipping`, e);
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shorts-limit-extension.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
