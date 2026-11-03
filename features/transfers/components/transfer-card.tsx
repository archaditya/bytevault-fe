"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Play,
  Pause,
  ExternalLink,
  Loader2,
  X,
  Folder,
  FolderOpen,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { TransferSession } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TransferStatusBadge } from "@/components/shared/status-badge";
import { TransferProgress } from "@/components/shared/transfer-progress";
import { ChunkVisualizer } from "@/components/shared/chunk-visualizer";
import { formatRelativeTime, cn } from "@/lib/utils";
import {
  pauseUpload,
  resumeUpload,
  resolveFileForTransfer,
  cancelUpload,
  useFoldersFlat,
  useToggleShareMutation,
} from "@/services";
import { useTransferStore } from "@/store";
import { PipelineStatusDialog } from "./pipeline-status-dialog";
import toast from "react-hot-toast";

export function TransferCard({ transfer }: { transfer: TransferSession }) {
  const router = useRouter();
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [resolvedShareUrl, setResolvedShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const toggleShareMutation = useToggleShareMutation();

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSharing(true);
    try {
      let targetFileId = transfer.fileId;
      if (!targetFileId) {
        const file = await resolveFileForTransfer(transfer);
        if (file) {
          targetFileId = file.id;
        }
      }
      if (!targetFileId) {
        toast.error("Could not locate file to share");
        return;
      }

      await toggleShareMutation.mutateAsync({ id: targetFileId, isPublic: true });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/s/${targetFileId}`;
      setResolvedShareUrl(url);
      setShareOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (resolvedShareUrl && navigator?.clipboard) {
      navigator.clipboard.writeText(resolvedShareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: transfer.fileName,
          text: `Here is the file: ${transfer.fileName}`,
          url: resolvedShareUrl,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("Share cancelled or failed");
        }
      }
    }
  };
  const { data: allFolders } = useFoldersFlat();

  const folder = useMemo(() => {
    if (!transfer.folderId || !allFolders) return null;
    return allFolders.find((f) => f.id === transfer.folderId) || null;
  }, [transfer.folderId, allFolders]);

  const DirectionIcon = transfer.direction === "upload" ? ArrowUp : ArrowDown;

  const handleCardClick = async () => {
    // If it's a download or failed transfer, go to transfer details page
    if (transfer.direction === "download" || transfer.status === "failed") {
      router.push(`/transfers/${transfer.id}`);
      return;
    }

    // Direct route to preview if fileId is already known
    if (transfer.status === "completed" && transfer.fileId) {
      router.push(`/files/${transfer.fileId}`);
      return;
    }

    // For uploads: resolve file in backend
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

    // If completed but fileId couldn't be resolved, fallback to folder view in Files
    if (transfer.status === "completed") {
      const folderParam = transfer.folderId ? `folder=${transfer.folderId}` : "folder=root";
      router.push(`/files?${folderParam}`);
      return;
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
                  {transfer.direction === "upload" && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border">
                        <Folder className="h-3 w-3 text-accent" />
                        <span className="truncate max-w-[120px]">{folder?.name || "Home"}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Dedicated "Locate in Folder" action button for completed transfers */}
              {transfer.status === "completed" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-[11px] gap-1 shrink-0 text-ink hover:text-accent hover:border-accent/40"
                  title={`Locate in ${folder?.name || "Home"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const folderParam = transfer.folderId ? `folder=${transfer.folderId}` : "folder=root";
                    const highlightParam = transfer.fileId ? `&highlight=${transfer.fileId}` : "";
                    router.push(`/files?${folderParam}${highlightParam}`);
                  }}
                >
                  <FolderOpen className="h-3.5 w-3.5 text-accent" />
                  <span>Locate</span>
                </Button>
              )}

              {/* Dedicated "Share" action button for completed transfers */}
              {transfer.status === "completed" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-[11px] gap-1 shrink-0 text-ink hover:text-accent hover:border-accent/40"
                  title="Share File"
                  disabled={isSharing}
                  onClick={handleShareClick}
                >
                  {isSharing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5 text-accent" />
                  )}
                  <span>Share</span>
                </Button>
              )}

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


      {/* Direct Share Dialog for Completed Transfer */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent
          className="sm:max-w-md bg-bg-surface border-border-strong text-ink font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Share2 className="h-4 w-4 text-accent" />
              Share File
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              {transfer.fileName} is public. Anyone with this link can view or download it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={resolvedShareUrl}
                className="h-9 text-xs font-mono bg-bg-raised text-ink selection:bg-accent/20"
                onFocus={(e) => e.target.select()}
        
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 px-3 text-xs shrink-0 gap-1.5"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Here is the file: ${resolvedShareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold h-9 px-3 transition-colors shadow-sm"
              >
                <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>Share on WhatsApp</span>
              </a>

              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs gap-1.5"
                  onClick={handleNativeShare}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>More options</span>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}
