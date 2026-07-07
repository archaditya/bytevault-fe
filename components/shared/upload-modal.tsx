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
  File as FileIcon,
  X,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFoldersFlat, useUploadFileMutation, useCreateFolderMutation } from "@/services";
import { FolderRecord } from "@/types";
import { cn, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FolderTreeNode {
  folder: FolderRecord;
  children: FolderTreeNode[];
}

interface QueuedFile {
  id: string;
  file: File;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

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

  // Files Queue State
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      toast.success("Folder created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const validFiles: QueuedFile[] = [];
    let oversizedCount = 0;

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedCount++;
        return;
      }
      validFiles.push({
        id: Math.random().toString(36).substring(7),
        file,
        status: "idle",
      });
    });

    if (oversizedCount > 0) {
      toast.error(`${oversizedCount} file(s) exceeded the 100MB limit and were skipped.`);
    }

    setQueue((prev) => [...prev, ...validFiles]);
  };

  const removeFileFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUploadAll = async () => {
    if (queue.length === 0) return;
    setIsUploading(true);

    // Process files sequentially to avoid rate-limits or concurrency issues
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "success") continue; // Skip already completed uploads

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q))
      );

      try {
        await uploadMutation.mutateAsync({
          file: item.file,
          folderId: selectedFolderId,
        });

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "success" } : q))
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: err.message || "Failed" } : q))
        );
      }
    }

    setIsUploading(false);
    toast.success("Batch upload complete!");
  };

  const resetState = () => {
    setSelectedFolderId(null);
    setIsCreatingFolder(false);
    setNewFolderName("");
    setQueue([]);
    setIsUploading(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isUploading) return; // Prevent closing while upload is in progress
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-bg-surface border-border-strong text-ink font-sans flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
        />

        <p className="text-[13px] text-ink-muted -mt-1">
          Select destination folder and queue files to upload. Max 100MB per file.
        </p>

        {/* Scrollable container for Content */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          {/* Destination Folder Selection */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Destination Folder</span>
            <div className="rounded-md border border-border bg-bg-raised max-h-36 overflow-y-auto py-1 px-1">
              {foldersLoading ? (
                <div className="flex items-center justify-center py-4 text-xs text-ink-faint">
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Loading folders…
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[13px] font-medium transition-colors text-left",
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

                  {folderTree.map((node) => (
                    <FolderTreeItem
                      key={node.folder.id}
                      node={node}
                      depth={1}
                      selectedId={selectedFolderId}
                      onSelect={handleSelectFolder}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Create Folder inline */}
            {isCreatingFolder ? (
              <form onSubmit={handleCreateFolder} className="flex items-center gap-2 mt-1">
                <Input
                  placeholder="New folder name…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  className="flex-1 h-8 text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8"
                  disabled={createFolderMutation.isPending || !newFolderName.trim()}
                >
                  {createFolderMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
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
                className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-bright transition-colors mt-0.5 self-start"
                onClick={() => setIsCreatingFolder(true)}
              >
                <FolderPlus className="h-3 w-3" />
                New Folder
              </button>
            )}
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileSelectClick}
            className={cn(
              "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-5 cursor-pointer transition-all",
              isDragging
                ? "border-accent bg-accent/5"
                : "border-border-strong bg-bg-raised hover:border-accent/40"
            )}
          >
            <Upload className={cn("h-8 w-8 text-ink-faint mb-2", isDragging && "text-accent animate-bounce")} />
            <span className="text-xs font-semibold text-ink">
              Drag & drop files here, or <span className="text-accent hover:underline">browse</span>
            </span>
            <span className="text-[10px] text-ink-faint mt-1">
              Supports any file type up to 100MB
            </span>
          </div>

          {/* File Queue List */}
          {queue.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-muted">Queue ({queue.length} files)</span>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-border rounded-md p-1 bg-bg-surface">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-1.5 rounded-sm bg-bg-raised/50 border border-border/50 text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileIcon className="h-4 w-4 text-ink-faint flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-ink truncate" title={item.file.name}>
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-ink-faint font-mono">
                          {formatBytes(item.file.size)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {item.status === "idle" && (
                        <button
                          type="button"
                          onClick={() => removeFileFromQueue(item.id)}
                          disabled={isUploading}
                          className="text-ink-faint hover:text-danger p-0.5 rounded transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                      )}
                      {item.status === "success" && (
                        <FileCheck className="h-3.5 w-3.5 text-success" />
                      )}
                      {item.status === "error" && (
                        <div className="flex items-center gap-1 text-danger" title={item.error}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="text-[10px]">Failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border mt-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleUploadAll}
            disabled={isUploading || queue.length === 0 || queue.every((item) => item.status === "success")}
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isUploading ? "Uploading Queue…" : "Start Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
