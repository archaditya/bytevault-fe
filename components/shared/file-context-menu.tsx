"use client";

import { useEffect, useRef } from "react";
import {
  Eye,
  Download,
  Share2,
  ExternalLink,
  Pencil,
  Move,
  Trash2,
  FolderOpen,
  Copy,
} from "lucide-react";
import { FileRecord, FolderRecord } from "@/types";
import { cn } from "@/lib/utils";

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileRecord | FolderRecord;
  type: "file" | "folder";
}

interface FileContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
  onQuickLook?: (file: FileRecord) => void;
  onOpenFolder?: (folder: FolderRecord) => void;
  onDownload?: (file: FileRecord) => void;
  onShare?: (item: FileRecord | FolderRecord, type: "file" | "folder") => void;
  onRename?: (item: FileRecord | FolderRecord, type: "file" | "folder") => void;
  onMove?: (item: FileRecord | FolderRecord, type: "file" | "folder") => void;
  onDetails?: (file: FileRecord) => void;
  onDelete?: (item: FileRecord | FolderRecord, type: "file" | "folder") => void;
}

export function FileContextMenu({
  state,
  onClose,
  onQuickLook,
  onOpenFolder,
  onDownload,
  onShare,
  onRename,
  onMove,
  onDetails,
  onDelete,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleContextMenuOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("contextmenu", handleContextMenuOutside);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("contextmenu", handleContextMenuOutside);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [state, onClose]);

  if (!state) return null;

  const { x, y, item, type } = state;

  // Viewport clamping
  const menuWidth = 210;
  const menuHeight = type === "file" ? 280 : 210;
  const clampedX = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - menuWidth - 12);
  const clampedY = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - menuHeight - 12);

  const isFile = type === "file";
  const file = isFile ? (item as FileRecord) : null;
  const folder = !isFile ? (item as FolderRecord) : null;

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(12, clampedX)}px`, top: `${Math.max(12, clampedY)}px` }}
      className={cn(
        "fixed z-50 min-w-[200px] rounded-xl bg-bg-surface/95 border border-border-strong backdrop-blur-md shadow-2xl p-1.5 animate-in fade-in-50 zoom-in-95 duration-100 select-none text-xs"
      )}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="px-2.5 py-1.5 border-b border-border text-[11px] font-semibold text-ink-muted truncate max-w-[200px]">
        {item.name}
      </div>

      <div className="py-1 flex flex-col gap-0.5">
        {isFile && file && (
          <button
            onClick={() => {
              onClose();
              onQuickLook?.(file);
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left text-ink hover:text-ink hover:bg-bg-raised transition-colors"
          >
            <span className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-accent" />
              <span>Quick Look</span>
            </span>
            <kbd className="text-[10px] text-ink-faint font-mono">Space</kbd>
          </button>
        )}

        {!isFile && folder && (
          <button
            onClick={() => {
              onClose();
              onOpenFolder?.(folder);
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left text-ink hover:text-ink hover:bg-bg-raised transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5 text-accent" />
              <span>Open Folder</span>
            </span>
            <kbd className="text-[10px] text-ink-faint font-mono">Enter</kbd>
          </button>
        )}

        {isFile && file && (
          <button
            onClick={() => {
              onClose();
              onDownload?.(file);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-ink hover:text-ink hover:bg-bg-raised transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-ink-muted" />
            <span>Download</span>
          </button>
        )}

        <button
          onClick={() => {
            onClose();
            onShare?.(item, type);
          }}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-ink hover:text-ink hover:bg-bg-raised transition-colors"
        >
          {isFile ? <Share2 className="h-3.5 w-3.5 text-ink-muted" /> : <Copy className="h-3.5 w-3.5 text-ink-muted" />}
          <span>{isFile ? "Get Share Link" : "Copy Link"}</span>
        </button>

        {onRename && (
          <button
            onClick={() => {
              onClose();
              onRename(item, type);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-ink hover:text-ink hover:bg-bg-raised transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-ink-muted" />
            <span>Rename</span>
          </button>
        )}

        {onMove && (
          <button
            onClick={() => {
              onClose();
              onMove(item, type);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-ink hover:text-ink hover:bg-bg-raised transition-colors"
          >
            <Move className="h-3.5 w-3.5 text-ink-muted" />
            <span>Move to...</span>
          </button>
        )}

        {isFile && file && onDetails && (
          <button
            onClick={() => {
              onClose();
              onDetails(file);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-ink hover:text-ink hover:bg-bg-raised transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-ink-muted" />
            <span>Details</span>
          </button>
        )}

        <div className="h-px bg-border my-1" />

        {onDelete && (
          <button
            onClick={() => {
              onClose();
              onDelete(item, type);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
