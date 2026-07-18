import { create } from "zustand";
import { FileKind } from "@/types";

export type ViewMode = "grid" | "list";

export interface FolderHistoryItem {
  id: string;
  name: string;
}

export interface SelectedItem {
  id: string;
  type: "file" | "folder";
}

interface FilesState {
  viewMode: ViewMode;
  searchQuery: string;
  kindFilter: "all" | FileKind;
  sortKey: "name" | "size" | "date";
  sortDirection: "asc" | "desc";
  currentFolderId: string | null;
  folderHistory: FolderHistoryItem[];
  
  // Selection state
  selectedItems: SelectedItem[];
  toggleSelectItem: (id: string, type: "file" | "folder") => void;
  clearSelection: () => void;
  selectAllItems: (items: SelectedItem[]) => void;

  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setKindFilter: (kind: "all" | FileKind) => void;
  setSort: (key: "name" | "size" | "date", direction: "asc" | "desc") => void;
  pushFolder: (id: string, name: string) => void;
  popFolder: () => void;
  goToFolderIndex: (index: number) => void;
  resetFolder: () => void;
}

export const useFilesStore = create<FilesState>((set) => ({
  viewMode: "grid",
  searchQuery: "",
  kindFilter: "all",
  sortKey: "date",
  sortDirection: "desc",
  currentFolderId: null,
  folderHistory: [],
  selectedItems: [],

  toggleSelectItem: (id, type) =>
    set((state) => {
      const exists = state.selectedItems.some((item) => item.id === id);
      const updated = exists
        ? state.selectedItems.filter((item) => item.id !== id)
        : [...state.selectedItems, { id, type }];
      return { selectedItems: updated };
    }),

  clearSelection: () => set({ selectedItems: [] }),

  selectAllItems: (items) => set({ selectedItems: items }),

  setViewMode: (viewMode) => set({ viewMode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setKindFilter: (kindFilter) => set({ kindFilter }),
  setSort: (sortKey, sortDirection) => set({ sortKey, sortDirection }),
  pushFolder: (id, name) =>
    set((state) => ({
      currentFolderId: id,
      folderHistory: [...state.folderHistory, { id, name }],
      selectedItems: [], // clear selection on navigate
    })),
  popFolder: () =>
    set((state) => {
      if (state.folderHistory.length <= 1) {
        return { currentFolderId: null, folderHistory: [], selectedItems: [] };
      }
      const newHistory = state.folderHistory.slice(0, -1);
      return {
        currentFolderId: newHistory[newHistory.length - 1].id,
        folderHistory: newHistory,
        selectedItems: [],
      };
    }),
  goToFolderIndex: (index) =>
    set((state) => {
      const newHistory = state.folderHistory.slice(0, index + 1);
      return {
        currentFolderId: newHistory[newHistory.length - 1].id,
        folderHistory: newHistory,
        selectedItems: [],
      };
    }),
  resetFolder: () => set({ currentFolderId: null, folderHistory: [], selectedItems: [] }),
}));
