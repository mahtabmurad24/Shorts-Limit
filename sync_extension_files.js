import fs from 'fs';
import path from 'path';

const extDir = path.resolve('extension');

const manifest = fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf-8');
const background = fs.readFileSync(path.join(extDir, 'background.js'), 'utf-8');
const content = fs.readFileSync(path.join(extDir, 'content.js'), 'utf-8');
const popupHtml = fs.readFileSync(path.join(extDir, 'popup.html'), 'utf-8');
const popupCss = fs.readFileSync(path.join(extDir, 'popup.css'), 'utf-8');
const popupJs = fs.readFileSync(path.join(extDir, 'popup.js'), 'utf-8');

function escapeTemplate(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
}

const fileContent = `// Verbatim contents of all extension files for in-app code inspection and instant ZIP download

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const EXTENSION_MANIFEST = \`${escapeTemplate(manifest)}\`;

export const EXTENSION_BACKGROUND = \`${escapeTemplate(background)}\`;

export const EXTENSION_CONTENT = \`${escapeTemplate(content)}\`;

export const EXTENSION_POPUP_HTML = \`${escapeTemplate(popupHtml)}\`;

export const EXTENSION_POPUP_CSS = \`${escapeTemplate(popupCss)}\`;

export const EXTENSION_POPUP_JS = \`${escapeTemplate(popupJs)}\`;

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
`;

fs.writeFileSync(path.resolve('src/data/extensionFiles.ts'), fileContent, 'utf-8');
console.log('Successfully synced src/data/extensionFiles.ts from extension directory!');
