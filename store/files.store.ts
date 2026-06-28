import { create } from "zustand";
import { FileKind } from "@/types";

export type FileViewMode = "grid" | "list";
export type FileSortKey = "name" | "size" | "uploadedAt" | "downloads";

interface FolderHistoryItem {
  id: string;
  name: string;
}

interface FilesState {
  viewMode: FileViewMode;
  searchQuery: string;
  sortKey: FileSortKey;
  sortDirection: "asc" | "desc";
  kindFilter: FileKind | "all";
  providerFilter: string | "all";
  currentFolderId: string | null;
  folderHistory: FolderHistoryItem[];
  setViewMode: (mode: FileViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSort: (key: FileSortKey) => void;
  setKindFilter: (kind: FileKind | "all") => void;
  setProviderFilter: (provider: string | "all") => void;
  pushFolder: (id: string, name: string) => void;
  popFolder: () => void;
  resetFolder: () => void;
  goToFolderIndex: (index: number) => void;
}

export const useFilesStore = create<FilesState>((set) => ({
  viewMode: "grid",
  searchQuery: "",
  sortKey: "uploadedAt",
  sortDirection: "desc",
  kindFilter: "all",
  providerFilter: "all",
  currentFolderId: null,
  folderHistory: [],
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSort: (key) =>
    set((state) => ({
      sortKey: key,
      sortDirection: state.sortKey === key && state.sortDirection === "desc" ? "asc" : "desc",
    })),
  setKindFilter: (kind) => set({ kindFilter: kind }),
  setProviderFilter: (provider) => set({ providerFilter: provider }),
  pushFolder: (id, name) =>
    set((state) => ({
      currentFolderId: id,
      folderHistory: [...state.folderHistory, { id, name }],
    })),
  popFolder: () =>
    set((state) => {
      const history = [...state.folderHistory];
      history.pop();
      const parent = history[history.length - 1];
      return {
        currentFolderId: parent ? parent.id : null,
        folderHistory: history,
      };
    }),
  resetFolder: () => set({ currentFolderId: null, folderHistory: [] }),
  goToFolderIndex: (index) =>
    set((state) => {
      if (index === -1) {
        return { currentFolderId: null, folderHistory: [] };
      }
      const history = state.folderHistory.slice(0, index + 1);
      const current = history[history.length - 1];
      return {
        currentFolderId: current.id,
        folderHistory: history,
      };
    }),
}));
