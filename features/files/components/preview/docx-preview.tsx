"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Download } from "lucide-react";

interface DocxPreviewProps {
  url: string;
  filename: string;
}

export function DocxPreview({ url, filename }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadDocx() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }
        const blob = await response.blob();
        if (isCancelled) return;

        // Dynamically import docx-preview to avoid SSR issues
        const { renderAsync } = await import("docx-preview");

        if (containerRef.current && !isCancelled) {
          containerRef.current.innerHTML = "";
          await renderAsync(blob, containerRef.current, undefined, {
            className: "docx-viewer-content",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || "Failed to render Word document");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadDocx();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-ink-muted">
        <Loader2 className="h-7 w-7 animate-spin text-accent mb-2" />
        <p className="text-xs font-mono">Parsing Word document layout & fonts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border rounded-xl">
        <AlertCircle className="h-8 w-8 text-danger mb-2" />
        <h3 className="text-sm font-semibold text-ink">Could Not Render Word Document</h3>
        <p className="text-xs text-ink-muted mt-1 max-w-md">{error}</p>
        <a
          href={url}
          download={filename}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-raised border border-border text-xs font-medium text-ink hover:bg-bg-overlay transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download File Instead
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-h-[600px] overflow-auto rounded-xl border border-border bg-[#525659] p-4 shadow-inner">
      <div
        ref={containerRef}
        className="max-w-[850px] mx-auto bg-white text-black shadow-lg rounded-sm min-h-[500px] p-6 text-sm"
      />
    </div>
  );
}
