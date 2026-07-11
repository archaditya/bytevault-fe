import { create } from "zustand";
import { TransferSession, TransferStatus } from "@/types";

export type TransferTab = "all" | TransferStatus;

interface TransferState {
  activeTab: TransferTab;
  directionFilter: "all" | "upload" | "download";
  setActiveTab: (tab: TransferTab) => void;
  setDirectionFilter: (direction: "all" | "upload" | "download") => void;
  
  // Persisted transfers state
  transfers: TransferSession[];
  loadFromLocalStorage: () => void;
  addTransfer: (tx: TransferSession) => void;
  updateTransfer: (id: string, updates: Partial<TransferSession>) => void;
  removeTransfer: (id: string) => void;
}

export const useTransferStore = create<TransferState>((set) => {
  const save = (txs: TransferSession[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bytevault-transfers", JSON.stringify(txs));
      } catch (e) {
        console.error("Failed to save transfers to localStorage", e);
      }
    }
  };

  return {
    activeTab: "all",
    directionFilter: "all",
    setActiveTab: (tab) => set({ activeTab: tab }),
    setDirectionFilter: (direction) => set({ directionFilter: direction }),

    transfers: [],

    loadFromLocalStorage: () => {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("bytevault-transfers");
          if (saved) {
            set({ transfers: JSON.parse(saved) });
          }
        } catch (e) {
          console.error("Failed to load transfers from localStorage", e);
        }
      }
    },

    addTransfer: (tx) => set((s) => {
      const updated = [tx, ...s.transfers];
      save(updated);
      return { transfers: updated };
    }),

    updateTransfer: (id, updates) => set((s) => {
      const updated = s.transfers.map((t) => 
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      save(updated);
      return { transfers: updated };
    }),

    removeTransfer: (id) => set((s) => {
      const updated = s.transfers.filter((t) => t.id !== id);
      save(updated);
      return { transfers: updated };
    }),
  };
});
