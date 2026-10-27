import { create } from "zustand";
import { TransferSession, TransferStatus } from "@/types";

export type TransferTab = "all" | TransferStatus;

interface TransferState {
  activeTab: TransferTab;
  directionFilter: "all" | "upload" | "download";
  currentUserId: string | null;
  setActiveTab: (tab: TransferTab) => void;
  setDirectionFilter: (direction: "all" | "upload" | "download") => void;
  
  // Persisted transfers state
  transfers: TransferSession[];
  initUserTransfers: (userId: string | null) => void;
  loadFromLocalStorage: () => void;
  clearTransfers: () => void;
  addTransfer: (tx: TransferSession) => void;
  updateTransfer: (id: string, updates: Partial<TransferSession>) => void;
  removeTransfer: (id: string) => void;
}

function getStorageKey(userId: string | null): string {
  return userId ? `ByteVault-transfers-${userId}` : "ByteVault-transfers-guest";
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

