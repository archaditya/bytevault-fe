"use client";

import { useState } from "react";
import { useFoldersFlat, useMoveFileMutation, useMoveFolderMutation } from "@/services";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MoveItemModalProps {
  itemId: string;
  itemType: "file" | "folder";
  currentParentId?: string | null;
  onClose: () => void;
}

export function MoveItemModal({ itemId, itemType, currentParentId, onClose }: MoveItemModalProps) {
  const { data: allFolders, isLoading } = useFoldersFlat();
  const moveFileMutation = useMoveFileMutation();
  const moveFolderMutation = useMoveFolderMutation();
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  const handleMove = async () => {
    const targetParentId = selectedParentId === "" ? null : selectedParentId;

    try {
      if (itemType === "file") {
        await moveFileMutation.mutateAsync({ id: itemId, folderId: targetParentId });
      } else {
        await moveFolderMutation.mutateAsync({ id: itemId, parentId: targetParentId });
      }
      onClose();
    } catch (err) {
      console.error("Failed to move item:", err);
    }
  };

  const validFolders = allFolders?.filter((f) => {
    if (itemType === "folder" && f.id === itemId) return false;
    return true;
  }) || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
        <DialogHeader>
          <DialogTitle>Move {itemType}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <label className="text-[13px] font-medium text-ink-muted mb-2 block">
            Select Destination Folder
          </label>
          {isLoading ? (
            <div className="text-sm text-ink-faint">Loading folders...</div>
          ) : (
            <select
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
            >
              <option value="">Root (/)</option>
              {validFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={moveFileMutation.isPending || moveFolderMutation.isPending} size="sm">
            Move
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
