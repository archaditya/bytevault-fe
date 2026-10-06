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
} from "lucide-react";
import { FolderRecord } from "@/types";
import { useFilesStore } from "@/store/files.store";
import {
  useDeleteFolderMutation,
  useRenameFolderMutation,
  useToggleFolderShareMutation,
} from "@/services";
import { cn, formatRelativeTime } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { MoveItemModal } from "./move-item-modal";
import { FolderDetailsModal } from "./folder-details-modal";

export function FolderListRow({ folder }: { folder: FolderRecord }) {
  const { pushFolder, selectedItems, toggleSelectItem } = useFilesStore();
  const deleteMutation = useDeleteFolderMutation(folder.parent_id);
  const renameMutation = useRenameFolderMutation(folder.parent_id);
  const toggleShareMutation = useToggleFolderShareMutation(folder.parent_id);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const isSelected = selectedItems.some((item) => item.id === folder.id);

  const handleDoubleClick = () => {
    pushFolder(folder.id, folder.name);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSelectItem(folder.id, "folder");
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
    navigator.clipboard?.writeText(shareUrl);
    toast.success("Folder share link copied to clipboard!");
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
      <div
        className={cn(
          "grid grid-cols-[1fr_110px_110px_40px] gap-4 items-center border-b border-border/60 px-4 py-3 text-[13px] transition-colors hover:bg-bg-overlay/40 select-none cursor-pointer",
          isSelected && "bg-bg-overlay border-l-2 border-l-accent"
        )}
        onDoubleClick={handleDoubleClick}
        onClick={handleRowClick}
      >
        <span className="flex items-center gap-2.5 font-medium text-ink truncate min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectItem(folder.id, "folder")}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border bg-bg-raised text-accent focus:ring-accent cursor-pointer shrink-0"
          />
          <Folder className="h-4.5 w-4.5 text-accent-bright shrink-0" />
          <span className="truncate" title={folder.name}>
            {folder.name}
          </span>
          {folder.is_public && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink();
              }}
              className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-bright border border-accent/25 hover:bg-accent/25 transition-colors cursor-pointer shrink-0"
              title="Public shared folder. Click to copy share link."
            >
              <Globe className="h-2.5 w-2.5" />
              <span>Shared</span>
            </span>
          )}
        </span>
        <span className="font-mono text-ink-muted">
          {folder.is_public ? `${folder.views || 0} views` : "—"}
        </span>
        <span className="text-ink-muted">{formatRelativeTime(folder.created_at)}</span>
        <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-muted hover:text-ink hover:bg-bg-overlay border border-transparent hover:border-border"
                aria-label="Folder actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-bg-surface border-border-strong w-48">
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

              <DropdownMenuItem
                onClick={handleToggleShare}
                disabled={toggleShareMutation.isPending}
                className="cursor-pointer hover:bg-bg-overlay"
              >
                {folder.is_public ? (
                  <>
                    <Lock className="h-3.5 w-3.5 mr-2 text-danger" /> Make Private
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 mr-2 text-accent" /> Share Link
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border-strong" />
              <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-danger hover:bg-danger/10">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

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
