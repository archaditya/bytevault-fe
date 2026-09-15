"use client";

import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Download,
  Trash2,
  Share2,
  Pencil,
  Check,
  ExternalLink,
} from "lucide-react";
import { FileRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatBytes, formatRelativeTime, cn } from "@/lib/utils";
import {
  useDeleteFileMutation,
  useToggleShareMutation,
  useFileImageBlob,
  useRenameFileMutation,
} from "@/services";
import { useFilesStore } from "@/store/files.store";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function FileCard({ file }: { file: FileRecord }) {
  const router = useRouter();
  const deleteMutation = useDeleteFileMutation();
  const toggleShareMutation = useToggleShareMutation();
  const renameMutation = useRenameFileMutation();
  const selectedItems = useFilesStore((s) => s.selectedItems);
  const toggleSelectItem = useFilesStore((s) => s.toggleSelectItem);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newFileName, setNewFileName] = useState(file.name);

  const isVisualMedia =
    file.kind === "image" ||
    file.kind === "video" ||
    (file.kind === "document" &&
      (file.mimeType === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")));

  const { data: previewUrl } = useFileImageBlob(
    file.id,
    isVisualMedia && !file.thumbnailUrl && file.status === "READY"
  );
  const displayUrl = isVisualMedia ? file.thumbnailUrl || previewUrl : undefined;
  const isSelected = selectedItems.some((item) => item.id === file.id);
  const [imgError, setImgError] = useState(false);

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleOpenFile = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    router.push(`/files/${file.id}`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      toggleSelectItem(file.id, "file");
      clickTimerRef.current = null;
    }, 280);
  };

  const handleSelectToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSelectItem(file.id, "file");
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`/api/v1/files/${file.id}/download`, "_blank");
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      await renameMutation.mutateAsync({ id: file.id, filename: newFileName.trim() });
      toast.success("File renamed successfully");
      setIsRenameOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to rename file");
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      deleteMutation.mutate(file.id);
    }
  };

  const handleToggleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleShareMutation.mutate({ id: file.id, isPublic: !file.shared });
  };

  return (
    <>
      <Card
        onClick={handleCardClick}
        onDoubleClick={handleOpenFile}
        className={cn(
          "group relative flex flex-col rounded-2xl border bg-bg-surface p-2.5 transition-all duration-200 cursor-pointer select-none",
          isSelected
            ? "ring-2 ring-accent border-accent bg-accent/[0.04] shadow-lg shadow-accent/10"
            : "border-border/80 hover:border-border-strong hover:shadow-md hover:bg-bg-overlay/20"
        )}
      >
        {/* Top Header: Selectable Icon + Title + Action Menu */}
        <div className="flex items-center gap-2 mb-2 px-1">
          {/* Select Toggle Button / Kind Icon */}
          <button
            type="button"
            onClick={handleSelectToggle}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm transition-all cursor-pointer",
              isSelected
                ? "bg-accent text-white"
                : "hover:ring-2 hover:ring-accent/50 group-hover:scale-105"
            )}
            style={
              isSelected
                ? undefined
                : {
                    backgroundColor: `${file.thumbnailColor}18`,
                    color: file.thumbnailColor,
                  }
            }
            title={isSelected ? "Deselect file" : "Select file"}
          >
            {isSelected ? (
              <Check className="h-4 w-4 stroke-[2.5]" />
            ) : (
              <FileKindIcon kind={file.kind} className="h-4 w-4" />
            )}
          </button>

          {/* File Name */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "truncate text-[13px] font-semibold transition-colors",
                isSelected ? "text-accent-bright" : "text-ink group-hover:text-accent"
              )}
              title={file.name}
            >
              {file.name}
            </p>
          </div>

          {/* Actions Dropdown Menu */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-bg-raised hover:text-ink transition-colors"
                  aria-label="File options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-bg-surface border-border-strong text-ink">
                <DropdownMenuItem
                  onClick={handleOpenFile}
                  className="gap-2 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setNewFileName(file.name);
                    setIsRenameOpen(true);
                  }}
                  className="gap-2 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload} className="gap-2 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleShare} className="gap-2 text-xs">
                  <Share2 className="h-3.5 w-3.5" />
                  {file.shared ? "Make Private" : "Share Link"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="gap-2 text-xs text-danger focus:text-danger focus:bg-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Middle Canvas: Large Visual Preview Canvas */}
        <div
          className={cn(
            "relative h-36 sm:h-40 w-full rounded-xl overflow-hidden border flex items-center justify-center transition-all",
            isSelected
              ? "bg-accent/10 border-accent/30"
              : "bg-bg-raised/70 border-border/50 group-hover:bg-bg-raised"
          )}
        >
          {displayUrl && !imgError ? (
            <img
              src={displayUrl}
              alt={file.name}
              className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center select-none">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110 duration-200"
                style={{
                  backgroundColor: `${file.thumbnailColor}22`,
                  color: file.thumbnailColor,
                }}
              >
                <FileKindIcon kind={file.kind} className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-mono text-ink-faint uppercase">
                {file.mimeType?.split("/")[1] || file.kind}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Footer: Size/Date & Tag Badges */}
        <div className="flex items-center justify-between gap-2 mt-2 px-1 text-[11px] text-ink-muted">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-ink-faint">{formatBytes(file.sizeBytes)}</span>
            <span className="text-ink-faint">•</span>
            <span className="truncate">{formatRelativeTime(file.uploadedAt)}</span>
          </div>

          {/* Tags Chips */}
          {file.tags && file.tags.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {file.tags.slice(0, 1).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent border border-accent/20 truncate max-w-[85px]"
                  title={tag}
                >
                  #{tag}
                </span>
              ))}
              {file.tags.length > 1 && (
                <span
                  className="text-[9px] font-semibold text-ink-faint px-1 py-0.5 rounded bg-bg-raised"
                  title={file.tags.slice(1).join(", ")}
                >
                  +{file.tags.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Rename Modal */}
      {isRenameOpen && (
        <Dialog open onOpenChange={setIsRenameOpen}>
          <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
            <DialogHeader>
              <DialogTitle>Rename File</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted">File Name</label>
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsRenameOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={renameMutation.isPending}>
                  {renameMutation.isPending ? "Renaming..." : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
