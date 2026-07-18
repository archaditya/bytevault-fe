"use client";

import Link from "next/link";
import { Star, Share2, MoreVertical, Download, Trash2, Globe, Move } from "lucide-react";
import { FileRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { useDeleteFileMutation, useToggleShareMutation, useFileImageBlob } from "@/services";
import { useFilesStore } from "@/store/files.store";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { MoveItemModal } from "./move-item-modal";

export function FileCard({ file }: { file: FileRecord }) {
  const deleteMutation = useDeleteFileMutation();
  const toggleShareMutation = useToggleShareMutation();
  const selectedItems = useFilesStore((s) => s.selectedItems);
  const toggleSelectItem = useFilesStore((s) => s.toggleSelectItem);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(file.kind);
  const { data: previewUrl } = useFileImageBlob(file.id, isImage && file.status === "READY");
  const isSelected = selectedItems.some((item) => item.id === file.id);

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectedItems.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectItem(file.id, "file");
    }
  };

  const handleDownload = () => {
    window.open(`/api/v1/files/${file.id}/download`, "_blank");
  };

  const handleToggleShare = () => {
    toggleShareMutation.mutate({ id: file.id, isPublic: !file.shared });
  };

  const handleDelete = () => {
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

        <Link href={`/files/${file.id}`} className="flex flex-col" onClick={handleCardClick}>
          <div
            className="flex h-24 items-center justify-center overflow-hidden"
            style={{ backgroundColor: `${file.thumbnailColor}14` }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="h-full w-full object-cover"
                loading="lazy"
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
            <div className="flex items-center justify-between text-[12px] text-ink-muted">
              <span className="font-mono">{formatBytes(file.sizeBytes)}</span>
              <span>{formatRelativeTime(file.uploadedAt)}</span>
            </div>
            <div className="flex items-center justify-end h-5">
              {file.shared && (
                <Badge variant="info" className="px-1.5 flex items-center gap-1">
                  <Globe className="h-2.5 w-2.5" />
                  Shared
                </Badge>
              )}
            </div>
          </div>
        </Link>

        {/* Dropdown actions trigger */}
        <div
          className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-muted hover:text-ink hover:bg-bg-overlay border border-transparent hover:border-border"
                aria-label="File actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-bg-surface border-border-strong">
              <DropdownMenuItem onClick={handleDownload} className="cursor-pointer hover:bg-bg-overlay">
                <Download className="h-3.5 w-3.5 mr-2" /> Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsMoveModalOpen(true)} className="cursor-pointer hover:bg-bg-overlay">
                <Move className="h-3.5 w-3.5 mr-2" /> Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleShare} className="cursor-pointer hover:bg-bg-overlay">
                <Share2 className="h-3.5 w-3.5 mr-2" /> {file.shared ? "Stop Sharing" : "Share"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border-strong" />
              <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-danger hover:bg-danger/10">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {isMoveModalOpen && (
        <MoveItemModal
          itemId={file.id}
          itemType="file"
          currentParentId={file.folderId}
          onClose={() => setIsMoveModalOpen(false)}
        />
      )}
    </>
  );
}
