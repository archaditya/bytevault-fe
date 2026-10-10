"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
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
  Sparkles,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useFoldersFlat,
  useUploadFileMutation,
  useCreateFolderMutation,
  useQuota,
  checkFileConflicts,
  cancelUpload,
} from "@/services";
import { FolderRecord } from "@/types";
import { cn, formatBytes } from "@/lib/utils";
import { useFilesStore } from "@/store/files.store";
import { useTransferStore } from "@/store";
import toast from "react-hot-toast";

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

function FolderTreePickerItem({
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
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
          isSelected
            ? "bg-accent/15 text-accent-bright border border-accent/30 font-semibold"
            : "text-ink-muted hover:bg-bg-overlay hover:text-ink border border-transparent",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.folder.id)}
      >
        {hasChildren ? (
          <span
            className="flex-shrink-0 cursor-pointer p-0.5 hover:text-ink"
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
          <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
        ) : (
          <Folder className="h-3.5 w-3.5 flex-shrink-0 text-ink-faint" />
        )}
        <span className="truncate">{node.folder.name}</span>
        {isSelected && <Check className="ml-auto h-3 w-3 text-accent flex-shrink-0" />}
      </button>
      {expanded && hasChildren && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <FolderTreePickerItem
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

export function UploadStation() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFolderId = useFilesStore((s) => s.currentFolderId);
  const transfers = useTransferStore((s) => s.transfers);

  const { data: allFolders, isLoading: foldersLoading } = useFoldersFlat();
  const uploadMutation = useUploadFileMutation();
  const createFolderMutation = useCreateFolderMutation();
  const { data: quota } = useQuota();

  const maxFileSizeBytes = quota?.max_file_size_bytes || 100 * 1024 * 1024;
  const maxFileSizeMb = Math.round(maxFileSizeBytes / (1024 * 1024));

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const [tagsInput, setTagsInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [conflictList, setConflictList] = useState<ConflictItem[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  // Initialize selected folder from URL query or current active folder
  useEffect(() => {
    const urlFolderId = searchParams.get("folderId");
    if (urlFolderId) {
      setSelectedFolderId(urlFolderId);
    } else if (currentFolderId) {
      setSelectedFolderId(currentFolderId);
    }
  }, [searchParams, currentFolderId]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId || !allFolders) return null;
    return allFolders.find((f) => f.id === selectedFolderId) || null;
  }, [selectedFolderId, allFolders]);

  const folderTree = useMemo(() => {
    if (!allFolders) return [];
    return buildFolderTree(allFolders);
  }, [allFolders]);

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

  const addFilesToQueue = useCallback(
    (files: File[]) => {
      let oversizedCount = 0;
      let duplicateCount = 0;

      setQueue((prev) => {
        const existingKeys = new Set(prev.map((q) => `${q.file.name}_${q.file.size}`));
        const validFiles: QueuedFile[] = [];

        files.forEach((file) => {
          if (file.size > maxFileSizeBytes) {
            oversizedCount++;
            return;
          }
          const key = `${file.name}_${file.size}`;
          if (existingKeys.has(key)) {
            duplicateCount++;
            return;
          }
          existingKeys.add(key);
          validFiles.push({
            id: Math.random().toString(36).substring(7),
            file,
            status: "idle",
          });
        });

        return [...prev, ...validFiles];
      });

      if (oversizedCount > 0) {
        toast.error(`${oversizedCount} file(s) exceeded the ${maxFileSizeMb}MB limit and were skipped.`);
      }
      if (duplicateCount > 0) {
        toast.error(`${duplicateCount} duplicate file(s) already in queue were skipped.`);
      }
    },
    [maxFileSizeBytes, maxFileSizeMb]
  );

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

  const removeFileFromQueue = (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (item?.status === "uploading") {
      cancelUpload(id);
    }
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearFailedFromQueue = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "error"));
  };

  const clearAllQueue = () => {
    queue.forEach((q) => {
      if (q.status === "uploading") {
        cancelUpload(q.id);
      }
    });
    setQueue([]);
  };

  const startUploading = async (items: QueuedFile[]) => {
    setIsUploading(true);
    let allSuccessful = true;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === "success") continue;

      if (!queueRef.current.some((q) => q.id === item.id)) continue;

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q))
      );

      try {
        const tags =
          items.length === 1 && tagsInput.trim()
            ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
            : undefined;

        await uploadMutation.mutateAsync({
          file: item.file,
          folderId: selectedFolderId,
          tags,
          conflictAction: item.conflictAction,
          customTxId: item.id,
        });

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "success" } : q))
        );
      } catch (err: any) {
        if (err.name === "AbortError") {
          continue;
        }
        allSuccessful = false;
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", error: err.message || "Failed" } : q
          )
        );
      }
    }

    setIsUploading(false);

    if (allSuccessful) {
      toast.success("Batch upload complete!");
    } else {
      toast.error("Some uploads failed. Please review the errors.");
    }
  };

  const handleUploadAll = async () => {
    if (queue.length === 0) return;

    const pendingItems = queue.filter(
      (q) => (q.status === "idle" || q.status === "error") && !q.conflictAction
    );

    if (pendingItems.length > 0) {
      try {
        const conflicts = await checkFileConflicts(
          pendingItems.map((q) => q.file.name),
          selectedFolderId
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
    shouldApplyAll: boolean
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
          conflictIds.has(q.id) ? { ...q, conflictAction: action } : q
        );
        setQueue(updatedQueue);
      } else {
        updatedQueue = updatedQueue.map((q) =>
          q.id === current.queueId ? { ...q, conflictAction: action } : q
        );
        setQueue(updatedQueue);
      }
    }

    const remaining = conflictList.slice(1);
    if (shouldApplyAll || remaining.length === 0) {
      setConflictList([]);
      setShowConflictDialog(false);
      startUploading(updatedQueue);
    } else {
      setConflictList(remaining);
    }
  };

  return (
    <div className="w-full rounded-xl border border-border-strong bg-bg-surface p-5 shadow-sm space-y-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) addFilesToQueue(Array.from(e.target.files));
        }}
        className="hidden"
        multiple
      />

      {/* Header with Title and Target Folder Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent" />
            Upload Studio
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Full chunked upload pipeline with pause, resume, and real-time multipart progress (up to {maxFileSizeMb}MB per file).
          </p>
        </div>

        {/* Destination Target Folder Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-raised px-3 py-1.5 text-xs">
            <span className="text-ink-muted">Target:</span>
            <button
              type="button"
              onClick={() => setShowFolderPicker((prev) => !prev)}
              className="font-semibold text-accent-bright hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              {selectedFolder ? (
                <>
                  <Folder className="h-3.5 w-3.5 text-accent" />
                  <span className="truncate max-w-[160px]">{selectedFolder.name}</span>
                </>
              ) : (
                <>
                  <Home className="h-3.5 w-3.5 text-accent" />
                  <span>Home (Root)</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 text-ink-faint ml-0.5" />
            </button>
          </div>

          {selectedFolder && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-ink-muted hover:text-ink px-2"
              onClick={() => setSelectedFolderId(null)}
            >
              Reset to Home
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Folder Picker Tree */}
      {showFolderPicker && (
        <div className="rounded-lg border border-border bg-bg-raised/70 p-3 space-y-2 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">Choose Destination Folder</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[11px] text-ink-faint hover:text-ink"
              onClick={() => setShowFolderPicker(false)}
            >
              Close
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-bg-surface p-1.5">
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
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
                    selectedFolderId === null
                      ? "bg-accent/15 text-accent-bright border border-accent/30 font-semibold"
                      : "text-ink-muted hover:bg-bg-overlay hover:text-ink border border-transparent"
                  )}
                  onClick={() => {
                    setSelectedFolderId(null);
                    setShowFolderPicker(false);
                  }}
                >
                  <Home className="h-3.5 w-3.5 text-accent" />
                  <span>Home (All Files)</span>
                  {selectedFolderId === null && <Check className="ml-auto h-3 w-3 text-accent" />}
                </button>

                {folderTree.map((node) => (
                  <FolderTreePickerItem
                    key={node.folder.id}
                    node={node}
                    depth={1}
                    selectedId={selectedFolderId}
                    onSelect={(id) => {
                      setSelectedFolderId(id);
                      setShowFolderPicker(false);
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Quick Create Folder in Picker */}
          {isCreatingFolder ? (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-2 pt-1">
              <Input
                placeholder="New folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="h-7 text-xs bg-bg-surface"
              />
              <Button type="submit" size="sm" className="h-7 text-xs px-2.5">
                Create
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
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
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-bright transition-colors pt-1"
              onClick={() => setIsCreatingFolder(true)}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Create New Folder</span>
            </button>
          )}
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200 text-center",
          isDragging
            ? "border-accent bg-accent/10 shadow-inner scale-[0.99]"
            : "border-border-strong bg-bg-raised/50 hover:border-accent/50 hover:bg-bg-raised"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-3">
          <Upload className={cn("h-6 w-6 transition-transform", isDragging && "scale-110 animate-bounce")} />
        </div>
        <h3 className="text-sm font-semibold text-ink">
          Drag & drop files here, or <span className="text-accent underline">browse</span>
        </h3>
        <p className="text-xs text-ink-muted mt-1">
          Supports video, APK, documents, archives, and media up to {maxFileSizeMb}MB per file
        </p>
      </div>

      {/* Queue Station Table / List */}
      {queue.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">
                Queue ({queue.length} {queue.length === 1 ? "file" : "files"})
              </span>
              <span className="text-[11px] font-mono text-ink-muted">
                Total: {formatBytes(queue.reduce((acc, q) => acc + q.file.size, 0))}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {queue.some((item) => item.status === "error") && (
                <button
                  type="button"
                  onClick={clearFailedFromQueue}
                  className="text-xs font-semibold text-danger hover:underline cursor-pointer"
                >
                  Clear Failed
                </button>
              )}
              {!isUploading && (
                <button
                  type="button"
                  onClick={clearAllQueue}
                  className="text-xs text-ink-muted hover:text-ink hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto rounded-lg border border-border bg-bg-raised/40 p-2">
            {queue.map((item) => {
              const activeTx = transfers.find((t) => t.id === item.id);
              const transferred = activeTx?.transferredBytes || 0;
              const total = item.file.size || activeTx?.sizeBytes || 1;
              const percent = Math.min(100, Math.max(0, Math.round((transferred / total) * 100)));
              const speed = activeTx?.speedBytesPerSecond || 0;
              const totalChunks = activeTx?.totalChunks || 1;
              const completedChunks = activeTx?.chunks?.filter((c) => c.status === "complete").length || 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col p-3 rounded-lg border text-xs transition-colors shadow-sm",
                    item.status === "uploading"
                      ? "bg-bg-surface border-accent/40 ring-1 ring-accent/20"
                      : item.status === "error"
                      ? "bg-danger/5 border-danger/30"
                      : item.status === "success"
                      ? "bg-success/5 border-success/30"
                      : "bg-bg-surface border-border/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                          item.status === "uploading"
                            ? "bg-accent/15 text-accent"
                            : item.status === "error"
                            ? "bg-danger/15 text-danger"
                            : item.status === "success"
                            ? "bg-success/15 text-success"
                            : "bg-bg-overlay text-ink-muted"
                        )}
                      >
                        <FileIcon className="h-4 w-4" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-ink truncate text-xs" title={item.file.name}>
                          {item.file.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted font-mono mt-0.5">
                          <span>{formatBytes(item.file.size)}</span>
                          {item.conflictAction === "replace" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Replace
                            </span>
                          )}
                          {item.conflictAction === "keep_both" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Keep Both
                            </span>
                          )}
                          {item.status === "error" && item.error && (
                            <span className="text-danger font-medium truncate max-w-[280px]" title={item.error}>
                              • {item.error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.status === "uploading" && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent">{percent}%</span>
                          <Loader2 className="h-4 w-4 text-accent animate-spin" />
                        </div>
                      )}
                      {item.status === "success" && (
                        <div className="flex items-center gap-1.5 text-success font-semibold">
                          <FileCheck className="h-4 w-4" />
                          <span>Uploaded</span>
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="flex items-center gap-1.5 text-danger font-semibold">
                          <AlertCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </div>
                      )}

                      {/* Always clickable and active X button */}
                      <button
                        type="button"
                        onClick={() => removeFileFromQueue(item.id)}
                        className="p-1 rounded-md text-ink-faint hover:text-danger hover:bg-bg-overlay transition-colors"
                        title={item.status === "uploading" ? "Cancel upload" : "Remove file"}
                        aria-label="Remove file from queue"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Chunked Live Progress Bar for uploading item */}
                  {item.status === "uploading" && (
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                        <span className="truncate">
                          {formatBytes(transferred)} / {formatBytes(total)}
                          {totalChunks > 1 && ` · Part ${completedChunks + 1} of ${totalChunks}`}
                        </span>
                        <span className="shrink-0 text-accent font-semibold ml-2">
                          {speed > 0 ? `${formatBytes(speed)}/s` : `${percent}%`}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-overlay">
                        <div
                          className="h-full bg-brand-gradient transition-all duration-200"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {queue.length === 1 && (
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Tag className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                <Input
                  placeholder="Optional tags (e.g. video, backup, 2026)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  disabled={isUploading}
                  className="h-8 text-xs bg-bg-raised"
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                onClick={handleUploadAll}
                disabled={
                  isUploading ||
                  queue.length === 0 ||
                  queue.every((item) => item.status === "success")
                }
                className="gap-2 px-5 h-9 text-xs bg-accent hover:bg-accent-bright text-bg font-bold shadow-md"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? "Uploading Queue…" : `Start Upload (${queue.length} files)`}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  <DialogTitle className="text-base font-bold text-ink">File Already Exists</DialogTitle>
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
                    Existing file modified on{" "}
                    {new Date(
                      conflictList[0].existingFile.updated_at ||
                        conflictList[0].existingFile.created_at
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
    </div>
  );
}
