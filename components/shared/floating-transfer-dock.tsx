"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Minus,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  RotateCw,
  X,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { useTransferStore, normalizeTransferState } from "@/store/transfer.store";
import { cancelUpload, resumeUpload, useToggleShareMutation, resolveFileForTransfer } from "@/services";
import { formatBytes, cn } from "@/lib/utils";
import { TransferSession } from "@/types";
import toast from "react-hot-toast";

export function FloatingTransferDock() {
  const pathname = usePathname();
  const transfers = useTransferStore((s) => s.transfers);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const prevActiveCountRef = useRef(0);
  const toggleShareMutation = useToggleShareMutation();

  const handleInstantShare = async (e: React.MouseEvent, item: TransferSession) => {
    e.preventDefault();
    e.stopPropagation();
    setSharingId(item.id);
    try {
      let targetFileId = item.fileId;
      if (!targetFileId) {
        const resolved = await resolveFileForTransfer(item);
        if (resolved) {
          targetFileId = resolved.id;
        }
      }
      if (!targetFileId) {
        toast.error("Could not resolve file to share");
        return;
      }

      await toggleShareMutation.mutateAsync({ id: targetFileId, isPublic: true });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/s/${targetFileId}`;
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedId(item.id);
      toast.success("Public share link copied to clipboard!");
      setTimeout(() => {
        setCopiedId((curr) => (curr === item.id ? null : curr));
      }, 2500);
    } catch (err: any) {
      toast.error(err.message || "Failed to share file");
    } finally {
      setSharingId(null);
    }
  };

  const handleWhatsAppShare = async (e: React.MouseEvent, item: TransferSession) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let targetFileId = item.fileId;
      if (!targetFileId) {
        const resolved = await resolveFileForTransfer(item);
        if (resolved) {
          targetFileId = resolved.id;
        }
      }
      if (!targetFileId) {
        toast.error("Could not resolve file to share");
        return;
      }

      await toggleShareMutation.mutateAsync({ id: targetFileId, isPublic: true });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/s/${targetFileId}`;
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`Here is the file: ${url}`)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to share on WhatsApp");
    }
  };

  // Filter transfers that are active, recently queued, or completed in this session
  const activeTransfers = transfers.filter((t) => {
    const state = normalizeTransferState(t.status);
    return state === "UPLOADING" || state === "QUEUED" || state === "PREPARING" || state === "ASSEMBLING";
  });

  const recentTransfers = transfers.slice(0, 8);

  // Auto-expand when a new active transfer begins, and auto-minimize once uploads finish
  useEffect(() => {
    const currentActive = activeTransfers.length;
    const prevActive = prevActiveCountRef.current;

    if (currentActive > 0) {
      setIsDismissed(false);
      setIsExpanded(true);
    } else if (prevActive > 0 && currentActive === 0) {
      // Transfers just finished! Keep open for 2.5 seconds so user sees completion, then minimize
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 2500);
      return () => clearTimeout(timer);
    }

    prevActiveCountRef.current = currentActive;
  }, [activeTransfers.length]);

  // If on /transfers page, full Transfer Studio is already visible
  if (pathname === "/transfers") return null;

  // If there are no transfers or user dismissed completed ones when none are active
  if (transfers.length === 0 || (activeTransfers.length === 0 && isDismissed)) {
    return null;
  }

  // Calculate aggregate progress for active transfers
  const totalActiveBytes = activeTransfers.reduce((acc, t) => acc + (t.sizeBytes || 0), 0);
  const totalTransferredBytes = activeTransfers.reduce((acc, t) => acc + (t.transferredBytes || 0), 0);
  const aggregatePercentage =
    totalActiveBytes > 0
      ? Math.min(100, Math.round((totalTransferredBytes / totalActiveBytes) * 100))
      : 0;

  const totalSpeed = activeTransfers.reduce((acc, t) => acc + (t.speedBytesPerSecond || 0), 0);
  const isActivelyTransferring = activeTransfers.length > 0;

  return (
    <aside
      aria-label="Transfer status dock"
      className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end select-none font-sans max-w-[calc(100vw-1.5rem)]"
    >
      {/* Expanded Card */}
      {isExpanded ? (
        <div className="w-[calc(100vw-1.5rem)] sm:w-96 max-w-[384px] rounded-2xl bg-bg-surface/95 border border-border-strong shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-raised/70">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "p-1.5 rounded-lg text-accent-bright",
                  isActivelyTransferring ? "bg-accent/20 animate-pulse" : "bg-bg-overlay"
                )}
              >
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-ink">
                  {isActivelyTransferring
                    ? `Uploading ${activeTransfers.length} file${activeTransfers.length > 1 ? "s" : ""}`
                    : "Uploads complete"}
                </h4>
                {isActivelyTransferring && (
                  <p className="text-[10px] text-ink-muted">
                    {aggregatePercentage}% • {formatBytes(totalSpeed)}/s
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/transfers"
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors"
                title="Open full Transfer Studio"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors"
                title="Minimize dock"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded-md text-ink-muted hover:text-danger hover:bg-bg-overlay transition-colors"
                title="Close dock"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Transfers List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
            {recentTransfers.map((item) => {
              const state = normalizeTransferState(item.status);
              const percent =
                item.sizeBytes > 0
                  ? Math.min(100, Math.round((item.transferredBytes / item.sizeBytes) * 100))
                  : 0;

              return (
                <div key={item.id} className="p-3 hover:bg-bg-raised/40 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-ink truncate max-w-[200px]" title={item.fileName}>
                      {item.fileName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {state === "COMPLETED" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleInstantShare(e, item)}
                            disabled={sharingId === item.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent-bright hover:bg-accent/25 transition-colors border border-accent/30 cursor-pointer"
                            title="Make file public & copy link to clipboard"
                          >
                            {sharingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-accent" />
                            ) : copiedId === item.id ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <Share2 className="h-3 w-3 text-accent" />
                            )}
                            <span>{copiedId === item.id ? "Copied" : "Share"}</span>
                          </button>
                          <button
                            onClick={(e) => handleWhatsAppShare(e, item)}
                            className="p-1 rounded text-white bg-[#25D366] hover:bg-[#20ba59] transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                            aria-label="Share on WhatsApp"
                          >
                            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                          </button>
                        </div>
                      ) : state === "FAILED" ? (
                        <button
                          onClick={() => resumeUpload(item.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors flex items-center gap-1"
                          title="Retry this file upload"
                        >
                          <RotateCw className="h-2.5 w-2.5" /> Retry
                        </button>
                      ) : state === "PAUSED" ? (
                        <button
                          onClick={() => resumeUpload(item.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-1"
                        >
                          <Play className="h-2.5 w-2.5" /> Resume
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-ink-muted">{percent}%</span>
                          <button
                            onClick={() => cancelUpload(item.id)}
                            className="p-0.5 rounded text-ink-muted hover:text-danger transition-colors"
                            title="Cancel upload"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-bg-raised rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        state === "COMPLETED"
                          ? "bg-emerald-500"
                          : state === "FAILED"
                          ? "bg-danger"
                          : "bg-accent"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-ink-faint font-mono">
                    <span>{formatBytes(item.sizeBytes)}</span>
                    {state === "UPLOADING" && (
                      <span>{formatBytes(item.speedBytesPerSecond)}/s</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-bg-surface text-[11px]">
            <Link
              href="/transfers"
              className="text-accent-bright hover:underline font-semibold flex items-center gap-1"
            >
              Transfer Studio <ArrowUpRight className="h-3 w-3" />
            </Link>
            {!isActivelyTransferring && (
              <button
                onClick={() => setIsDismissed(true)}
                className="text-ink-muted hover:text-ink text-[10px]"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Collapsed Floating Pill */
        <div
          className={cn(
            "flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-border-strong shadow-xl backdrop-blur-md transition-all text-xs font-medium animate-in fade-in duration-150",
            isActivelyTransferring
              ? "bg-bg-surface/95 text-ink border-accent/40"
              : "bg-bg-surface/90 text-ink-muted"
          )}
        >
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 cursor-pointer outline-none hover:text-ink transition-colors"
          >
            <div
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                isActivelyTransferring ? "bg-accent animate-ping" : "bg-emerald-400"
              )}
            />
            <span className="text-[12px] font-medium">
              {isActivelyTransferring
                ? `Uploading ${activeTransfers.length} • ${aggregatePercentage}%`
                : `${transfers.length} Transfers done`}
            </span>
            {isActivelyTransferring && totalSpeed > 0 && (
              <span className="font-mono text-[11px] text-ink-muted hidden sm:inline">
                ({formatBytes(totalSpeed)}/s)
              </span>
            )}
            <ChevronUp className="h-3.5 w-3.5 text-ink-muted shrink-0" />
          </button>
          {!isActivelyTransferring && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="p-1 rounded-full text-ink-faint hover:text-ink hover:bg-bg-raised transition-colors ml-0.5 cursor-pointer shrink-0"
              title="Dismiss transfer pill"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
