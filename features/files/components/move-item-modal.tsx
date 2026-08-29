"use client";

import { useState } from "react";
import { useFoldersFlat, useMoveFileMutation, useMoveFolderMutation, useCreateFolderMutation } from "@/services";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MoveItemModalProps {
  itemId?: string;
  itemType?: "file" | "folder";
  items?: { id: string; type: "file" | "folder" }[];
  currentParentId?: string | null;
  onClose: () => void;
}

export function MoveItemModal({ itemId, itemType, items, currentParentId, onClose }: MoveItemModalProps) {
  const { data: allFolders, isLoading } = useFoldersFlat();
  const moveFileMutation = useMoveFileMutation();
  const moveFolderMutation = useMoveFolderMutation();
  const createFolderMutation = useCreateFolderMutation(currentParentId);

  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleMove = async () => {
    const targetParentId = selectedParentId === "" ? null : selectedParentId;
    const itemsToMove = items || (itemId && itemType ? [{ id: itemId, type: itemType }] : []);

    try {
      for (const item of itemsToMove) {
        if (item.type === "file") {
          await moveFileMutation.mutateAsync({ id: item.id, folderId: targetParentId });
        } else {
          await moveFolderMutation.mutateAsync({ id: item.id, parentId: targetParentId });
        }
      }
      onClose();
    } catch (err) {
      console.error("Failed to move items:", err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const parentId = selectedParentId === "" ? null : selectedParentId;
      const newFolder = await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
        parentId: parentId,
      });
      setNewFolderName("");
      setShowCreateFolder(false);
      if (newFolder?.id) {
        setSelectedParentId(newFolder.id);
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const validFolders = allFolders?.filter((f) => {
    const itemsToMove = items || (itemId && itemType ? [{ id: itemId, type: itemType }] : []);
    const folderIds = itemsToMove.filter((item) => item.type === "folder").map((item) => item.id);
    if (folderIds.includes(f.id)) return false;
    return true;
  }) || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
        <DialogHeader>
          <DialogTitle>Move Items</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-ink-muted">
              Select Destination Folder
            </label>
            <button
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
            >
              + Create Folder
            </button>
          </div>

          {showCreateFolder && (
            <form onSubmit={handleCreateFolder} className="flex gap-2 items-center bg-bg-raised/40 p-2.5 rounded border border-border">
              <input
                type="text"
                placeholder="New folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 rounded border border-border bg-bg-raised px-2.5 py-1 text-xs text-ink outline-none focus:border-accent"
                autoFocus
              />
              <Button type="submit" size="sm" disabled={createFolderMutation.isPending}>
                Create
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateFolder(false)}>
                Cancel
              </Button>
            </form>
          )}

          {isLoading ? (
            <div className="text-sm text-ink-faint">Loading folders...</div>
          ) : (
            <select
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
            >
              <option value="">🏠 Home (All Files)</option>
              {validFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2 justify-end">
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
