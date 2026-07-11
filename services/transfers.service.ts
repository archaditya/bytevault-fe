import { useQuery } from "@tanstack/react-query";
import { TransferSession, ChunkState, TransferLogEntry, SpeedSample } from "@/types";
import { useTransferStore } from "@/store";

let simulatedTransfers: TransferSession[] = [];
let isInitialized = false;

function initSimulation() {
  if (isInitialized) return;
  isInitialized = true;
  simulatedTransfers = [];
}

export function useTransfers() {
  initSimulation();
  const realTransfers = useTransferStore((s) => s.transfers);
  return useQuery<TransferSession[]>({
    queryKey: ["transfers", realTransfers],
    queryFn: async () => {
      const realIds = new Set(realTransfers.map((t) => t.id));
      const simulatedUniques = simulatedTransfers.filter((t) => !realIds.has(t.id));
      return [...realTransfers, ...simulatedUniques];
    },
    refetchInterval: 1000,
  });
}

export function useTransfer(id: string) {
  initSimulation();
  const realTransfers = useTransferStore((s) => s.transfers);
  return useQuery<TransferSession | null>({
    queryKey: ["transfers", id, realTransfers],
    queryFn: async () => {
      const realFound = realTransfers.find((t) => t.id === id);
      if (realFound) return { ...realFound };
      const simulatedFound = simulatedTransfers.find((t) => t.id === id);
      return simulatedFound ? { ...simulatedFound } : null;
    },
    refetchInterval: 1000,
    enabled: !!id,
  });
}

export function useTransferStats() {
  initSimulation();
  const realTransfers = useTransferStore((s) => s.transfers);
  return useQuery({
    queryKey: ["transfers", "stats", realTransfers],
    queryFn: async () => {
      const merged = [
        ...realTransfers,
        ...simulatedTransfers.filter((t) => !realTransfers.some((r) => r.id === t.id))
      ];
      const active = merged.filter((t) => t.status === "active").length;
      const completed = merged.filter((t) => t.status === "completed").length;
      const failed = merged.filter((t) => t.status === "failed").length;
      const queued = merged.filter((t) => t.status === "queued").length;
      const paused = merged.filter((t) => t.status === "paused").length;
      return { active, completed, failed, queued, paused };
    },
    refetchInterval: 1000,
  });
}

