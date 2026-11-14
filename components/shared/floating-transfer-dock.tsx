"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  X,
  ExternalLink,
} from "lucide-react";
import { useTransferStore, normalizeTransferState } from "@/store/transfer.store";
import { formatBytes, cn } from "@/lib/utils";

export function FloatingTransferDock() {
  const pathname = usePathname();
  const transfers = useTransferStore((s) => s.transfers);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If on /transfers page, full Transfer Studio is already visible
  if (pathname === "/transfers") return null;

  // Filter transfers that are active, recently queued, or completed in this session
  const activeTransfers = transfers.filter((t) => {
    const state = normalizeTransferState(t.status);
    return state === "UPLOADING" || state === "QUEUED" || state === "PREPARING" || state === "ASSEMBLING";
  });

  const recentTransfers = transfers.slice(0, 5);

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
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end select-none font-sans"
    >
      {/* Expanded Card */}
      {isExpanded ? (
        <div className="w-80 sm:w-96 rounded-2xl bg-bg-surface/95 border border-border-strong shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-raised/70">
            <div className="flex items-center gap-2">
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
                    ? `Uploading (${activeTransfers.length})`
                    : "Transfers Complete"}
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
                title="Open Transfer Studio"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors"
                title="Collapse dock"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Transfers List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
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
                    <span className="text-[10px] font-mono text-ink-muted shrink-0">
                      {state === "COMPLETED" ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      ) : state === "FAILED" ? (
                        <span className="text-danger font-semibold flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </span>
                      ) : (
                        `${percent}%`
                      )}
                    </span>
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
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-border-strong shadow-xl backdrop-blur-md transition-transform hover:scale-102 active:scale-98 text-xs font-medium cursor-pointer",
            isActivelyTransferring
              ? "bg-bg-surface/95 text-ink border-accent/40"
              : "bg-bg-surface/90 text-ink-muted"
          )}
        >
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isActivelyTransferring ? "bg-accent animate-ping" : "bg-emerald-400"
            )}
          />
          <div className="flex items-center gap-2">
            <span>
              {isActivelyTransferring
                ? `Uploading ${activeTransfers.length} • ${aggregatePercentage}%`
                : `${transfers.length} Transfers done`}
            </span>
            {isActivelyTransferring && totalSpeed > 0 && (
              <span className="font-mono text-[11px] text-ink-muted">
                ({formatBytes(totalSpeed)}/s)
              </span>
            )}
          </div>
          <ChevronUp className="h-3.5 w-3.5 text-ink-muted" />
        </button>
      )}
    </aside>
  );
}
