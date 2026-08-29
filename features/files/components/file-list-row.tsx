"use client";

import Link from "next/link";
import { Star, Share2, Pencil, Trash2 } from "lucide-react";
import { FileRecord } from "@/types";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { useFilesStore } from "@/store/files.store";
import { useDeleteFileMutation, useRenameFileMutation } from "@/services";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function FileListRow({ file }: { file: FileRecord }) {
  const selectedItems = useFilesStore((s) => s.selectedItems);
  const toggleSelectItem = useFilesStore((s) => s.toggleSelectItem);
  const deleteMutation = useDeleteFileMutation();
  const renameMutation = useRenameFileMutation();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newFileName, setNewFileName] = useState(file.name);

  const isSelected = selectedItems.some((item) => item.id === file.id);

  const handleRowClick = (e: React.MouseEvent) => {
    if (selectedItems.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectItem(file.id, "file");
    }
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
      <Link
        href={`/files/${file.id}`}
        onClick={handleRowClick}
        className={cn(
          "grid grid-cols-[1fr_110px_110px_70px] items-center gap-4 border-b border-border px-4 py-3 text-[13px] transition-colors hover:bg-bg-overlay/60 last:border-b-0 group",
          isSelected && "bg-bg-overlay border-l-2 border-l-accent"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectItem(file.id, "file")}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border bg-bg-raised text-accent focus:ring-accent cursor-pointer"
          />
          <div style={{ color: file.thumbnailColor }}>
            <FileKindIcon kind={file.kind} />
          </div>
          <span className="truncate font-medium text-ink">{file.name}</span>
          {file.tags && file.tags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              {file.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-accent/10 text-accent border border-accent/20 truncate max-w-[80px]"
                  title={tag}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {file.starred && <Star className="h-3 w-3 shrink-0 fill-live text-live" />}
        </div>
        <span className="font-mono text-ink-muted">{formatBytes(file.sizeBytes)}</span>
        <span className="text-ink-muted">{formatRelativeTime(file.uploadedAt)}</span>
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {file.shared && <Share2 className="h-3.5 w-3.5 text-info mr-1" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setNewFileName(file.name);
              setIsRenameOpen(true);
            }}
            className="p-1 text-ink-muted hover:text-ink transition-colors opacity-0 group-hover:opacity-100 rounded"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-ink-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 rounded"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Link>

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
