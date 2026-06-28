"use client";

import { useState, useRef, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFoldersFlat, useUploadFileMutation, useCreateFolderMutation } from "@/services";
import { FolderRecord } from "@/types";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FolderTreeNode {
  folder: FolderRecord;
  children: FolderTreeNode[];
}

/** Build a tree structure from a flat list of folders using parent_id relationships. */
function buildFolderTree(folders: FolderRecord[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  for (const folder of folders) {
    map.set(folder.id, { folder, children: [] });
  }

  for (const folder of folders) {
    const node = map.get(folder.id)!;
    if (folder.parent_id && map.has(folder.parent_id)) {
      map.get(folder.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function FolderTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: FolderTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.folder.id;

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors text-left",
          isSelected
            ? "bg-accent/15 text-accent-bright border border-accent/30"
            : "text-ink-muted hover:bg-bg-overlay hover:text-ink border border-transparent"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect(node.folder.id)}
      >
        {hasChildren ? (
          <span
            className="flex-shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
            )}
          </span>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        {isSelected ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-accent" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 text-ink-faint" />
        )}
        <span className="truncate">{node.folder.name}</span>
        {isSelected && <Check className="ml-auto h-3.5 w-3.5 text-accent flex-shrink-0" />}
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: allFolders, isLoading: foldersLoading } = useFoldersFlat();
  const uploadMutation = useUploadFileMutation();
  const createFolderMutation = useCreateFolderMutation();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const folderTree = useMemo(() => {
    if (!allFolders) return [];
    return buildFolderTree(allFolders);
  }, [allFolders]);

  const isRootSelected = selectedFolderId === null;

  const handleSelectRoot = () => {
    setSelectedFolderId(null);
  };

  const handleSelectFolder = (id: string) => {
    setSelectedFolderId(id);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    try {
      await createFolderMutation.mutateAsync({
        name: trimmed,
        parentId: selectedFolderId,
      });
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (err: any) {
      alert(err.message || "Failed to create folder");
    }
  };

  const handleUploadConfirm = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync({ file: selectedFile, folderId: selectedFolderId });
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const resetState = () => {
    setSelectedFolderId(null);
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Instructions */}
        <p className="text-[13px] text-ink-muted -mt-1">
          Select a destination folder for your file.
        </p>

        {/* Folder tree */}
        <div className="rounded-md border border-border bg-bg-raised max-h-64 overflow-y-auto py-1.5 px-1">
          {foldersLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-ink-faint">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading folders…
            </div>
          ) : (
            <>
              {/* Root option */}
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors text-left",
                  isRootSelected
                    ? "bg-accent/15 text-accent-bright border border-accent/30"
                    : "text-ink-muted hover:bg-bg-overlay hover:text-ink border border-transparent"
                )}
                onClick={handleSelectRoot}
              >
                <span className="w-3.5 flex-shrink-0" />
                {isRootSelected ? (
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-accent" />
                ) : (
                  <Folder className="h-4 w-4 flex-shrink-0 text-ink-faint" />
                )}
                <span>Root (/)</span>
                {isRootSelected && <Check className="ml-auto h-3.5 w-3.5 text-accent flex-shrink-0" />}
              </button>

              {/* Nested folder items */}
              {folderTree.map((node) => (
                <FolderTreeItem
                  key={node.folder.id}
                  node={node}
                  depth={1}
                  selectedId={selectedFolderId}
                  onSelect={handleSelectFolder}
                />
              ))}

              {/* Empty state */}
              {folderTree.length === 0 && (
                <p className="text-xs text-ink-faint text-center py-3">
                  No folders yet. Create one below or upload to Root.
                </p>
              )}
            </>
          )}
        </div>

        {/* New folder inline form */}
        {isCreatingFolder ? (
          <form onSubmit={handleCreateFolder} className="flex items-center gap-2">
            <Input
              placeholder="Folder name…"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={createFolderMutation.isPending || !newFolderName.trim()}
            >
              {createFolderMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-bright transition-colors"
            onClick={() => setIsCreatingFolder(true)}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Folder
          </button>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUploadConfirm}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploadMutation.isPending ? "Uploading…" : "Choose File & Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
