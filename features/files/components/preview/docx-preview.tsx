"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Download, FileText, Lock } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface DocxPreviewProps {
  url: string;
  filename: string;
  fileSize?: number;
}

export function DocxPreview({ url, filename, fileSize }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [forceLoadLarge, setForceLoadLarge] = useState(false);
  const [detectedSize, setDetectedSize] = useState<number | null>(null);

  const effectiveSize = fileSize || detectedSize || 0;
  const isLargeFile = effectiveSize > 20 * 1024 * 1024; // > 20MB

  useEffect(() => {
    let isCancelled = false;

    async function loadDocx() {
      // If declared size exceeds 20MB and user hasn't confirmed, show gate
      if (fileSize && fileSize > 20 * 1024 * 1024 && !forceLoadLarge) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setIsEncrypted(false);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }

        // Dynamically inspect Content-Length header
        const cl = response.headers.get("content-length");
        if (cl) {
          const parsedCl = parseInt(cl, 10);
          if (!isNaN(parsedCl) && parsedCl > 20 * 1024 * 1024 && !forceLoadLarge) {
            if (!isCancelled) {
              setDetectedSize(parsedCl);
              setLoading(false);
            }
            return;
          }
        }

        const blob = await response.blob();
        if (isCancelled) return;

        // Fallback gate on downloaded blob size
        if (blob.size > 20 * 1024 * 1024 && !forceLoadLarge) {
          if (!isCancelled) {
            setDetectedSize(blob.size);
            setLoading(false);
          }
          return;
        }

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
          const msg = (err?.message || "").toLowerCase();
          if (
            msg.includes("password") ||
            msg.includes("encrypted") ||
            msg.includes("protect") ||
            msg.includes("crypto") ||
            msg.includes("ole")
          ) {
            setIsEncrypted(true);
          } else {
            setError(err?.message || "Failed to render Word document");
          }
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
  }, [url, fileSize, forceLoadLarge]);

  // Large File Gate
  if (isLargeFile && !forceLoadLarge) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border rounded-xl">
        <FileText className="h-12 w-12 text-accent mb-3" />
        <h3 className="text-base font-semibold text-ink">Large Word Document ({formatBytes(effectiveSize || 0)})</h3>
        <p className="text-xs text-ink-muted mt-1 max-w-md">
          Rendering large Word documents with rich images or hundreds of pages in the browser may cause temporary UI lag.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setForceLoadLarge(true)}
            className="px-3.5 py-1.5 rounded-lg bg-bg-raised hover:bg-bg-overlay border border-border text-xs font-medium text-ink transition-colors"
          >
            Render Document Anyway
          </button>
          <a
            href={url}
            download={filename}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-bg text-xs font-semibold hover:bg-accent-bright transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download Original File
          </a>
        </div>
      </div>
    );
  }

  // Encrypted state
  if (isEncrypted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-border rounded-xl">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-ink">Password-Protected Word Document</h3>
        <p className="text-xs text-ink-muted mt-1 max-w-sm">
          This Word document is encrypted with a password. In-browser preview cannot decrypt protected contents.
        </p>
        <a
          href={url}
          download={filename}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-bright shadow transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download Original File
        </a>
      </div>
    );
  }

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
