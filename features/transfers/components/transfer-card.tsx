"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, RotateCcw, Play, Pause, ExternalLink, Loader2, X } from "lucide-react";
import { TransferSession } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransferStatusBadge } from "@/components/shared/status-badge";
import { TransferProgress } from "@/components/shared/transfer-progress";
import { ChunkVisualizer } from "@/components/shared/chunk-visualizer";
import { formatRelativeTime, cn } from "@/lib/utils";
import { pauseUpload, resumeUpload, resolveFileForTransfer, cancelUpload } from "@/services";
import { useTransferStore } from "@/store";
import { PipelineStatusDialog } from "./pipeline-status-dialog";

export function TransferCard({ transfer }: { transfer: TransferSession }) {
  const router = useRouter();
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const DirectionIcon = transfer.direction === "upload" ? ArrowUp : ArrowDown;

  const handleCardClick = async () => {
    // If it's a download or failed transfer, go to transfer details page
    if (transfer.direction === "download" || transfer.status === "failed") {
      router.push(`/transfers/${transfer.id}`);
      return;
    }

    // For uploads: check if file is ready in backend
    setIsResolving(true);
    try {
      const file = await resolveFileForTransfer(transfer);
      if (file && (file.status === "READY" || file.status === "ready")) {
        router.push(`/files/${file.id}`);
        return;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResolving(false);
    }

    // If still in progress (PENDING_SCAN, PROCESSING, or active upload): open pipeline popup!
    setPipelineOpen(true);
  };

  return (
    <>
      <div onClick={handleCardClick} className="cursor-pointer group block">
        <Card className="flex flex-col gap-3 p-4 transition-all duration-200 hover:border-accent/50 hover:shadow-md group-hover:bg-bg-raised/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm",
                  transfer.direction === "upload"
                    ? "bg-accent/10 text-accent-bright"
                    : "bg-info/10 text-info",
                )}
              >
                <DirectionIcon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink group-hover:text-accent transition-colors flex items-center gap-1.5">
                  <span className="truncate">{transfer.fileName}</span>
                  {isResolving ? (
                    <Loader2 className="h-3 w-3 animate-spin text-accent shrink-0" />
                  ) : (
                    <ExternalLink className="h-3 w-3 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-muted">
                  <span>{formatRelativeTime(transfer.updatedAt)}</span>
                  {transfer.status === "completed" && transfer.completedAt && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-success">
                        Took{" "}
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
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Inline play/pause action buttons for upload transfers */}
              {transfer.direction === "upload" && (transfer.status === "active" || transfer.status === "paused") && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-ink-muted hover:text-ink hover:bg-bg-overlay shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (transfer.status === "active") {
                      pauseUpload(transfer.id);
                    } else {
                      resumeUpload(transfer.id);
                    }
                  }}
                >
                  {transfer.status === "active" ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-accent" />
                  )}
                </Button>
              )}
              <TransferStatusBadge status={transfer.status} />
              <Button
                size="icon"
                variant="ghost"
                title="Remove from history"
                className="h-7 w-7 text-ink-muted hover:text-danger hover:bg-bg-overlay shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (transfer.status === "active" || transfer.status === "paused") {
                    cancelUpload(transfer.id);
                  }
                  useTransferStore.getState().removeTransfer(transfer.id);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <TransferProgress
            status={transfer.status}
            transferredBytes={transfer.transferredBytes}
            sizeBytes={transfer.sizeBytes}
            speedBytesPerSecond={transfer.speedBytesPerSecond}
            etaSeconds={transfer.etaSeconds}
          />

          <ChunkVisualizer
            chunks={transfer.chunks}
            totalChunks={transfer.totalChunks}
            className="max-h-[120px] overflow-hidden"
          />

          {transfer.retryCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-live">
              <RotateCcw className="h-3 w-3" />
              {transfer.retryCount} retr{transfer.retryCount === 1 ? "y" : "ies"}{" "}
              on this transfer
            </div>
          )}
        </Card>
      </div>

      {/* Interactive Pipeline Processing Modal */}
      <PipelineStatusDialog
        open={pipelineOpen}
        onOpenChange={setPipelineOpen}
        transfer={transfer}
      />
    </>
  );
}
