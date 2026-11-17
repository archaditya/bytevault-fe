"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
  ExternalLink,
  Share2,
  Copy,
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
  cancelUpload,
  useToggleShareMutation,
  resolveFileForTransfer,
} from "@/services";
import { FolderRecord } from "@/types";
import { cn, formatBytes } from "@/lib/utils";
import { useFilesStore } from "@/store/files.store";
import { useTransferStore } from "@/store";
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
  const pathname = usePathname();
  const router = useRouter();
  const transfers = useTransferStore((s) => s.transfers);
  const currentFolderId = useFilesStore((s) => s.currentFolderId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: allFolders, isLoading: foldersLoading } = useFoldersFlat();
  const uploadMutation = useUploadFileMutation();
  const createFolderMutation = useCreateFolderMutation();
  const { data: quota } = useQuota();

  // Dynamically calculate limits based on user quota settings, default to 100MB
  const maxFileSizeBytes = quota?.max_file_size_bytes || 100 * 1024 * 1024;
  const maxFileSizeMb = Math.round(maxFileSizeBytes / (1024 * 1024));

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Files Queue State
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const [tagsInput, setTagsInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  const dragCounter = useRef(0);

  const [conflictList, setConflictList] = useState<ConflictItem[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [sharingQueueId, setSharingQueueId] = useState<string | null>(null);
  const [copiedQueueId, setCopiedQueueId] = useState<string | null>(null);
  const toggleShareMutation = useToggleShareMutation();

  const handleInstantShareItem = async (queueId: string, fileName: string) => {
    setSharingQueueId(queueId);
    try {
      const tx = useTransferStore.getState().transfers.find((t) => t.id === queueId || t.fileName === fileName);
      let targetFileId = tx?.fileId;
      if (!targetFileId && tx) {
        const resolved = await resolveFileForTransfer(tx);
        if (resolved) {
          targetFileId = resolved.id;
        }
      }
      if (!targetFileId) {
        toast.error("File is still finalizing. Please try in a moment.");
        return;
      }

      await toggleShareMutation.mutateAsync({ id: targetFileId, isPublic: true });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/s/${targetFileId}`;
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedQueueId(queueId);
      toast.success("Public share link copied to clipboard!");
      setTimeout(() => {
        setCopiedQueueId((curr) => (curr === queueId ? null : curr));
      }, 2500);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link");
    } finally {
      setSharingQueueId(null);
    }
  };

  const handleWhatsAppShareItem = async (queueId: string, fileName: string) => {
    try {
      const tx = useTransferStore.getState().transfers.find((t) => t.id === queueId || t.fileName === fileName);
      let targetFileId = tx?.fileId;
      if (!targetFileId && tx) {
        const resolved = await resolveFileForTransfer(tx);
        if (resolved) {
          targetFileId = resolved.id;
        }
      }
      if (!targetFileId) {
        toast.error("File is still finalizing. Please try in a moment.");
        return;
      }

      await toggleShareMutation.mutateAsync({ id: targetFileId, isPublic: true });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/s/${targetFileId}`;
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`Here is the file: ${url}`)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to share on WhatsApp");
    }
  };

  // Sync folder selection: only inherit currentFolderId if user is actively in /files
  useEffect(() => {
    if (open) {
      if (pathname === "/files" && currentFolderId) {
        setSelectedFolderId(currentFolderId);
      } else {
        setSelectedFolderId(null);
      }
    }
  }, [open, currentFolderId, pathname]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId || !allFolders) return null;
    return allFolders.find((f) => f.id === selectedFolderId) || null;
  }, [selectedFolderId, allFolders]);

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
      toast.error(
        `${oversizedCount} file(s) exceeded the ${maxFileSizeMb}MB limit and were skipped.`,
      );
    }
    if (duplicateCount > 0) {
      toast.error(
        `${duplicateCount} duplicate file(s) already in queue were skipped.`,
      );
    }
  }, [maxFileSizeBytes, maxFileSizeMb]);

  // Global window drag and drop listener has been moved to app layout for direct /transfers redirection

  const removeFileFromQueue = (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (item?.status === "uploading") {
      cancelUpload(id);
    }
    useTransferStore.getState().removeTransfer(id);
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearFailedFromQueue = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "error"));
  };

  const startUploading = async (items: QueuedFile[]) => {
    setIsUploading(true);
    // Dismiss the modal in-place and route to /transfers so user can monitor real-time progress
    onOpenChange(false);
    if (pathname !== "/transfers") {
      router.push("/transfers");
    }

    let allSuccessful = true;

    // Upfront registration of all batch files in useTransferStore
    items.forEach((item, index) => {
      if (item.status === "success") return;
      const existing = useTransferStore.getState().transfers.find((t) => t.id === item.id);
      if (!existing) {
        useTransferStore.getState().addTransfer({
          id: item.id,
          fileName: item.file.name,
          fileId: "",
          direction: "upload",
          status: index === 0 ? "active" : "queued",
          providerId: "r2",
          sizeBytes: item.file.size,
          transferredBytes: 0,
          speedBytesPerSecond: 0,
          etaSeconds: null,
          retryCount: 0,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          chunkSize: item.file.size,
          totalChunks: 1,
          chunks: [],
          logs: [
            {
              id: Math.random().toString(),
              timestamp: new Date().toISOString(),
              level: "info",
              message: index === 0 ? "Starting upload" : "Queued in batch upload",
            },
          ],
          speedHistory: [],
          initiatedBy: "Me",
          etags: [],
          partUrls: [],
          folderId: selectedFolderId,
        });
      }
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === "success") continue;

      // Skip if file was removed from queue while another file was uploading
      if (!queueRef.current.some((q) => q.id === item.id)) continue;

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
          customTxId: item.id,
        });

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "success" } : q)),
        );
      } catch (err: any) {
        if (err.name === "AbortError") {
          continue;
        }
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
      const targetFolder = selectedFolderId;
      toast.success(
        (t) => (
          <div className="flex items-center gap-2">
            <span>Batch upload complete!</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                router.push(targetFolder ? `/files?folder=${targetFolder}` : "/files");
              }}
              className="font-semibold underline text-accent ml-1 text-xs hover:text-accent-bright"
            >
              View in Files →
            </button>
          </div>
        ),
        { duration: 5000 }
      );
      resetState();
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
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <DialogTitle>Upload Files</DialogTitle>
            <Link
              href="/transfers"
              onClick={() => handleOpenChange(false)}
              className="text-[12px] font-medium text-accent hover:text-accent-bright hover:underline flex items-center gap-1 shrink-0 mr-4"
            >
              <span>Transfers</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
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

            {/* Explicit Upload Target Banner */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-raised border border-border text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-ink-muted shrink-0">Upload target:</span>
                <span className="font-semibold text-accent-bright flex items-center gap-1.5 truncate">
                  {selectedFolder ? (
                    <>
                      <Folder className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="truncate">{selectedFolder.name}</span>
                    </>
                  ) : (
                    <>
                      <Home className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Home (All Files)</span>
                    </>
                  )}
                </span>
              </div>
              {selectedFolder && (
                <button
                  type="button"
                  onClick={handleSelectRoot}
                  className="text-[11px] text-accent hover:text-accent-bright font-medium underline shrink-0 ml-2 cursor-pointer"
                >
                  Upload to Home instead
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-muted">
                    Queue ({queue.length} {queue.length === 1 ? "file" : "files"})
                  </span>
                  {queue.some((item) => item.status === "error") && (
                    <button
                      type="button"
                      onClick={clearFailedFromQueue}
                      className="text-[11px] font-medium text-danger hover:underline cursor-pointer"
                    >
                      Clear Failed
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto border border-border rounded-md p-1.5 bg-bg-surface">
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
                          "flex flex-col p-2 rounded-md border text-[12px] transition-colors",
                          item.status === "uploading"
                            ? "bg-bg-raised border-accent/40 shadow-sm"
                            : item.status === "error"
                            ? "bg-danger/5 border-danger/30"
                            : item.status === "success"
                            ? "bg-success/5 border-success/30"
                            : "bg-bg-raised/50 border-border/50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileIcon
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                item.status === "uploading" && "text-accent",
                                item.status === "error" && "text-danger",
                                item.status === "success" && "text-success",
                                item.status === "idle" && "text-ink-faint",
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
                                    className="text-[10px] text-danger font-medium truncate max-w-[200px]"
                                    title={item.error}
                                  >
                                    • {item.error}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            {item.status === "uploading" && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-semibold text-accent">
                                  {percent}%
                                </span>
                                <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                              </div>
                            )}
                            {item.status === "success" && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 text-success">
                                  <FileCheck className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-medium">Done</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleInstantShareItem(item.id, item.file.name)}
                                  disabled={sharingQueueId === item.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent-bright hover:bg-accent/25 transition-colors border border-accent/30 cursor-pointer"
                                  title="Make public & copy share link"
                                >
                                  {sharingQueueId === item.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-accent" />
                                  ) : copiedQueueId === item.id ? (
                                    <Check className="h-3 w-3 text-success" />
                                  ) : (
                                    <Share2 className="h-3 w-3 text-accent" />
                                  )}
                                  <span>{copiedQueueId === item.id ? "Copied" : "Share"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleWhatsAppShareItem(item.id, item.file.name)}
                                  className="p-1 rounded text-white bg-[#25D366] hover:bg-[#20ba59] transition-colors cursor-pointer"
                                  title="Share on WhatsApp"
                                  aria-label="Share on WhatsApp"
                                >
                                  <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                            {item.status === "error" && (
                              <div className="flex items-center gap-1 text-danger font-semibold">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="text-[10px]">Failed</span>
                              </div>
                            )}

                            {/* Always working X button to remove or abort item */}
                            <button
                              type="button"
                              onClick={() => removeFileFromQueue(item.id)}
                              className="text-ink-faint hover:text-danger hover:bg-bg-overlay p-1 rounded transition-colors ml-1"
                              title={item.status === "uploading" ? "Cancel upload" : "Remove file"}
                              aria-label="Remove file from queue"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Chunked Live Progress Bar for uploading item */}
                        {item.status === "uploading" && (
                          <div className="mt-2 space-y-1.5 pt-1.5 border-t border-border/40">
                            <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                              <span className="truncate">
                                {formatBytes(transferred)} / {formatBytes(total)}
                                {totalChunks > 1 && ` · Part ${completedChunks + 1} of ${totalChunks}`}
                              </span>
                              <span className="shrink-0 text-accent font-semibold ml-2">
                                {speed > 0 ? `${formatBytes(speed)}/s` : `${percent}%`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay">
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
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border mt-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                handleOpenChange(false);
                router.push("/transfers");
              }}
              className="text-xs text-ink-muted hover:text-ink gap-1.5 h-8 px-2"
            >
              <ExternalLink className="h-3.5 w-3.5 text-accent" />
              <span>Transfers Dashboard</span>
            </Button>
            <div className="flex items-center gap-2">
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
