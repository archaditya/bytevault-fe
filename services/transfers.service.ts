import { useQuery } from "@tanstack/react-query";
import { TransferSession, ChunkState, TransferLogEntry, SpeedSample } from "@/types";

let simulatedTransfers: TransferSession[] = [];
let isInitialized = false;

function initSimulation() {
  if (isInitialized) return;
  isInitialized = true;

  const tx1Size = 512 * 1024 * 1024; // 512 MB
  const tx1Chunks: ChunkState[] = Array.from({ length: 64 }, (_, i) => ({
    index: i,
    status: i < 24 ? "complete" : i === 24 ? "uploading" : "pending",
    retries: i === 12 ? 1 : 0,
  }));

  const tx1Logs: TransferLogEntry[] = [
    { id: "l-1", timestamp: new Date(Date.now() - 60000).toISOString(), level: "info", message: "Upload session initialized. Matching local file signature." },
    { id: "l-2", timestamp: new Date(Date.now() - 55000).toISOString(), level: "info", message: "Magic bytes match verified successfully. MIME type application/x-sql allowed." },
    { id: "l-3", timestamp: new Date(Date.now() - 50000).toISOString(), level: "info", message: "Split file into 64 chunks (8MB each). Parallel worker pool started." },
    { id: "l-4", timestamp: new Date(Date.now() - 40000).toISOString(), level: "info", message: "Chunk #0 to #10 uploaded and verified." },
    { id: "l-5", timestamp: new Date(Date.now() - 35000).toISOString(), level: "warn", message: "Chunk #12 timed out, scheduling retry." },
    { id: "l-6", timestamp: new Date(Date.now() - 30000).toISOString(), level: "info", message: "Chunk #12 uploaded successfully on retry." },
  ];

  const tx1SpeedHistory: SpeedSample[] = Array.from({ length: 15 }, (_, i) => ({
    t: i * 2,
    bytesPerSecond: (35 + Math.random() * 15) * 1024 * 1024,
  }));

  simulatedTransfers = [
    {
      id: "tx-1",
      fileName: "production_db_backup.sql",
      fileId: "f-db",
      direction: "upload",
      status: "active",
      providerId: "r2",
      sizeBytes: tx1Size,
      transferredBytes: tx1Size * (24 / 64),
      speedBytesPerSecond: 42 * 1024 * 1024,
      etaSeconds: 8,
      retryCount: 1,
      startedAt: new Date(Date.now() - 60000).toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      chunkSize: 8 * 1024 * 1024,
      totalChunks: 64,
      chunks: tx1Chunks,
      logs: tx1Logs,
      speedHistory: tx1SpeedHistory,
      initiatedBy: "Me",
    },
    {
      id: "tx-2",
      fileName: "holiday_video_2026.mp4",
      fileId: "f-vid",
      direction: "upload",
      status: "completed",
      providerId: "s3",
      sizeBytes: 185 * 1024 * 1024,
      transferredBytes: 185 * 1024 * 1024,
      speedBytesPerSecond: 0,
      etaSeconds: null,
      retryCount: 0,
      startedAt: new Date(Date.now() - 300000).toISOString(),
      updatedAt: new Date(Date.now() - 250000).toISOString(),
      completedAt: new Date(Date.now() - 250000).toISOString(),
      chunkSize: 8 * 1024 * 1024,
      totalChunks: 64,
      chunks: Array.from({ length: 64 }, (_, i) => ({ index: i, status: "complete", retries: 0 })),
      logs: [
        { id: "l-vid-1", timestamp: new Date(Date.now() - 300000).toISOString(), level: "info", message: "Upload session initialized." },
        { id: "l-vid-2", timestamp: new Date(Date.now() - 290000).toISOString(), level: "info", message: "Magic bytes match verified successfully. MIME type video/mp4 allowed." },
        { id: "l-vid-3", timestamp: new Date(Date.now() - 250000).toISOString(), level: "info", message: "All chunks transferred successfully. File upload completed." },
      ],
      speedHistory: [],
      initiatedBy: "Me",
    },
    {
      id: "tx-3",
      fileName: "malicious_patch.exe",
      fileId: "f-exe",
      direction: "upload",
      status: "failed",
      providerId: "local",
      sizeBytes: 14 * 1024 * 1024,
      transferredBytes: 0,
      speedBytesPerSecond: 0,
      etaSeconds: null,
      retryCount: 0,
      startedAt: new Date(Date.now() - 600000).toISOString(),
      updatedAt: new Date(Date.now() - 600000).toISOString(),
      completedAt: null,
      chunkSize: 8 * 1024 * 1024,
      totalChunks: 2,
      chunks: [
        { index: 0, status: "failed", retries: 0 },
        { index: 1, status: "pending", retries: 0 },
      ],
      logs: [
        { id: "l-exe-1", timestamp: new Date(Date.now() - 600000).toISOString(), level: "info", message: "Upload session initialized." },
        { id: "l-exe-2", timestamp: new Date(Date.now() - 600000).toISOString(), level: "error", message: "Security Violation: Executable binary files (.exe, .dll, ELF) are strictly prohibited." },
      ],
      speedHistory: [],
      initiatedBy: "Me",
    },
    {
      id: "tx-4",
      fileName: "archived_logs.zip",
      fileId: "f-zip",
      direction: "download",
      status: "queued",
      providerId: "r2",
      sizeBytes: 320 * 1024 * 1024,
      transferredBytes: 0,
      speedBytesPerSecond: 0,
      etaSeconds: null,
      retryCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      chunkSize: 8 * 1024 * 1024,
      totalChunks: 64,
      chunks: Array.from({ length: 64 }, (_, i) => ({ index: i, status: "pending", retries: 0 })),
      logs: [
        { id: "l-zip-1", timestamp: new Date().toISOString(), level: "info", message: "Download request queued. Waiting for active transfers to clear." },
      ],
      speedHistory: [],
      initiatedBy: "Me",
    },
  ];

  if (typeof window !== "undefined") {
    setInterval(() => {
      const activeTx = simulatedTransfers.find((t) => t.status === "active");
      if (activeTx) {
        const speed = (25 + Math.random() * 25) * 1024 * 1024;
        activeTx.speedBytesPerSecond = speed;
        activeTx.transferredBytes += speed;

        if (activeTx.transferredBytes >= activeTx.sizeBytes) {
          activeTx.transferredBytes = activeTx.sizeBytes;
          activeTx.status = "completed";
          activeTx.speedBytesPerSecond = 0;
          activeTx.etaSeconds = null;
          activeTx.completedAt = new Date().toISOString();
          activeTx.chunks = activeTx.chunks.map((c) => ({ ...c, status: "complete" }));
          activeTx.logs.push({
            id: `l-done-${Date.now()}`,
            timestamp: new Date().toISOString(),
            level: "info",
            message: `Transfer completed successfully. Saved to Object Storage.`,
          });

          const queuedTx = simulatedTransfers.find((t) => t.status === "queued");
          if (queuedTx) {
            queuedTx.status = "active";
            queuedTx.startedAt = new Date().toISOString();
            queuedTx.logs.push({
              id: `l-start-${Date.now()}`,
              timestamp: new Date().toISOString(),
              level: "info",
              message: "Download session active. Connecting to Object Storage.",
            });
          }
        } else {
          const progressPercent = activeTx.transferredBytes / activeTx.sizeBytes;
          const completedCount = Math.floor(progressPercent * activeTx.totalChunks);
          activeTx.chunks = activeTx.chunks.map((c, idx) => {
            if (idx < completedCount) {
              return { ...c, status: "complete" as const };
            } else if (idx === completedCount) {
              return { ...c, status: "uploading" as const };
            } else {
              return { ...c, status: "pending" as const };
            }
          });

          if (Math.random() < 0.15) {
            activeTx.logs.push({
              id: `l-prog-${Date.now()}`,
              timestamp: new Date().toISOString(),
              level: "info",
              message: `Chunk #${completedCount} processed successfully.`,
            });
          }

          const remainingBytes = activeTx.sizeBytes - activeTx.transferredBytes;
          activeTx.etaSeconds = Math.max(1, Math.ceil(remainingBytes / speed));

          const lastT = activeTx.speedHistory.length > 0 ? activeTx.speedHistory[activeTx.speedHistory.length - 1].t : 0;
          activeTx.speedHistory.push({
            t: lastT + 1,
            bytesPerSecond: speed,
          });
          if (activeTx.speedHistory.length > 30) {
            activeTx.speedHistory.shift();
          }
        }
        activeTx.updatedAt = new Date().toISOString();
      }
    }, 1000);
  }
}

export function useTransfers() {
  initSimulation();
  return useQuery<TransferSession[]>({
    queryKey: ["transfers"],
    queryFn: async () => [...simulatedTransfers],
    refetchInterval: 1000,
  });
}

export function useTransfer(id: string) {
  initSimulation();
  return useQuery<TransferSession | null>({
    queryKey: ["transfers", id],
    queryFn: async () => {
      const found = simulatedTransfers.find((t) => t.id === id);
      return found ? { ...found } : null;
    },
    refetchInterval: 1000,
    enabled: !!id,
  });
}

export function useTransferStats() {
  initSimulation();
  return useQuery({
    queryKey: ["transfers", "stats"],
    queryFn: async () => {
      const active = simulatedTransfers.filter((t) => t.status === "active").length;
      const completed = simulatedTransfers.filter((t) => t.status === "completed").length;
      const failed = simulatedTransfers.filter((t) => t.status === "failed").length;
      const queued = simulatedTransfers.filter((t) => t.status === "queued").length;
      const paused = simulatedTransfers.filter((t) => t.status === "paused").length;
      return { active, completed, failed, queued, paused };
    },
    refetchInterval: 1000,
  });
}
