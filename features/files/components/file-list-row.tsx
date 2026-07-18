"use client";

import Link from "next/link";
import { Star, Share2 } from "lucide-react";
import { FileRecord } from "@/types";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { useFilesStore } from "@/store/files.store";
import { cn } from "@/lib/utils";

export function FileListRow({ file }: { file: FileRecord }) {
  const selectedItems = useFilesStore((s) => s.selectedItems);
  const toggleSelectItem = useFilesStore((s) => s.toggleSelectItem);
  const isSelected = selectedItems.some((item) => item.id === file.id);

  const handleRowClick = (e: React.MouseEvent) => {
    if (selectedItems.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectItem(file.id, "file");
    }
  };

  return (
    <Link
      href={`/files/${file.id}`}
      onClick={handleRowClick}
      className={cn(
        "grid grid-cols-[1fr_110px_110px_40px] items-center gap-4 border-b border-border px-4 py-3 text-[13px] transition-colors hover:bg-bg-overlay/60 last:border-b-0",
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
        {file.starred && <Star className="h-3 w-3 shrink-0 fill-live text-live" />}
      </div>
      <span className="font-mono text-ink-muted">{formatBytes(file.sizeBytes)}</span>
      <span className="text-ink-muted">{formatRelativeTime(file.uploadedAt)}</span>
      <div className="flex justify-end">
        {file.shared && <Share2 className="h-3.5 w-3.5 text-info" />}
      </div>
    </Link>
  );
}
