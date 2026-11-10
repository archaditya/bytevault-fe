"use client";

import { useAdminFilePreview } from "@/services/admin.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBytes, formatDateTime } from "@/lib/utils";
import {
  Loader2,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  ExternalLink,
  ShieldAlert,
  User,
  Clock,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FilePreviewModalProps {
  fileId: string | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function FilePreviewModal({
  fileId,
  isOpen,
  onClose,
  title = "Inspect Reported Content",
}: FilePreviewModalProps) {
  const { data, isLoading, error } = useAdminFilePreview(isOpen ? fileId : null);

  const renderMedia = () => {
    if (!data?.preview_url) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-bg border border-border rounded-md text-ink-muted">
          <FileText className="h-12 w-12 text-ink-faint mb-2" />
          <p className="text-xs">No direct media stream available.</p>
        </div>
      );
    }

    const ct = data.content_type?.toLowerCase() || "";

    if (ct.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center p-3 bg-black/40 border border-border rounded-md max-h-[50vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.preview_url}
            alt={data.filename}
            className="max-h-[46vh] w-auto object-contain rounded"
          />
        </div>
      );
    }

    if (ct.startsWith("video/")) {
      return (
        <div className="bg-black border border-border rounded-md overflow-hidden max-h-[50vh]">
          <video
            src={data.preview_url}
            controls
            playsInline
            className="max-h-[46vh] w-full"
          />
        </div>
      );
    }

    if (ct.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-bg border border-border rounded-md gap-3">
          <Music className="h-10 w-10 text-accent animate-pulse" />
          <p className="text-xs font-mono text-ink">{data.filename}</p>
          <audio src={data.preview_url} controls className="w-full max-w-md" />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-bg border border-border rounded-md text-center gap-3">
        <FileText className="h-12 w-12 text-accent" />
        <div>
          <p className="text-sm font-medium text-ink">{data.filename}</p>
          <p className="text-xs text-ink-muted mt-0.5 font-mono">{ct}</p>
        </div>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs mt-2">
          <a href={data.preview_url} target="_blank" rel="noreferrer" download={data.filename}>
            <Download className="h-3.5 w-3.5" /> Download &amp; Inspect File
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-bg-surface border-border-strong text-ink p-6">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold tracking-tight text-ink flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent" /> {title}
            </span>
            {data && (
              <Badge variant="muted" className="text-[10px] font-mono capitalize">
                Status: {data.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 text-accent animate-spin" />
          </div>
        ) : error || !data ? (
          <div className="p-6 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md">
            Failed to load file preview. The file may have already been purged or restricted.
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            {/* Visual Media Viewer */}
            {renderMedia()}

            {/* Context Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 bg-bg border border-border rounded-md p-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-ink-muted">File Details</span>
                <p className="font-medium text-ink truncate">{data.filename}</p>
                <p className="text-[11px] text-ink-muted">
                  {formatBytes(data.file_size)} • {data.content_type}
                </p>
                <p className="text-[11px] text-ink-faint flex items-center gap-1 pt-0.5">
                  <Clock className="h-3 w-3" /> Uploaded {formatDateTime(data.created_at)}
                </p>
              </div>

              <div className="space-y-1 border-l border-border/40 pl-3">
                <span className="text-[10px] font-mono uppercase text-ink-muted">Uploader Profile</span>
                <p className="font-medium text-ink flex items-center gap-1.5 truncate">
                  <User className="h-3.5 w-3.5 text-ink-muted" />
                  {data.uploader_email || "System / Anonymous"}
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-ink-muted">Moderation Strikes:</span>
                  <Badge
                    variant="muted"
                    className={`text-[10px] font-mono px-1.5 py-0 ${
                      (data.uploader_strikes ?? 0) > 0
                        ? "bg-rose-500/15 text-rose-400"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    {data.uploader_strikes ?? 0}
                  </Badge>
                </div>
                {data.preview_url && (
                  <div className="pt-1">
                    <a
                      href={data.preview_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-mono"
                    >
                      Open Raw Stream <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
