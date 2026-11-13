import { create } from "zustand";
import { TransferSession, TransferStatus, TransferLifecycleState } from "@/types";

export type TransferTab = "all" | TransferStatus;

/**
 * Normalizes any legacy lower-case transfer status into the unified lifecycle enum.
 */
export function normalizeTransferState(status: TransferStatus): TransferLifecycleState {
  switch (status) {
    case "active":
      return "UPLOADING";
    case "paused":
      return "PAUSED";
    case "completed":
      return "COMPLETED";
    case "failed":
      return "FAILED";
    case "queued":
      return "QUEUED";
    default:
      return (status as TransferLifecycleState) || "IDLE";
  }
}

interface TransferState {
  activeTab: TransferTab;
  directionFilter: "all" | "upload" | "download";
  currentUserId: string | null;
  setActiveTab: (tab: TransferTab) => void;
  setDirectionFilter: (direction: "all" | "upload" | "download") => void;
  
  // Staged files for seamless drag-and-drop redirection
  stagedFiles: File[];
  setStagedFiles: (files: File[]) => void;
  addStagedFiles: (files: File[]) => void;
  consumeStagedFiles: () => File[];

  // Persisted transfers state
  transfers: TransferSession[];
  initUserTransfers: (userId: string | null) => void;
  loadFromLocalStorage: () => void;
  clearTransfers: () => void;
  resetStore: () => void;
  addTransfer: (tx: TransferSession) => void;
  updateTransfer: (id: string, updates: Partial<TransferSession>) => void;
  removeTransfer: (id: string) => void;
}

function getStorageKey(userId: string | null): string {
  return userId ? `pushpostvault-transfers-${userId}` : "pushpostvault-transfers-guest";
}

function cleanLegacyTransfers() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("PushPort-transfers");
    } catch {
      // ignore
    }
  }
}

export const useTransferStore = create<TransferState>((set, get) => {
  const save = (txs: TransferSession[], userId: string | null) => {
    if (typeof window !== "undefined") {
      try {
        const key = getStorageKey(userId);
        localStorage.setItem(key, JSON.stringify(txs));
      } catch (e) {
        console.error("Failed to save transfers to localStorage", e);
      }
    }
  };

  return {
    activeTab: "all",
    directionFilter: "all",
    currentUserId: null,
    setActiveTab: (tab) => set({ activeTab: tab }),
    setDirectionFilter: (direction) => set({ directionFilter: direction }),

    transfers: [],
    stagedFiles: [],
    setStagedFiles: (files) => set({ stagedFiles: files }),
    addStagedFiles: (files) => set((s) => ({ stagedFiles: [...s.stagedFiles, ...files] })),
    consumeStagedFiles: () => {
      const files = get().stagedFiles;
      if (files.length > 0) {
        set({ stagedFiles: [] });
      }
      return files;
    },

    initUserTransfers: (userId: string | null) => {
      cleanLegacyTransfers();
      set({ currentUserId: userId });
      if (typeof window !== "undefined") {
        try {
          const key = getStorageKey(userId);
          const saved = localStorage.getItem(key);
          set({ transfers: saved ? JSON.parse(saved) : [] });
        } catch (e) {
          console.error("Failed to load user transfers from localStorage", e);
          set({ transfers: [] });
        }
      }
    },

    loadFromLocalStorage: () => {
      cleanLegacyTransfers();
      const userId = get().currentUserId;
      if (typeof window !== "undefined") {
        try {
          const key = getStorageKey(userId);
          const saved = localStorage.getItem(key);
          if (saved) {
            set({ transfers: JSON.parse(saved) });
          }
        } catch (e) {
          console.error("Failed to load transfers from localStorage", e);
        }
      }
    },

    clearTransfers: () => {
      const { currentUserId } = get();
      save([], currentUserId);
      set({ transfers: [] });
    },

    resetStore: () => {
      set({ transfers: [], currentUserId: null });
    },

    addTransfer: (tx) => set((s) => {
      const updated = [tx, ...s.transfers];
      save(updated, s.currentUserId);
      return { transfers: updated };
    }),

    updateTransfer: (id, updates) => set((s) => {
      const updated = s.transfers.map((t) => 
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      save(updated, s.currentUserId);
      return { transfers: updated };
    }),

    removeTransfer: (id) => set((s) => {
      const updated = s.transfers.filter((t) => t.id !== id);
      save(updated, s.currentUserId);
      return { transfers: updated };
    }),
  };
});

