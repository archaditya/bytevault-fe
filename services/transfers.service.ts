import { useMemo } from "react";
import { TransferSession } from "@/types";
import { useTransferStore } from "@/store";

export function useTransfers() {
  const realTransfers = useTransferStore((s) => s.transfers);
  return {
    data: realTransfers,
    isLoading: false,
  };
}

export function useTransfer(id: string) {
  const realTransfers = useTransferStore((s) => s.transfers);
  const transfer = realTransfers.find((t) => t.id === id) || null;
  return {
    data: transfer,
    isLoading: false,
  };
}

export function useTransferStats() {
  const realTransfers = useTransferStore((s) => s.transfers);
  const stats = useMemo(() => {
    const active = realTransfers.filter((t) => t.status === "active").length;
    const completed = realTransfers.filter((t) => t.status === "completed").length;
    const failed = realTransfers.filter((t) => t.status === "failed").length;
    const queued = realTransfers.filter((t) => t.status === "queued").length;
    const paused = realTransfers.filter((t) => t.status === "paused").length;
    return { active, completed, failed, queued, paused };
  }, [realTransfers]);

  return {
    data: stats,
    isLoading: false,
  };
}

