"use client";

import { useMemo, useState, useEffect } from "react";
import { useFiles, useFolders } from "@/services";
import { useFilesStore } from "@/store";
import { FilesToolbar } from "./files-toolbar";
import { FolderCard } from "./folder-card";
import { FolderListRow } from "./folder-list-row";
import { FileCard } from "./file-card";
import { FileListRow } from "./file-list-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FolderSearch } from "lucide-react";

export function FilesExplorer() {
  const {
    viewMode,
    searchQuery,
    kindFilter,
    providerFilter,
    sortKey,
    sortDirection,
    currentFolderId,
    folderHistory,
    goToFolderIndex,
    resetFolder,
  } = useFilesStore();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadedFiles, setLoadedFiles] = useState<any[]>([]);

  // Reset pagination state when filters/folders change
  useEffect(() => {
    setCursor(undefined);
    setLoadedFiles([]);
  }, [currentFolderId, searchQuery, sortKey, sortDirection, kindFilter, providerFilter]);

  const { data: filesData, isLoading: filesLoading } = useFiles({
    folderId: currentFolderId,
    search: searchQuery,
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

  // Perform client-side filter logic for kind and provider selection
  const filteredFiles = useMemo(() => {
    return loadedFiles.filter((f) => {
      const matchesKind = kindFilter === "all" || f.kind === kindFilter;
      const matchesProvider = providerFilter === "all" || f.providerId === providerFilter;
      return matchesKind && matchesProvider;
    });
  }, [loadedFiles, kindFilter, providerFilter]);

  const showFoldersTree = searchQuery === "";
  const hasNoItems = filteredFiles.length === 0 && (!folders || folders.length === 0);
  const isLoading = filesLoading || foldersLoading;

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Breadcrumbs Nav */}
      <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <button onClick={resetFolder} className="hover:text-ink transition-colors font-medium">
          Root
        </button>
        {folderHistory.map((item, idx) => (
          <span key={item.id} className="flex items-center gap-1.5">
            <span>/</span>
            <button
              onClick={() => goToFolderIndex(idx)}
              className="hover:text-ink transition-colors font-medium last:text-ink last:pointer-events-none"
            >
              {item.name}
            </button>
          </span>
        ))}
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
          <div className="grid grid-cols-[1fr_110px_140px_110px_40px] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            <span>Name</span>
            <span>Size</span>
            <span>Provider</span>
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
    </div>
  );
}
