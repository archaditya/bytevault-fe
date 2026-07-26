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

  // Fix: Check for media kinds ("image", "video", "document")
  const hasPreview = ["image", "video", "document"].includes(file.kind);
  const { data: previewUrl } = useFileImageBlob(file.id, hasPreview && file.status === "READY");
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
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{formatBytes(file.sizeBytes)}</span>
              <span>{formatRelativeTime(file.uploadedAt)}</span>
            </div>
          </div>
        </Link>
      </Card>
    </>
  );
}
