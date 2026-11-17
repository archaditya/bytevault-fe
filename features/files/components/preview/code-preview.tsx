"use client";

import React, { useState, useMemo } from "react";
import { Check, Copy, Code2, WrapText } from "lucide-react";

interface CodePreviewProps {
  content: string;
  language: string;
  filename: string;
  isTruncated?: boolean;
}

export function CodePreview({
  content,
  language,
  filename,
  isTruncated,
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);

  const lines = useMemo(() => content.split("\n"), [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col h-full w-full rounded-xl border border-border bg-[#0d1117] text-[#c9d1d9] overflow-hidden shadow-sm font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-[#30363d] select-none">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-accent-bright" />
          <span className="font-semibold text-ink text-xs">{filename}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-accent/15 text-accent-bright border border-accent/30">
            {language}
          </span>
          <span className="text-[11px] text-[#8b949e]">({lines.length} lines)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWordWrap((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors border ${
              wordWrap
                ? "bg-accent/20 text-accent-bright border-accent/40"
                : "bg-[#21262d] text-[#8b949e] hover:text-white border-[#30363d]"
            }`}
            title="Toggle word wrap"
          >
            <WrapText className="h-3 w-3" />
            <span>Wrap</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-[#21262d] hover:bg-[#30363d] text-ink font-medium border border-[#30363d] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Viewport with Gutter */}
      <div className="flex-1 overflow-auto max-h-[550px] min-h-[300px] p-3 text-[12px] leading-relaxed select-text">
        <div className="flex">
          {/* Line Numbers */}
          <div className="select-none text-right pr-4 text-[#484f58] font-mono shrink-0">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code Text Content */}
          <pre
            className={`flex-1 m-0 p-0 font-mono text-[#e6edf3] ${
              wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
            }`}
          >
            {content}
          </pre>
        </div>
      </div>

      {/* Truncation warning if applicable */}
      {isTruncated && (
        <div className="px-3.5 py-1.5 bg-[#161b22] border-t border-[#30363d] text-[11px] text-amber-400 font-mono flex items-center justify-between">
          <span>⚠️ Content truncated for in-browser preview (showing first 100 KB).</span>
          <span className="text-[#8b949e]">Download file to view complete code.</span>
        </div>
      )}
    </div>
  );
}
