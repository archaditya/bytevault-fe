"use client";

import { Folder, MoreVertical, Edit2, Move, Trash2, Share2, Link2 } from "lucide-react";
import { FolderRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { useFilesStore } from "@/store/files.store";
import { useDeleteFolderMutation, useRenameFolderMutation, useToggleFolderShareMutation } from "@/services";
import { cn } from "@/lib/utils";
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

export function FolderCard({ folder }: { folder: FolderRecord }) {
  const { pushFolder, selectedItems, toggleSelectItem } = useFilesStore();
  const deleteMutation = useDeleteFolderMutation(folder.parent_id);
  const renameMutation = useRenameFolderMutation(folder.parent_id);
  const toggleShareMutation = useToggleFolderShareMutation(folder.parent_id);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const isSelected = selectedItems.some((item) => item.id === folder.id);

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

  const handleToggleShare = () => {
    const newState = !folder.is_public;
    toggleShareMutation.mutate(
      { id: folder.id, isPublic: newState },
      {
        onSuccess: () => {
          if (newState) {
            const shareUrl = `${window.location.origin}/s/folder/${folder.id}`;
            navigator.clipboard?.writeText(shareUrl).catch(() => {});
            toast.success("Folder shared! Link copied to clipboard.");
          } else {
            toast.success("Folder is now private.");
          }
        },
      }
    );
  };

  return (
    <>
      <Card 
        className={cn(
          "group relative flex flex-col overflow-hidden bg-bg-surface p-4 transition-all duration-150 hover:border-border-strong select-none cursor-pointer",
          isSelected && "ring-2 ring-accent border-accent"
        )}
        onClick={handleCardClick}
        onDoubleClick={handleOpenFolder}
      >
        {/* Checkbox overlay */}
        <div
          className={cn(
            "absolute left-2.5 top-2.5 z-10 transition-opacity duration-150",
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

        <div className="flex flex-col gap-3 pt-2">
          <Folder className="h-8 w-8 text-accent-bright" />
          <div>
            <p className="truncate text-[13px] font-semibold text-ink" title={folder.name}>
              {folder.name}
            </p>
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
                className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-muted hover:text-ink hover:bg-bg-overlay border border-transparent hover:border-border"
                aria-label="Folder actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-bg-surface border-border-strong">
              <DropdownMenuItem onClick={handleRename} className="cursor-pointer hover:bg-bg-overlay">
                <Edit2 className="h-3.5 w-3.5 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsMoveModalOpen(true)} className="cursor-pointer hover:bg-bg-overlay">
                <Move className="h-3.5 w-3.5 mr-2" /> Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleShare} className="cursor-pointer hover:bg-bg-overlay">
                {folder.is_public ? (
                  <><Link2 className="h-3.5 w-3.5 mr-2" /> Make Private</>
                ) : (
                  <><Share2 className="h-3.5 w-3.5 mr-2" /> Share Link</>
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
    </>
  );
}
