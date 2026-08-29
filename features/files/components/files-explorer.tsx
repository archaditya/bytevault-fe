"use client";

import { useMemo, useState, useEffect } from "react";
import { useFiles, useFolders, useDeleteFileMutation, useDeleteFolderMutation } from "@/services";
import { useFilesStore } from "@/store/files.store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FilesToolbar } from "./files-toolbar";
import { FolderCard } from "./folder-card";
import { FolderListRow } from "./folder-list-row";
import { FileCard } from "./file-card";
import { FileListRow } from "./file-list-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderSearch, Home, ChevronRight, ChevronLeft, Folder } from "lucide-react";
import { MoveItemModal } from "./move-item-modal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FilesExplorer() {
  const {
    viewMode,
    searchQuery,
    kindFilter,
    sortKey,
    sortDirection,
    currentFolderId,
    folderHistory,
    goToFolderIndex,
    resetFolder,
    selectedItems,
    clearSelection,
  } = useFilesStore();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadedFiles, setLoadedFiles] = useState<any[]>([]);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);

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

  const handleLoadMore = () => {
    if (filesData?.next_cursor) {
      setCursor(filesData.next_cursor);
    }
  };

  const handleBatchDelete = async () => {
    if (confirm(`Are you sure you want to delete the ${selectedItems.length} selected items?`)) {
      try {
        for (const item of selectedItems) {
          if (item.type === "file") {
            await deleteFileMutation.mutateAsync(item.id);
          } else {
            await deleteFolderMutation.mutateAsync(item.id);
          }
        }
        clearSelection();
      } catch (err) {
        console.error("Failed to delete selected items:", err);
      }
    }
  };

  // Perform client-side filter logic for kind selection
  const filteredFiles = useMemo(() => {
    return loadedFiles.filter((f) => {
      return kindFilter === "all" || f.kind === kindFilter;
    });
  }, [loadedFiles, kindFilter]);

  const showFoldersTree = searchQuery === "";
  const hasNoItems = filteredFiles.length === 0 && (!folders || folders.length === 0);
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
          {showFoldersTree && folders && folders.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2.5">
                Folders ({folders.length})
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {folders.map((folder) => (
                  <FolderCard key={folder.id} folder={folder} />
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {filteredFiles.length > 0 && (
            <div>
              {showFoldersTree && folders && folders.length > 0 && (
                <h3 className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2.5">
                  Files ({filteredFiles.length})
                </h3>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredFiles.map((file) => (
                  <FileCard key={file.id} file={file} />
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
                checked={selectedItems.length > 0 && selectedItems.length === (filteredFiles.length + (folders?.length || 0))}
                onChange={(e) => {
                  if (e.target.checked) {
                    const all: { id: string; type: "file" | "folder" }[] = [
                      ...(folders || []).map((f) => ({ id: f.id, type: "folder" as const })),
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
          {showFoldersTree && folders && folders.map((folder) => (
            <FolderListRow key={folder.id} folder={folder} />
          ))}

          {/* Files Rows */}
          {filteredFiles.map((file) => (
            <FileListRow key={file.id} file={file} />
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

      {/* Floating Selection Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-bg-surface border border-border-strong rounded-full shadow-lg px-5 py-3 animate-in fade-in slide-in-from-bottom-4 duration-200 text-sm text-ink select-none">
          <span className="font-semibold text-ink-muted">
            {selectedItems.length} items selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBatchMoveOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold hover:bg-bg-overlay"
          >
            Move
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleBatchDelete}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold"
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            className="h-8 px-3 rounded-full text-xs"
          >
            Cancel
          </Button>
        </div>
      )}

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
