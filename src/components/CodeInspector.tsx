import React, { useState } from 'react';
import { ALL_EXTENSION_FILES, ExtensionFile } from '../data/extensionFiles';
import { Copy, Check, FileCode, Download, FolderArchive } from 'lucide-react';
import { downloadExtensionZip } from '../utils/zipExporter';

export const CodeInspector: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ExtensionFile>(ALL_EXTENSION_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col bg-[#0f0f14] rounded-2xl border border-[#272838] overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="bg-[#161621] border-b border-[#272838] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Extension Source Code
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                Manifest V3
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Inspect, copy, or download every production file for manual installation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-red-500/20 transition cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            {isDownloading ? 'Bundling...' : 'Download .ZIP'}
          </button>
        </div>
      </div>

      {/* File Navigation Tabs */}
      <div className="bg-[#111119] border-b border-[#222232] px-4 py-2 flex gap-1.5 overflow-x-auto">
        {ALL_EXTENSION_FILES.map((file) => {
          const isActive = file.name === selectedFile.name;
          return (
            <button
              key={file.name}
              onClick={() => {
                setSelectedFile(file);
                setCopied(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                isActive
                  ? 'bg-[#1e1f2d] text-white font-semibold border border-[#35364e]'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  file.name.endsWith('.json')
                    ? 'bg-amber-400'
                    : file.name.endsWith('.js')
                    ? 'bg-yellow-400'
                    : file.name.endsWith('.html')
                    ? 'bg-orange-500'
                    : 'bg-blue-400'
                }`}
              />
              {file.name}
            </button>
          );
        })}
      </div>

      {/* File Details Bar */}
      <div className="bg-[#13141d] px-5 py-2.5 border-b border-[#222232] flex items-center justify-between text-xs text-neutral-300">
        <div className="flex items-center gap-2 truncate pr-4">
          <span className="font-mono text-red-400 font-medium">/{selectedFile.path}</span>
          <span className="text-neutral-500 hidden sm:inline">•</span>
          <span className="text-neutral-400 text-[11px] truncate hidden sm:inline">
            {selectedFile.description}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadSingle}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save File</span>
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded transition ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="p-4 bg-[#0a0a0f] overflow-x-auto max-h-[500px]">
        <pre className="font-mono text-xs text-neutral-300 leading-relaxed tab-4">
          <code>
            {selectedFile.content.split('\n').map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell pr-4 text-neutral-600 select-none text-right font-mono text-[11px]">
                  {idx + 1}
                </span>
                <span className="table-cell">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
