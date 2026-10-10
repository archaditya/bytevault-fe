"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TransferSession, FileRecord } from "@/types";
import { resolveFileForTransfer } from "@/services";
import { formatBytes } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Film,
  Sparkles,
  ExternalLink,
  UploadCloud,
  FileIcon,
  ArrowRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

interface PipelineStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: TransferSession | null;
}

export function PipelineStatusDialog({
  open,
  onOpenChange,
  transfer,
}: PipelineStatusDialogProps) {
  const router = useRouter();
  const [resolvedFile, setResolvedFile] = useState<FileRecord | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll backend file status
  useEffect(() => {
    if (!open || !transfer) {
      setResolvedFile(null);
      setPollCount(0);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      return;
    }

    let isMounted = true;

    const checkStatus = async () => {
      setIsChecking(true);
      try {
        const file = await resolveFileForTransfer(transfer);
        if (!isMounted) return;

        if (file) {
          setResolvedFile(file);
          const isReady =
            file.status === "READY" || file.status === "ready";

          if (isReady && !redirectTimerRef.current) {
            toast.success("Pipeline ready! Opening file details...", {
              id: "pipeline-ready",
            });
            redirectTimerRef.current = setTimeout(() => {
              if (isMounted) {
                onOpenChange(false);
                router.push(`/files/${file.id}`);
              }
            }, 1200);
          }
        }
      } catch (err) {
        console.error("Pipeline poll error:", err);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    // Immediate check
    checkStatus();

    // Regular poll every 2.5 seconds
    const interval = setInterval(() => {
      setPollCount((prev) => prev + 1);
      checkStatus();
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [open, transfer, router, onOpenChange]);

  if (!transfer) return null;

  const isReady =
    resolvedFile?.status === "READY" || resolvedFile?.status === "ready";
  const isFailed =
    transfer.status === "failed" || resolvedFile?.status === "FAILED";

  const handleOpenNow = () => {
    if (resolvedFile?.id) {
      onOpenChange(false);
      router.push(`/files/${resolvedFile.id}`);
    }
  };

  const handleViewTechnicalChunks = () => {
    onOpenChange(false);
    router.push(`/transfers/${transfer.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
                <FileIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-ink truncate max-w-[260px]">
                  {transfer.fileName}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-ink-muted font-mono mt-0.5">
                  <span>{formatBytes(transfer.sizeBytes)}</span>
                  <span>•</span>
                  <span>{transfer.totalChunks} chunks</span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              {isReady ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success/15 text-success border border-success/30">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              ) : isFailed ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-danger/15 text-danger border border-danger/30">
                  <AlertTriangle className="h-3 w-3" /> Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent-bright border border-accent/30 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> Processing
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <p className="text-xs text-ink-muted leading-relaxed mt-2">
          {isReady
            ? "All backend security scans, thumbnails, and indexing pipelines have completed successfully!"
            : "Upload received. ByteVault background workers are performing security verification, NTFS/malware scans, and media thumbnailing."}
        </p>

        {/* Interactive Step-by-Step Pipeline Tracker */}
        <div className="my-4 space-y-3 rounded-xl border border-border bg-bg-raised/60 p-4">
          {/* Step 1: Chunk Upload & Storage Assembly */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  1. Chunk Transfer & Storage Assembly
                </span>
                <span className="text-[10px] font-mono text-success font-medium">
                  Completed
                </span>
              </div>
              <p className="text-[11px] text-ink-faint">
                All {transfer.totalChunks} parts uploaded and assembled in storage provider.
              </p>
            </div>
          </div>

          {/* Step 2: Antivirus & Security Scan */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                isReady
                  ? "bg-success/20 text-success"
                  : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {isReady ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  2. Security & Malware Scan
                </span>
                <span
                  className={`text-[10px] font-mono font-medium ${
                    isReady ? "text-success" : "text-amber-400"
                  }`}
                >
                  {isReady ? "Passed" : "Scanning…"}
                </span>
              </div>
              <p className="text-[11px] text-ink-faint">
                Integrity evaluation, heuristic verification, and content moderation.
              </p>
            </div>
          </div>

          {/* Step 3: Media Thumbnail & Poster Pipeline */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                isReady
                  ? "bg-success/20 text-success"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {isReady ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Film className="h-3.5 w-3.5 animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  3. Media Thumbnail & Posters
                </span>
                <span
                  className={`text-[10px] font-mono font-medium ${
                    isReady ? "text-success" : "text-blue-400"
                  }`}
                >
                  {isReady ? "Generated" : "Processing…"}
                </span>
              </div>
              <p className="text-[11px] text-ink-faint">
                FFmpeg video posters, high-fidelity frames, and preview assets.
              </p>
            </div>
          </div>

          {/* Step 4: AI Indexing & Metadata Catalog */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                isReady
                  ? "bg-success/20 text-success"
                  : "bg-purple-500/20 text-purple-400"
              }`}
            >
              {isReady ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  4. Metadata & Search Cataloging
                </span>
                <span
                  className={`text-[10px] font-mono font-medium ${
                    isReady ? "text-success" : "text-purple-400"
                  }`}
                >
                  {isReady ? "Indexed" : "Queued"}
                </span>
              </div>
              <p className="text-[11px] text-ink-faint">
                Search tokenization, tagging, and preview readying.
              </p>
            </div>
          </div>
        </div>

        {/* Polling live feedback bar */}
        {!isReady && !isFailed && (
          <div className="flex items-center justify-between text-[11px] text-ink-muted bg-bg-raised/40 px-3 py-1.5 rounded-lg border border-border/50">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-accent" />
              Live polling worker status
            </span>
            <span className="font-mono text-accent">
              {isChecking ? "Checking…" : `Sync #${pollCount}`}
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border mt-1">
          {isReady ? (
            <Button
              onClick={handleOpenNow}
              className="w-full gap-2 text-xs font-bold bg-accent hover:bg-accent-bright text-bg shadow-md h-9"
            >
              <span>Open File Details</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleViewTechnicalChunks}
                className="text-xs text-ink-muted hover:text-ink gap-1 px-2 h-8"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Technical Chunks</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Keep In Background
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
