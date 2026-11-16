"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFiles, useFolders, useDeleteFileMutation, useDeleteFolderMutation } from "@/services";
import { useFilesStore, type SelectedItem } from "@/store/files.store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FilesToolbar } from "./files-toolbar";
import { FolderCard } from "./folder-card";
import { FolderListRow } from "./folder-list-row";
import { FileCard } from "./file-card";
import { FileListRow } from "./file-list-row";
import { QuickLookModal } from "./quick-look-modal";
import { BatchActionBar } from "./batch-action-bar";
import { FileContextMenu, type ContextMenuState } from "@/components/shared/file-context-menu";
import { FileRecord, FolderRecord } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderSearch, Home, ChevronRight, ChevronLeft, Folder } from "lucide-react";
import { MoveItemModal } from "./move-item-modal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function FilesExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderQuery = searchParams.get("folder");

  const {
    viewMode,
    searchQuery,
    kindFilter,
    sortKey,
    sortDirection,
    currentFolderId,
    folderHistory,
    pushFolder,
    popFolder,
    goToFolderIndex,
    resetFolder,
    selectedItems,
    clearSelection,
    selectAllItems,
    activeFilterTab,
    starredIds,
  } = useFilesStore();

  // Restore active folder from URL query parameter on initial mount/direct link
  useEffect(() => {
    if (folderQuery && folderQuery !== currentFolderId) {
      useFilesStore.setState({
        currentFolderId: folderQuery,
        folderHistory: folderHistory.length > 0 ? folderHistory : [{ id: folderQuery, name: "Folder" }],
      });
    }
  }, [folderQuery]);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadedFiles, setLoadedFiles] = useState<any[]>([]);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const confirm = useConfirm();

  const deleteFileMutation = useDeleteFileMutation();
  const deleteFolderMutation = useDeleteFolderMutation(currentFolderId);

  // Reset pagination state when filters/folders change
  useEffect(() => {
    setCursor(undefined);
    setLoadedFiles([]);
    clearSelection();
  }, [currentFolderId, searchQuery, sortKey, sortDirection, kindFilter]);

  // Debounce search query to avoid excessive API calls while user types.
  // Live searchQuery is used for UI reactivity (e.g. resetting pagination),
  // but the actual API call uses the debounced value.
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { data: filesData, isLoading: filesLoading } = useFiles({
    folderId: currentFolderId,
    search: debouncedSearch,
    sortBy: sortKey,
    sortDirection,
    cursor,
    limit: 20,
  });

  const { data: folders, isLoading: foldersLoading } = useFolders(currentFolderId);

  useEffect(() => {
    if (filesData?.files) {
      if (cursor === undefined) {
        setLoadedFiles(filesData.files);
      } else {
        setLoadedFiles((prev) => {
          const ids = new Set(prev.map((f) => f.id));
          const union = filesData.files.filter((f) => !ids.has(f.id));
          return [...prev, ...union];
        });
      }
    }
  }, [filesData, cursor]);

  // Perform client-side filter logic for kind and active quick tabs
  const filteredFiles = useMemo(() => {
    return loadedFiles.filter((f) => {
      const matchesKind = kindFilter === "all" || f.kind === kindFilter;
      if (!matchesKind) return false;

      if (activeFilterTab === "starred") {
        return Boolean(f.starred || starredIds.includes(f.id));
      }
      if (activeFilterTab === "shared") {
        return Boolean(f.shared);
      }
      if (activeFilterTab === "api") {
        return Boolean(f.path?.includes("API_Keys") || f.name?.toLowerCase().includes("api"));
      }
      if (activeFilterTab === "guest") {
        if (currentFolderId !== null) {
          return true;
        }
        const lower = (f.name || "").toLowerCase();
        const pathLower = (f.path || "").toLowerCase();
        return (
          lower.includes("guest") ||
          lower.includes("received") ||
          pathLower.includes("guest") ||
          pathLower.includes("received")
        );
      }
      return true;
    });
  }, [loadedFiles, kindFilter, activeFilterTab, starredIds, currentFolderId]);

  const filteredFolders = useMemo(() => {
    if (!folders) return [];
    return folders.filter((folder) => {
      if (activeFilterTab === "starred") {
        return starredIds.includes(folder.id);
      }
      if (activeFilterTab === "shared") {
        return Boolean(folder.is_public);
      }
      if (activeFilterTab === "api") {
        return folder.name.toLowerCase().includes("api");
      }
      if (activeFilterTab === "guest") {
        if (currentFolderId !== null) {
          return true;
        }
        const lower = (folder.name || "").toLowerCase();
        return lower.includes("guest") || lower.includes("received");
      }
      return true;
    });
  }, [folders, activeFilterTab, starredIds, currentFolderId]);

  // Google Drive / Windows Explorer-style keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === "Enter") {
        if (selectedItems.length === 1 && selectedItems[0].type === "folder") {
          const selectedFolder = folders?.find((f) => f.id === selectedItems[0].id);
          if (selectedFolder) {
            e.preventDefault();
            pushFolder(selectedFolder.id, selectedFolder.name);
          }
        }
      } else if (e.code === "Space") {
        const targetFile =
          selectedItems.length === 1 && selectedItems[0].type === "file"
            ? filteredFiles.find((f) => f.id === selectedItems[0].id)
            : filteredFiles[0];
        if (targetFile) {
          e.preventDefault();
          useFilesStore.getState().setQuickLookFile(targetFile);
        }
      } else if (e.key === "Backspace" || (e.altKey && e.key === "ArrowUp")) {
        if (folderHistory.length > 0) {
          e.preventDefault();
          popFolder();
        }
      } else if (e.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItems, folders, folderHistory, filteredFiles, pushFolder, popFolder, clearSelection]);

  const handleContextMenuShare = (item: FileRecord | FolderRecord, type: "file" | "folder") => {
    const shareUrl = `${window.location.origin}/s/${type}/${item.id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
      toast.success(`${type === "file" ? "File" : "Folder"} share link copied`);
    }
  };

  const handleContextMenuDelete = async (item: FileRecord | FolderRecord, type: "file" | "folder") => {
    const isFile = type === "file";
    const ok = await confirm({
      title: `Delete ${isFile ? "File" : "Folder"}`,
      description: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (ok) {
      if (isFile) {
        deleteFileMutation.mutate(item.id);
        setLoadedFiles((prev) => prev.filter((f) => f.id !== item.id));
      } else {
        deleteFolderMutation.mutate(item.id);
      }
    }
  };

  const handleLoadMore = () => {
    if (filesData?.next_cursor) {
      setCursor(filesData.next_cursor);
    }
  };

  const handleBatchDelete = async () => {
    const count = selectedItems.length;
    if (count === 0) return;
    const ok = await confirm({
      title: "Delete Selected Items",
      description: `Are you sure you want to delete the ${count} selected item${count > 1 ? "s" : ""}? This action cannot be undone.`,
      confirmLabel: "Delete All",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const results = await Promise.allSettled(
        selectedItems.map((item) =>
          item.type === "file"
            ? deleteFileMutation.mutateAsync(item.id)
            : deleteFolderMutation.mutateAsync(item.id)
        )
      );

      const succeededIds = new Set<string>();
      const failedItems: SelectedItem[] = [];

      results.forEach((res, index) => {
        const item = selectedItems[index];
        if (res.status === "fulfilled") {
          succeededIds.add(item.id);
        } else {
          failedItems.push(item);
        }
      });

      // Remove successfully deleted files from locally loaded list immediately
      if (succeededIds.size > 0) {
        setLoadedFiles((prev) => prev.filter((f) => !succeededIds.has(f.id)));
      }

      // Retain failed items in selection so the user can inspect or retry them
      if (failedItems.length > 0) {
        selectAllItems(failedItems);
      } else {
        clearSelection();
      }

      const succeeded = succeededIds.size;
      const failed = failedItems.length;

      if (failed === 0) {
        toast.success(`${succeeded} item${succeeded > 1 ? "s" : ""} deleted`);
      } else if (succeeded > 0) {
        toast.error(`${succeeded} item(s) deleted, but ${failed} failed to delete`);
      } else {
        toast.error("Failed to delete selected items");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete selected items");
    }
  };

  const handleBatchDownload = () => {
    const fileItems = selectedItems.filter((i) => i.type === "file");
    if (fileItems.length === 0) {
      toast("Select at least one file to download");
      return;
    }
    toast.success(`Starting download for ${fileItems.length} file(s)`);
    fileItems.forEach((item, idx) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = `/api/v1/files/${item.id}/download`;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 250);
    });
  };

  const handleBatchShare = () => {
    const fileIds = selectedItems.map((i) => i.id).join(",");
    const shareUrl = `${window.location.origin}/instant`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Instant share ready - link copied");
    }
  };

  const showFoldersTree = searchQuery === "";
  const hasNoItems = filteredFiles.length === 0 && filteredFolders.length === 0;
  const isLoading = filesLoading || foldersLoading;

  return (
    <div className="flex flex-col gap-3 relative">
      {/* Dynamic Breadcrumbs Nav Header */}
      <div className="flex items-center justify-between gap-2 py-0.5 px-0.5 text-[13px]">
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
          {/* Back 1 level button (Visible when inside a folder) */}
          {folderHistory.length > 0 && (
            <button
              onClick={() => {
                if (folderHistory.length > 1) {
                  goToFolderIndex(folderHistory.length - 2);
                } else {
                  resetFolder();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 mr-1 text-xs font-semibold text-ink-muted hover:text-ink bg-bg-raised hover:bg-bg-overlay border border-border rounded-lg transition-colors shrink-0 shadow-sm"
              title="Go up one level"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}

          {/* Home Button / Root */}
          <button
            onClick={resetFolder}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0",
              folderHistory.length === 0
                ? "bg-accent/15 text-accent-bright font-semibold border border-accent/30"
                : "text-ink-muted hover:text-ink hover:bg-bg-raised font-medium"
            )}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>

          {/* Subfolders Breadcrumbs */}
          {folderHistory.map((item, idx) => {
            const isLast = idx === folderHistory.length - 1;
            return (
              <div key={item.id} className="flex items-center gap-1.5 shrink-0">
                <ChevronRight className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                <button
                  onClick={() => goToFolderIndex(idx)}
                  disabled={isLast}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors truncate max-w-[150px] sm:max-w-[220px]",
                    isLast
                      ? "bg-accent/15 text-accent-bright font-semibold border border-accent/30 pointer-events-none"
                      : "text-ink-muted hover:text-ink hover:bg-bg-raised font-medium"
                  )}
                  title={item.name}
                >
                  <Folder className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  <span className="truncate">{item.name}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Quick file count */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-ink-faint font-mono shrink-0">
          <span>{filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}</span>
          {folders && folders.length > 0 && showFoldersTree && (
            <span>• {folders.length} {folders.length === 1 ? "folder" : "folders"}</span>
          )}
        </div>
      </div>

      <FilesToolbar />

      {isLoading && loadedFiles.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : hasNoItems ? (
        <EmptyState
          icon={FolderSearch}
          title="This folder is empty"
          description="Drag & drop some files or create a subfolder to get started."
        />
      ) : viewMode === "grid" ? (
        <div className="flex flex-col gap-6">
          {/* Folders Section */}
          {showFoldersTree && filteredFolders.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2.5">
                Folders ({filteredFolders.length})
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: folder, type: "folder" });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {filteredFiles.length > 0 && (
            <div>
              {showFoldersTree && filteredFolders.length > 0 && (
                <h3 className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2.5">
                  Files ({filteredFiles.length})
                </h3>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: "file" });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-bg-surface">
          <div className="grid grid-cols-[1fr_110px_110px_40px] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedItems.length > 0 && selectedItems.length === (filteredFiles.length + filteredFolders.length)}
                onChange={(e) => {
                  if (e.target.checked) {
                    const all: { id: string; type: "file" | "folder" }[] = [
                      ...filteredFolders.map((f) => ({ id: f.id, type: "folder" as const })),
                      ...filteredFiles.map((f) => ({ id: f.id, type: "file" as const })),
                    ];
                    useFilesStore.getState().selectAllItems(all);
                  } else {
                    clearSelection();
                  }
                }}
                className="h-4 w-4 rounded border-border bg-bg-raised text-accent focus:ring-accent cursor-pointer"
              />
              Name
            </span>
            <span>Size</span>
            <span>Uploaded</span>
            <span />
          </div>
          
          {/* Folders Rows */}
          {showFoldersTree && filteredFolders.map((folder) => (
            <FolderListRow
              key={folder.id}
              folder={folder}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, item: folder, type: "folder" });
              }}
            />
          ))}

          {/* Files Rows */}
          {filteredFiles.map((file) => (
            <FileListRow
              key={file.id}
              file={file}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, item: file, type: "file" });
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination Load More Button */}
      {filesData?.next_cursor && (
        <div className="flex justify-center py-4">
          <Button variant="secondary" size="sm" onClick={handleLoadMore}>
            Load More Files
          </Button>
        </div>
      )}

      {/* Floating Selection Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedItems.length}
        onDownloadZip={handleBatchDownload}
        onShare={handleBatchShare}
        onMove={() => setIsBatchMoveOpen(true)}
        onDelete={handleBatchDelete}
        onDeselect={clearSelection}
      />

      {/* Spacebar Quick Look Modal */}
      <QuickLookModal files={filteredFiles} />

      {/* Right-click Context Menu */}
      <FileContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onQuickLook={(file) => useFilesStore.getState().setQuickLookFile(file)}
        onOpenFolder={(folder) => pushFolder(folder.id, folder.name)}
        onDownload={(file) => window.open(`/api/v1/files/${file.id}/download`, "_blank")}
        onShare={handleContextMenuShare}
        onDetails={(file) => router.push(`/files/${file.id}`)}
        onDelete={handleContextMenuDelete}
      />

      {isBatchMoveOpen && (
        <MoveItemModal
          items={selectedItems}
          currentParentId={currentFolderId}
          onClose={() => {
            setIsBatchMoveOpen(false);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}
