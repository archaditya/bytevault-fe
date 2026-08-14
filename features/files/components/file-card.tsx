"use client";

import Link from "next/link";
import { Star, Share2, MoreVertical, Download, Trash2, Globe, Move, Pencil } from "lucide-react";
import { FileRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { useDeleteFileMutation, useToggleShareMutation, useFileImageBlob, useRenameFileMutation } from "@/services";
import { useFilesStore } from "@/store/files.store";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function FileCard({ file }: { file: FileRecord }) {
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectedItems.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectItem(file.id, "file");
    }
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

  return (
    <>
      <Card className={cn(
        "group relative flex flex-col overflow-hidden p-0 transition-all duration-150 hover:border-border-strong bg-bg-surface",
        isSelected && "ring-2 ring-accent border-accent"
      )}>
        {/* Checkbox overlay */}
        <div
          className={cn(
            "absolute left-2.5 top-2.5 z-10 transition-opacity duration-150",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectItem(file.id, "file")}
            className="h-4 w-4 rounded border-border bg-bg-raised text-accent focus:ring-accent cursor-pointer"
          />
        </div>

        {/* Action icons on top right */}
        <div
          className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-bg-surface/80 backdrop-blur-sm p-1 rounded-md border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setNewFileName(file.name);
              setIsRenameOpen(true);
            }}
            className="p-1 text-ink-muted hover:text-ink transition-colors rounded"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1 text-ink-muted hover:text-ink transition-colors rounded"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-ink-muted hover:text-danger transition-colors rounded"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <Link href={`/files/${file.id}`} className="flex flex-col" onClick={handleCardClick}>
          <div
            className="flex h-24 items-center justify-center overflow-hidden"
            style={{ backgroundColor: `${file.thumbnailColor}14` }}
          >
            {displayUrl && !imgError ? (
              <img
                src={displayUrl}
                alt={file.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div style={{ color: file.thumbnailColor }}>
                <FileKindIcon kind={file.kind} className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 p-3.5">
            <p className="truncate text-[13px] font-medium text-ink" title={file.name}>
              {file.name}
            </p>
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{formatBytes(file.sizeBytes)}</span>
              <span>{formatRelativeTime(file.uploadedAt)}</span>
            </div>
          </div>
        </Link>
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
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsRenameOpen(false)}>
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
