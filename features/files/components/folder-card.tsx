"use client";

import { Folder, MoreVertical, Edit2, Move, Trash2 } from "lucide-react";
import { FolderRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { useFilesStore } from "@/store";
import { useDeleteFolderMutation, useRenameFolderMutation } from "@/services";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { MoveItemModal } from "./move-item-modal";

export function FolderCard({ folder }: { folder: FolderRecord }) {
  const { pushFolder } = useFilesStore();
  const deleteMutation = useDeleteFolderMutation(folder.parent_id);
  const renameMutation = useRenameFolderMutation(folder.parent_id);
  
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const handleOpenFolder = () => {
    pushFolder(folder.id, folder.name);
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

  return (
    <>
      <Card
        className="group relative flex flex-col items-center justify-center p-4 cursor-pointer transition-colors hover:border-border-strong bg-bg-surface select-none h-28"
        onClick={handleOpenFolder}
      >
        <div className="text-accent-bright mb-2">
          <Folder className="h-10 w-10 fill-accent/20" />
        </div>
        <p className="truncate text-[13px] font-medium text-ink w-full text-center" title={folder.name}>
          {folder.name}
        </p>

        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-5 w-5 items-center justify-center rounded-sm bg-bg-raised/90 text-ink-muted hover:text-ink border border-border"
                aria-label="Folder actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-bg-surface border-border-strong" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleRename} className="cursor-pointer hover:bg-bg-overlay">
                <Edit2 className="h-3.5 w-3.5 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsMoveModalOpen(true)} className="cursor-pointer hover:bg-bg-overlay">
                <Move className="h-3.5 w-3.5 mr-2" /> Move
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
