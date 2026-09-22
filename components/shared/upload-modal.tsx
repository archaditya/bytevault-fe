"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
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
  AlertTriangle,
  FileCheck,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useFoldersFlat,
  useUploadFileMutation,
  useCreateFolderMutation,
  useQuota,
  checkFileConflicts,
} from "@/services";
import { FolderRecord } from "@/types";
import { cn, formatBytes } from "@/lib/utils";
import { useFilesStore } from "@/store/files.store";
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
  conflictAction?: "replace" | "keep_both";
}

interface ConflictItem {
  queueId: string;
  filename: string;
  newFileSize: number;
  existingFile: {
    id: string;
    filename: string;
    file_size: number;
    updated_at: string;
    created_at: string;
  };
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
            : "text-ink-muted hover:bg-bg-overlay hover:text-ink border border-transparent",
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
        {isSelected && (
          <Check className="ml-auto h-3.5 w-3.5 text-accent flex-shrink-0" />
        )}
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
  const currentFolderId = useFilesStore((s) => s.currentFolderId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: allFolders, isLoading: foldersLoading } = useFoldersFlat();
  const uploadMutation = useUploadFileMutation();
  const createFolderMutation = useCreateFolderMutation();
  const { data: quota } = useQuota();

  // Dynamically calculate limits based on user quota settings, default to 100MB
  const maxFileSizeBytes = quota?.max_file_size_bytes || 100 * 1024 * 1024;
  const maxFileSizeMb = Math.round(maxFileSizeBytes / (1024 * 1024));

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Files Queue State
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  const dragCounter = useRef(0);

  const [conflictList, setConflictList] = useState<ConflictItem[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  // Sync folder selection when modal opens or user navigates to a new folder
  useEffect(() => {
    if (open) {
      setSelectedFolderId(currentFolderId);
    }
  }, [open, currentFolderId]);

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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
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

  const addFilesToQueue = useCallback((files: File[]) => {
    const validFiles: QueuedFile[] = [];
    let oversizedCount = 0;

    files.forEach((file) => {
      if (file.size > maxFileSizeBytes) {
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
      toast.error(
        `${oversizedCount} file(s) exceeded the ${maxFileSizeMb}MB limit and were skipped.`,
      );
    }

    setQueue((prev) => [...prev, ...validFiles]);
  }, [maxFileSizeBytes, maxFileSizeMb]);

  // Global window drag and drop listener
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        dragCounter.current++;
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        dragCounter.current--;
        if (dragCounter.current === 0) {
          setIsWindowDragging(false);
        }
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsWindowDragging(false);
      dragCounter.current = 0;

      if (
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        onOpenChange(true);
        addFilesToQueue(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [onOpenChange, addFilesToQueue]);

  const removeFileFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const startUploading = async (items: QueuedFile[]) => {
    setIsUploading(true);
    let allSuccessful = true;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === "success") continue;

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q)),
      );

      try {
        const tags = items.length === 1 && tagsInput.trim()
          ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined;

        await uploadMutation.mutateAsync({
          file: item.file,
          folderId: selectedFolderId,
          tags,
          conflictAction: item.conflictAction,
        });

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "success" } : q)),
        );
      } catch (err: any) {
        allSuccessful = false;
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error", error: err.message || "Failed" }
              : q,
          ),
        );
      }
    }

    setIsUploading(false);

    if (allSuccessful) {
      toast.success("Batch upload complete!");
      setTimeout(() => {
        handleOpenChange(false);
      }, 800);
    } else {
      toast.error("Some uploads failed. Please review the errors.");
    }
  };

  const handleUploadAll = async () => {
    if (queue.length === 0) return;

    // Check conflicts for pending items that don't yet have an explicit conflict action
    const pendingItems = queue.filter(
      (q) => (q.status === "idle" || q.status === "error") && !q.conflictAction,
    );

    if (pendingItems.length > 0) {
      try {
        const conflicts = await checkFileConflicts(
          pendingItems.map((q) => q.file.name),
          selectedFolderId,
        );

        if (conflicts && conflicts.length > 0) {
          const conflictItems: ConflictItem[] = conflicts
            .map((c) => {
              const matched = pendingItems.find((p) => p.file.name === c.filename);
              return {
                queueId: matched?.id || "",
                filename: c.filename,
                newFileSize: matched?.file.size || 0,
                existingFile: c.existing_file,
              };
            })
            .filter((c) => Boolean(c.queueId));

          if (conflictItems.length > 0) {
            setConflictList(conflictItems);
            setShowConflictDialog(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed conflict preflight check:", err);
      }
    }

    startUploading(queue);
  };

  const resolveConflict = (
    action: "replace" | "keep_both" | "skip",
    shouldApplyAll: boolean,
  ) => {
    if (conflictList.length === 0) return;
    const current = conflictList[0];

    let updatedQueue = [...queue];

    if (action === "skip") {
      if (shouldApplyAll) {
        const conflictIds = new Set(conflictList.map((c) => c.queueId));
        updatedQueue = updatedQueue.filter((q) => !conflictIds.has(q.id));
        setQueue(updatedQueue);
        setConflictList([]);
        setShowConflictDialog(false);
        if (updatedQueue.length > 0) {
          startUploading(updatedQueue);
        }
        return;
      } else {
        updatedQueue = updatedQueue.filter((q) => q.id !== current.queueId);
        setQueue(updatedQueue);
      }
    } else {
      if (shouldApplyAll) {
        const conflictIds = new Set(conflictList.map((c) => c.queueId));
        updatedQueue = updatedQueue.map((q) =>
          conflictIds.has(q.id) ? { ...q, conflictAction: action } : q,
        );
        setQueue(updatedQueue);
      } else {
        updatedQueue = updatedQueue.map((q) =>
          q.id === current.queueId ? { ...q, conflictAction: action } : q,
        );
        setQueue(updatedQueue);
      }
    }

    if (shouldApplyAll || conflictList.length <= 1) {
      setConflictList([]);
      setShowConflictDialog(false);
      startUploading(updatedQueue);
    } else {
      setConflictList((prev) => prev.slice(1));
    }
  };

  const resetState = () => {
    setSelectedFolderId(null);
    setIsCreatingFolder(false);
    setNewFolderName("");
    setTagsInput("");
    setQueue([]);
    setIsUploading(false);
  };

    const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isUploading) {
        toast("Upload will continue in the background. You can track progress on the Transfers page.", {
          icon: "ℹ️",
        });
      } else {
        resetState();
      }
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
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
            Select destination folder and queue files to upload. Max {maxFileSizeMb}MB per
            file.
          </p>

          {/* Scrollable container for Content */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            {/* Destination Folder Selection */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-muted">
                Destination Folder
              </span>
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
                          : "text-ink-muted hover:bg-bg-overlay hover:text-ink border border-transparent",
                      )}
                      onClick={handleSelectRoot}
                    >
                      <span className="w-3.5 flex-shrink-0" />
                      {isRootSelected ? (
                        <FolderOpen className="h-4 w-4 flex-shrink-0 text-accent" />
                      ) : (
                        <Folder className="h-4 w-4 flex-shrink-0 text-ink-faint" />
                      )}
                      <span>Home (All Files)</span>
                      {isRootSelected && (
                        <Check className="ml-auto h-3.5 w-3.5 text-accent flex-shrink-0" />
                      )}
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
                <form
                  onSubmit={handleCreateFolder}
                  className="flex items-center gap-2 mt-1"
                >
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
                    disabled={
                      createFolderMutation.isPending || !newFolderName.trim()
                    }
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
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleFileSelectClick}
              className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-5 cursor-pointer transition-all",
                isDragging
                  ? "border-accent bg-accent/5"
                  : "border-border-strong bg-bg-raised hover:border-accent/40",
              )}
            >
              <Upload
                className={cn(
                  "h-8 w-8 text-ink-faint mb-2",
                  isDragging && "text-accent animate-bounce",
                )}
              />
              <span className="text-xs font-semibold text-ink">
                Drag & drop files here, or{" "}
                <span className="text-accent hover:underline">browse</span>
              </span>
              <span className="text-[10px] text-ink-faint mt-1">
                Supports any file type up to {maxFileSizeMb}MB
              </span>
            </div>

            {/* File Queue List */}
            {queue.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-muted">
                  Queue ({queue.length} files)
                </span>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-border rounded-md p-1 bg-bg-surface">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-1.5 rounded-sm bg-bg-raised/50 border border-border/50 text-[12px]"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileIcon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            item.status === "error" && "text-danger",
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className="font-semibold text-ink truncate"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-ink-faint font-mono">
                            <span>{formatBytes(item.file.size)}</span>
                            {item.conflictAction === "replace" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Replace
                              </span>
                            )}
                            {item.conflictAction === "keep_both" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Keep Both
                              </span>
                            )}
                            {item.status === "error" && item.error && (
                              <span
                                className="text-[10px] text-danger font-medium truncate max-w-[220px]"
                                title={item.error}
                              >
                                • {item.error}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === "uploading" && (
                          <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                        )}
                        {item.status === "success" && (
                          <div className="flex items-center gap-1.5">
                            <FileCheck className="h-3.5 w-3.5 text-success" />
                            {!isUploading && (
                              <button
                                type="button"
                                onClick={() => removeFileFromQueue(item.id)}
                                className="text-ink-faint hover:text-danger p-0.5 rounded transition-colors ml-1"
                                aria-label="Remove completed file"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                        {item.status === "error" && (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="flex items-center gap-1 text-danger font-semibold"
                              title={item.error}
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span className="text-[10px]">Failed</span>
                            </div>
                            {!isUploading && (
                              <button
                                type="button"
                                onClick={() => removeFileFromQueue(item.id)}
                                className="text-ink-faint hover:text-danger p-0.5 rounded transition-colors"
                                aria-label="Remove failed file"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                        {item.status === "idle" && (
                          <button
                            type="button"
                            onClick={() => removeFileFromQueue(item.id)}
                            disabled={isUploading}
                            className="text-ink-faint hover:text-danger p-0.5 rounded transition-colors"
                            aria-label="Remove queued file"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single File Tags Input (Optional) */}
            {queue.length === 1 && (
              <div className="flex flex-col gap-1.5 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-muted flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-accent" />
                    Tags & Labels{" "}
                    <span className="text-[10px] text-ink-faint font-normal">
                      (optional, comma-separated)
                    </span>
                  </span>
                </div>
                <Input
                  placeholder="e.g. invoice, 2026, banana, travel"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  disabled={isUploading}
                  className="h-8 text-xs bg-bg-raised"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleUploadAll}
              disabled={
                isUploading ||
                queue.length === 0 ||
                queue.every((item) => item.status === "success")
              }
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

      {/* Duplicate File Conflict Resolution Dialog */}
      {showConflictDialog && conflictList.length > 0 && (
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent className="max-w-md border-border-strong bg-bg-surface p-6 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-ink">
                    File Already Exists
                  </DialogTitle>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {conflictList.length > 1
                      ? `${conflictList.length} files already exist in this destination`
                      : "A file with this name already exists in this folder"}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <div className="rounded-xl border border-border bg-bg-raised/70 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono font-medium text-ink">
                  <span className="truncate max-w-[220px]" title={conflictList[0].filename}>
                    {conflictList[0].filename}
                  </span>
                  <span className="text-ink-muted">{formatBytes(conflictList[0].newFileSize)}</span>
                </div>
                {conflictList[0].existingFile && (
                  <p className="text-[11px] text-ink-faint">
                    Existing file was modified on{" "}
                    {new Date(
                      conflictList[0].existingFile.updated_at ||
                        conflictList[0].existingFile.created_at,
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              {conflictList.length > 1 && (
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ink select-none pt-1">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border-strong text-accent focus:ring-0"
                  />
                  <span>Apply to all remaining conflicts ({conflictList.length})</span>
                </label>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs h-9 border-border hover:bg-bg-raised"
                  onClick={() => resolveConflict("replace", applyToAll)}
                >
                  Replace File
                </Button>
                <Button
                  type="button"
                  className="w-full text-xs h-9 bg-accent hover:bg-accent/90 text-bg"
                  onClick={() => resolveConflict("keep_both", applyToAll)}
                >
                  Keep Both (Rename)
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs h-8 text-ink-muted hover:text-ink"
                onClick={() => resolveConflict("skip", applyToAll)}
              >
                Skip This File
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isWindowDragging && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-surface/85 backdrop-blur-md border-4 border-dashed border-accent m-4 rounded-xl transition-all duration-300 animate-in fade-in pointer-events-none">
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-6 text-accent animate-bounce">
              <Upload className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-ink mb-2">
              Drop files to upload to PushPostVault
            </h2>
            <p className="text-sm text-ink-muted">
              You can drop your files anywhere on the screen. Supports files up
              to {maxFileSizeMb}MB.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
