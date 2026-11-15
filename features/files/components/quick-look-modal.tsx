"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileQuestion,
} from "lucide-react";
import { FileRecord } from "@/types";
import { useFilesStore } from "@/store/files.store";
import { formatBytes, formatRelativeTime, cn } from "@/lib/utils";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { RichFilePreview } from "./rich-file-preview";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface QuickLookModalProps {
  files?: FileRecord[];
}

export function QuickLookModal({ files = [] }: QuickLookModalProps) {
  const router = useRouter();
  const quickLookFile = useFilesStore((s) => s.quickLookFile);
  const setQuickLookFile = useFilesStore((s) => s.setQuickLookFile);

  const currentIndex = quickLookFile
    ? files.findIndex((f) => f.id === quickLookFile.id)
    : -1;
  const hasFiles = files.length > 0;

  const handleNext = useCallback(() => {
    if (!hasFiles || currentIndex === -1) return;
    const nextIdx = (currentIndex + 1) % files.length;
    setQuickLookFile(files[nextIdx]);
  }, [hasFiles, currentIndex, files, setQuickLookFile]);

  const handlePrev = useCallback(() => {
    if (!hasFiles || currentIndex === -1) return;
    const prevIdx = (currentIndex - 1 + files.length) % files.length;
    setQuickLookFile(files[prevIdx]);
  }, [hasFiles, currentIndex, files, setQuickLookFile]);

  const handleClose = useCallback(() => {
    setQuickLookFile(null);
  }, [setQuickLookFile]);

  // Keyboard navigation: Space/Escape to close, Left/Right arrows to cycle
  useEffect(() => {
    if (!quickLookFile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape" || e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickLookFile, handleClose, handleNext, handlePrev]);

  if (!quickLookFile) return null;

  const file = quickLookFile;
  const downloadUrl = `/api/v1/files/${file.id}/download`;
  const previewUrl = `/api/v1/files/${file.id}/download?inline=true`;

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/s/file/${file.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };

  const handleOpenDetails = () => {
    handleClose();
    router.push(`/files/${file.id}`);
  };

  const isImage = file.kind === "image" || file.mimeType.startsWith("image/");
  const isVideo = file.kind === "video" || file.mimeType.startsWith("video/");
  const isAudio = file.kind === "audio" || file.mimeType.startsWith("audio/");
  const isPdf =
    file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[88vh] rounded-2xl bg-bg-surface border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-raised/70">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${file.thumbnailColor || "#FF6A00"}20`,
                color: file.thumbnailColor || "#FF6A00",
              }}
            >
              <FileKindIcon kind={file.kind} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink truncate" title={file.name}>
                {file.name}
              </h2>
              <p className="text-[11px] text-ink-muted flex items-center gap-2">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>•</span>
                <span className="uppercase">{file.mimeType || file.kind}</span>
                <span>•</span>
                <span>{formatRelativeTime(file.uploadedAt)}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="h-8 px-2.5 text-xs gap-1.5"
              title="Copy public link"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="h-8 px-2.5 text-xs gap-1.5"
              title="Download file"
            >
              <a href={downloadUrl} download={file.name}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenDetails}
              className="h-8 px-2.5 text-xs gap-1.5 text-ink-muted hover:text-ink"
              title="Open full file details"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Details</span>
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <button
              onClick={handleClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors"
              aria-label="Close Quick Look"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center Canvas Preview */}
        <div className="relative flex-1 min-h-[320px] max-h-[64vh] bg-bg overflow-auto flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-[58vh] max-w-full object-contain rounded-lg shadow-md select-none"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : isVideo ? (
            <video
              src={previewUrl}
              controls
              autoPlay
              className="max-h-[58vh] max-w-full rounded-lg shadow-md bg-black"
            />
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-4 p-8 w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-lg">
              <div className="h-20 w-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileKindIcon kind="audio" className="h-10 w-10" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-ink">{file.name}</h3>
                <p className="text-xs text-ink-muted mt-0.5">{formatBytes(file.sizeBytes)}</p>
              </div>
              <audio src={previewUrl} controls className="w-full mt-2" autoPlay />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${previewUrl}#toolbar=0`}
              title={file.name}
              className="w-full h-[58vh] rounded-xl border border-border bg-white"
            />
          ) : (
            <div className="w-full h-full max-h-[52vh] max-w-xl flex items-center justify-center">
              <RichFilePreview file={file} className="rounded-xl border border-border shadow-inner" />
            </div>
          )}

          {/* Floating Next / Prev Arrow Buttons */}
          {hasFiles && files.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-bg-surface/80 hover:bg-bg-surface border border-border shadow-lg flex items-center justify-center text-ink-muted hover:text-ink transition-colors backdrop-blur-sm"
                title="Previous file (Left Arrow)"
                aria-label="Previous file"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-bg-surface/80 hover:bg-bg-surface border border-border shadow-lg flex items-center justify-center text-ink-muted hover:text-ink transition-colors backdrop-blur-sm"
                title="Next file (Right Arrow)"
                aria-label="Next file"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-surface text-[11px] text-ink-muted select-none">
          <div className="flex items-center gap-2">
            <span className="font-mono">
              {currentIndex !== -1 ? `${currentIndex + 1} of ${files.length}` : "Preview"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-bg-raised border border-border text-[10px] font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-bg-raised border border-border text-[10px] font-mono">Esc</kbd> to close
            </span>
            {hasFiles && files.length > 1 && (
              <span className="hidden sm:inline">
                Use <kbd className="px-1 py-0.5 rounded bg-bg-raised border border-border text-[10px] font-mono">←</kbd> <kbd className="px-1 py-0.5 rounded bg-bg-raised border border-border text-[10px] font-mono">→</kbd> to cycle
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
