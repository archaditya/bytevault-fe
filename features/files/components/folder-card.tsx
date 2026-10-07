"use client";

import {
  Folder,
  MoreVertical,
  Edit2,
  Move,
  Trash2,
  Share2,
  Globe,
  Copy,
  ExternalLink,
  Info,
  Lock,
  ShieldCheck,
  Terminal,
  ShoppingBag,
  FileText,
  Image as ImageIcon,
  Archive,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { FolderRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { useFilesStore } from "@/store/files.store";
import {
  useDeleteFolderMutation,
  useRenameFolderMutation,
  useToggleFolderShareMutation,
} from "@/services";
import { cn, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect } from "react";
import { MoveItemModal } from "./move-item-modal";
import { FolderDetailsModal } from "./folder-details-modal";

export function getFolderCategory(name: string) {
  const lower = (name || "").toLowerCase();
  if (
    lower.includes("cert") ||
    lower.includes("ssl") ||
    lower.includes("auth") ||
    lower.includes("secret") ||
    lower.includes("security")
  ) {
    return {
      type: "security",
      tag: "Security",
      accentColor: "#10b981",
      badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      iconClass: "text-emerald-400",
      tabClass: "bg-emerald-500/20 border-emerald-500/40",
      borderHover: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
      Icon: ShieldCheck,
    };
  }
  if (
    lower.includes("api") ||
    lower.includes("kye") || // user typed 'my API Kye'
    lower.includes("key") ||
    lower.includes("dev") ||
    lower.includes("code") ||
    lower.includes("src") ||
    lower.includes("backend") ||
    lower.includes("frontend") ||
    lower.includes("script")
  ) {
    return {
      type: "dev",
      tag: "API & Dev",
      accentColor: "#06b6d4",
      badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      iconClass: "text-cyan-400",
      tabClass: "bg-cyan-500/20 border-cyan-500/40",
      borderHover: "hover:border-cyan-500/50 hover:shadow-cyan-500/10",
      Icon: lower.includes("key") || lower.includes("kye") ? KeyRound : Terminal,
    };
  }
  if (
    lower.includes("dukan") ||
    lower.includes("shop") ||
    lower.includes("store") ||
    lower.includes("commerce") ||
    lower.includes("sale") ||
    lower.includes("business")
  ) {
    return {
      type: "commerce",
      tag: "Commerce",
      accentColor: "#f97316",
      badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      iconClass: "text-amber-400",
      tabClass: "bg-amber-500/20 border-amber-500/40",
      borderHover: "hover:border-amber-500/50 hover:shadow-amber-500/10",
      Icon: ShoppingBag,
    };
  }
  if (
    lower.includes("report") ||
    lower.includes("doc") ||
    lower.includes("invoice") ||
    lower.includes("note") ||
    lower.includes("paper")
  ) {
    return {
      type: "docs",
      tag: "Reports",
      accentColor: "#3b82f6",
      badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      iconClass: "text-blue-400",
      tabClass: "bg-blue-500/20 border-blue-500/40",
      borderHover: "hover:border-blue-500/50 hover:shadow-blue-500/10",
      Icon: FileText,
    };
  }
  if (
    lower.includes("photo") ||
    lower.includes("image") ||
    lower.includes("pic") ||
    lower.includes("screen") ||
    lower.includes("asset") ||
    lower.includes("wall")
  ) {
    return {
      type: "media",
      tag: "Media",
      accentColor: "#ec4899",
      badgeClass: "bg-pink-500/15 text-pink-400 border-pink-500/30",
      iconClass: "text-pink-400",
      tabClass: "bg-pink-500/20 border-pink-500/40",
      borderHover: "hover:border-pink-500/50 hover:shadow-pink-500/10",
      Icon: ImageIcon,
    };
  }
  if (lower.includes("archive") || lower.includes("backup") || lower.includes("zip")) {
    return {
      type: "archive",
      tag: "Archive",
      accentColor: "#8b5cf6",
      badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      iconClass: "text-purple-400",
      tabClass: "bg-purple-500/20 border-purple-500/40",
      borderHover: "hover:border-purple-500/50 hover:shadow-purple-500/10",
      Icon: Archive,
    };
  }
  return {
    type: "default",
    tag: "Folder",
    accentColor: "#f97316",
    badgeClass: "bg-accent/15 text-accent-bright border-accent/30",
    iconClass: "text-accent-bright",
    tabClass: "bg-accent/20 border-accent/40",
    borderHover: "hover:border-accent/50 hover:shadow-accent/10",
    Icon: Folder,
  };
}

export function FolderCard({ folder }: { folder: FolderRecord }) {
  const { pushFolder, selectedItems, toggleSelectItem } = useFilesStore();
  const deleteMutation = useDeleteFolderMutation(folder.parent_id);
  const renameMutation = useRenameFolderMutation(folder.parent_id);
  const toggleShareMutation = useToggleFolderShareMutation(folder.parent_id);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const isSelected = selectedItems.some((item) => item.id === folder.id);
  const category = getFolderCategory(folder.name);
  const CategoryIcon = category.Icon;

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleOpenFolder = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    pushFolder(folder.id, folder.name);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      toggleSelectItem(folder.id, "folder");
      clickTimerRef.current = null;
    }, 280);
  };

  const handleRename = () => {
    const newName = prompt(`Enter new name for folder "${folder.name}":`, folder.name);
    if (newName && newName.trim() !== "" && newName !== folder.name) {
      renameMutation.mutate({ id: folder.id, name: newName.trim() });
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents?`)) {
      deleteMutation.mutate(folder.id);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/s/folder/${folder.id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => toast.success("Folder share link copied to clipboard!"))
        .catch(() => toast.error("Could not copy link to clipboard"));
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Folder share link copied to clipboard!");
      } catch {
        toast.error("Clipboard access denied");
      }
    }
  };

  const handleToggleShare = () => {
    const newState = !folder.is_public;
    toggleShareMutation.mutate(
      { id: folder.id, isPublic: newState },
      {
        onSuccess: () => {
          if (newState) {
            handleCopyLink();
          } else {
            toast.success("Folder is now private.");
          }
        },
        onError: () => {
          toast.error("Failed to update folder sharing settings.");
        },
      }
    );
  };

  return (
    <>
      <Card
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-bg-surface p-3.5 transition-all duration-200 select-none cursor-pointer hover:shadow-md",
          category.borderHover,
          isSelected && "ring-2 ring-accent border-accent bg-accent/[0.04]"
        )}
        onClick={handleCardClick}
        onDoubleClick={handleOpenFolder}
      >
        {/* Layered physical folder tab header on top-left */}
        <div
          className={cn(
            "absolute top-0 left-0 h-1.5 w-16 rounded-br-md border-b transition-all group-hover:w-20",
            category.tabClass
          )}
        />

        {/* Checkbox overlay */}
        <div
          className={cn(
            "absolute left-2.5 top-3 z-10 transition-opacity duration-150",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (clickTimerRef.current) {
              clearTimeout(clickTimerRef.current);
              clickTimerRef.current = null;
            }
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectItem(folder.id, "folder")}
            className="h-4 w-4 rounded border-border bg-bg-raised text-accent focus:ring-accent cursor-pointer"
          />
        </div>

        {/* Top Section: Folder Icon with category badge & status pills */}
        <div className="flex items-start justify-between gap-2 pt-1">
          {/* Visual Folder Icon Artwork with Category Emblem */}
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-bg-raised/80 border border-border/60 group-hover:scale-105 transition-transform">
            <Folder className={cn("h-6 w-6 stroke-[1.8]", category.iconClass)} />
            {category.type !== "default" && (
              <div
                className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-bg-surface border shadow-sm"
                style={{ borderColor: `${category.accentColor}55` }}
              >
                <CategoryIcon
                  className="h-2.5 w-2.5 stroke-[2.2]"
                  style={{ color: category.accentColor }}
                />
              </div>
            )}
          </div>

          {/* Badges: Category Chip & Public Share Pill */}
          <div className="flex items-center gap-1.5 pl-6 shrink-0">
            {folder.is_public ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-bright border border-accent/25 hover:bg-accent/25 transition-colors cursor-pointer shadow-sm"
                title="Public shared folder. Click to copy share link."
              >
                <Globe className="h-2.5 w-2.5" />
                <span>Shared</span>
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-mono font-medium border uppercase tracking-wider",
                  category.badgeClass
                )}
              >
                {category.tag}
              </span>
            )}
          </div>
        </div>

        {/* Middle Section: Folder Name */}
        <div className="mt-3 min-w-0">
          <p
            className="truncate text-[13px] font-semibold text-ink group-hover:text-accent-bright transition-colors"
            title={folder.name}
          >
            {folder.name}
          </p>
        </div>

        {/* Bottom Section: Folder Content Stats & Quick Open Hint */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-muted border-t border-border/40 pt-2">
          <div className="flex items-center gap-1.5 text-ink-faint font-mono">
            {folder.file_count !== undefined ? (
              <span>
                {folder.file_count} {folder.file_count === 1 ? "item" : "items"}
                {folder.total_size && folder.total_size > 0
                  ? ` • ${formatBytes(folder.total_size)}`
                  : ""}
              </span>
            ) : (
              <span className="text-[10px] tracking-wide uppercase">Active Directory</span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Open</span>
            <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Dropdown Menu actions trigger */}
        <div
          className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-bg-overlay border border-transparent hover:border-border transition-colors"
                aria-label="Folder actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-bg-surface border-border-strong w-48 text-ink">
              <DropdownMenuItem onClick={handleRename} className="cursor-pointer hover:bg-bg-overlay">
                <Edit2 className="h-3.5 w-3.5 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsMoveModalOpen(true)} className="cursor-pointer hover:bg-bg-overlay">
                <Move className="h-3.5 w-3.5 mr-2" /> Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDetailsModalOpen(true)} className="cursor-pointer hover:bg-bg-overlay">
                <Info className="h-3.5 w-3.5 mr-2 text-accent-bright" /> Details & Share
              </DropdownMenuItem>

              {folder.is_public && (
                <>
                  <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer hover:bg-bg-overlay">
                    <Copy className="h-3.5 w-3.5 mr-2 text-accent-bright" /> Copy Share Link
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer hover:bg-bg-overlay">
                    <a
                      href={`/s/folder/${folder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center w-full"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-2 text-ink-muted" /> Open Shared View
                    </a>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuItem onClick={handleToggleShare} className="cursor-pointer hover:bg-bg-overlay">
                {folder.is_public ? (
                  <><Lock className="h-3.5 w-3.5 mr-2 text-danger" /> Make Private</>
                ) : (
                  <><Share2 className="h-3.5 w-3.5 mr-2 text-accent" /> Share Link</>
                )}
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
          itemId={folder.id}
          itemType="folder"
          currentParentId={folder.parent_id}
          onClose={() => setIsMoveModalOpen(false)}
        />
      )}

      {isDetailsModalOpen && (
        <FolderDetailsModal
          folder={folder}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      )}
    </>
  );
}
