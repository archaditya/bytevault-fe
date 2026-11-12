"use client";

import { Progress } from "@/components/ui/progress";
import { TransferStatus } from "@/types";
import { cn, formatBytes, formatSpeed, formatDuration } from "@/lib/utils";

interface TransferProgressProps {
  status: TransferStatus;
  transferredBytes: number;
  sizeBytes: number;
  speedBytesPerSecond: number;
  etaSeconds: number | null;
  compact?: boolean;
}

const indicatorByStatus: Record<TransferStatus, string> = {
  // Unified Lifecycle States
  IDLE: "bg-ink-faint",
  QUEUED: "bg-ink-faint",
  PREPARING: "bg-sky-500",
  UPLOADING: "bg-live",
  ASSEMBLING: "bg-amber-500",
  COMPLETED: "bg-success",
  PAUSED: "bg-ink-faint",
  FAILED: "bg-danger",
  CANCELLED: "bg-danger",

  // Legacy Lowercase Mappings
  active: "bg-live",
  paused: "bg-ink-faint",
  completed: "bg-success",
  failed: "bg-danger",
  queued: "bg-ink-faint",
};

export function TransferProgress({
  status,
  transferredBytes,
  sizeBytes,
  speedBytesPerSecond,
  etaSeconds,
  compact,
}: TransferProgressProps) {
  const pct = sizeBytes > 0 ? Math.round((transferredBytes / sizeBytes) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={pct} className={cn(compact && "h-1")} indicatorClassName={indicatorByStatus[status]} />
      <div className="flex items-center justify-between font-mono text-[11px] text-ink-muted">
        <span>
          {formatBytes(transferredBytes)} / {formatBytes(sizeBytes)} · {pct}%
        </span>
        {status === "active" && (
          <span className="text-live">
            {formatSpeed(speedBytesPerSecond)}
            {etaSeconds != null && ` · ETA ${formatDuration(etaSeconds)}`}
          </span>
        )}
      </div>
    </div>
  );
}
