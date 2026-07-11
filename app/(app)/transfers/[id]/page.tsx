"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Activity,
  Clock,
  Server,
  FileCode2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransfer } from "@/services";
import { TransferProgress } from "@/components/shared/transfer-progress";
import { ChunkVisualizer } from "@/components/shared/chunk-visualizer";
import { SpeedGraph } from "@/features/transfers/components/speed-graph";
import { TransferTimeline } from "@/features/transfers/components/transfer-timeline";
import { TransferStatusBadge } from "@/components/shared/status-badge";
import { formatBytes, formatSpeed } from "@/lib/utils";
import { useTransferStore } from "@/store";

export default function TransferDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: transfer, isLoading } = useTransfer(resolvedParams.id);
  const loadFromLocalStorage = useTransferStore((s) => s.loadFromLocalStorage);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-ink-muted">
          Transfer tracking session not found.
        </p>
        <Link
          href="/transfers"
          className="mt-4 text-xs text-accent hover:underline"
        >
          Back to Transfers List
        </Link>
      </div>
    );
  }

  const DirectionIcon = transfer.direction === "upload" ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex items-center justify-between">
        <Link
          href="/transfers"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to transfers
        </Link>
        <div className="flex items-center gap-2">
          <TransferStatusBadge status={transfer.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Summary & Live Progress */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="bg-bg-surface border-border-strong text-ink p-5 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                  transfer.direction === "upload"
                    ? "bg-accent/10 text-accent-bright"
                    : "bg-info/10 text-info"
                }`}
              >
                <DirectionIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-none truncate text-ink">
                  {transfer.fileName}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <span className="flex items-center gap-1">
                    <FileCode2 className="h-3.5 w-3.5" />{" "}
                    {formatBytes(transfer.sizeBytes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Server className="h-3.5 w-3.5" /> Object Storage
                  </span>
                  {transfer.status === "completed" && transfer.completedAt && (
                    <span className="flex items-center gap-1 text-success">
                      <Clock className="h-3.5 w-3.5" /> Took:{" "}
                      {(() => {
                        const start = new Date(transfer.startedAt).getTime();
                        const end = new Date(transfer.completedAt).getTime();
                        const durationSec = Math.max(
                          1,
                          Math.round((end - start) / 1000),
                        );
                        if (durationSec < 60) return `${durationSec}s`;
                        const durationMin = Math.floor(durationSec / 60);
                        const remainingSec = durationSec % 60;
                        return `${durationMin}m ${remainingSec}s`;
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              <TransferProgress
                status={transfer.status}
                transferredBytes={transfer.transferredBytes}
                sizeBytes={transfer.sizeBytes}
                speedBytesPerSecond={transfer.speedBytesPerSecond}
                etaSeconds={transfer.etaSeconds}
              />
            </div>
          </Card>

          {/* Chunk Visualizer Block */}
          <Card className="bg-bg-surface border-border-strong text-ink p-5">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between border-b border-border/50">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                Chunk Processing Matrix
              </CardTitle>
              <span className="text-[11px] text-ink-faint font-mono">
                {transfer.chunks.filter((c) => c.status === "complete").length}{" "}
                / {transfer.totalChunks} Chunks Verified
              </span>
            </CardHeader>
            <div className="pt-5">
              <ChunkVisualizer
                chunks={transfer.chunks}
                totalChunks={transfer.totalChunks}
                className="gap-[4px] justify-center"
              />
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/50 pt-4 font-mono text-[11px] text-ink-faint sm:grid-cols-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" /> Completed
                  Chunk
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />{" "}
                  Streaming Chunk
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-danger" /> Spoofed
                  Signature Block
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-bg-overlay" /> Queued
                  / Pending
                </div>
              </div>
            </div>
          </Card>

          {/* Real-time Speed Graph */}
          {transfer.status === "active" && transfer.speedHistory.length > 0 && (
            <Card className="bg-bg-surface border-border-strong text-ink p-5">
              <CardHeader className="p-0 pb-3 border-b border-border/50">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                  Real-time Bandwidth (Last 30s)
                </CardTitle>
              </CardHeader>
              <div className="pt-5">
                <SpeedGraph data={transfer.speedHistory} />
              </div>
            </Card>
          )}
        </div>

        {/* Right Side: Timeline Logs */}
        <div className="lg:col-span-1">
          <Card className="bg-bg-surface border-border-strong text-ink p-5 h-full">
            <CardHeader className="p-0 pb-3 flex flex-row items-center gap-2 border-b border-border/50">
              <Clock className="h-4 w-4 text-ink-muted" />
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                Execution Timeline Logs
              </CardTitle>
            </CardHeader>
            <div className="pt-5 max-h-[500px] overflow-y-auto">
              {transfer.logs.length === 0 ? (
                <p className="text-[12px] text-ink-faint">
                  No logs registered yet.
                </p>
              ) : (
                <TransferTimeline logs={transfer.logs} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
