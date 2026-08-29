import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useFilesStore } from "@/store/files.store";
import { FileRecord, FolderRecord, QuotaStats, TransferSession, FileKind } from "@/types";
import { useTransferStore } from "@/store/transfer.store";
import { getAccessToken } from "@/lib/api-client";

const MAX_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

// Map to hold references to active upload objects
interface ActiveUpload {
  file: File;
  abortController: AbortController;
  folderId?: string | null;
}

export const activeUploadsRegistry = new Map<string, ActiveUpload>();

export function pauseUpload(txId: string) {
  const active = activeUploadsRegistry.get(txId);
  if (active) {
    active.abortController.abort();
  }
  useTransferStore.getState().updateTransfer(txId, { status: "paused" });
}

export async function resumeUpload(txId: string, file?: File) {
  const store = useTransferStore.getState();
  const tx = store.transfers.find((t) => t.id === txId);
  if (!tx || tx.status !== "paused") return;

  let fileObj = activeUploadsRegistry.get(txId)?.file || file;
  if (!fileObj) {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e: any) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile && selectedFile.name === tx.fileName && selectedFile.size === tx.sizeBytes) {
        resumeUpload(txId, selectedFile);
      } else {
        alert("Please select the correct file to resume the upload session.");
      }
    };
    input.click();
    return;
  }

  const abortController = new AbortController();
  activeUploadsRegistry.set(txId, { file: fileObj, abortController, folderId: tx.folderId });

  store.updateTransfer(txId, { status: "active" });

  const appendLog = (msg: string, level: "info" | "warn" | "error" = "info") => {
    const latestTx = useTransferStore.getState().transfers.find((t) => t.id === txId);
    if (!latestTx) return;
    store.updateTransfer(txId, {
      logs: [
        ...latestTx.logs,
        {
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          level,
          message: msg,
        },
      ],
    });
  };

  appendLog("Resuming upload session.");

  if (tx.sizeBytes <= CHUNK_SIZE) {
    try {
      const session = await apiClient("/api/v1/files/upload-session", {
        method: "POST",
        body: JSON.stringify({
          filename: fileObj.name,
          file_size: fileObj.size,
          content_type: getResolvedMimeType(fileObj),
          folder_id: tx.folderId || undefined,
        }),
        signal: abortController.signal,
      });

      const { file_id, upload_url } = session;
      store.updateTransfer(txId, {
        fileId: file_id,
        chunks: [{ index: 0, status: "uploading", retries: 0 }],
      });

      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": getResolvedMimeType(fileObj),
        },
        body: fileObj,
        signal: abortController.signal,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      await apiClient(`/api/v1/files/${file_id}/complete`, {
        method: "POST",
        signal: abortController.signal,
      });

      store.updateTransfer(txId, {
        status: "completed",
        transferredBytes: fileObj.size,
        completedAt: new Date().toISOString(),
        chunks: [{ index: 0, status: "complete", retries: 0 }],
      });
      appendLog("Upload completed successfully.");
    } catch (err: any) {
      if (err.name === "AbortError") {
        appendLog("Upload paused.");
      } else {
        store.updateTransfer(txId, { status: "failed" });
        appendLog(`Upload failed: ${err.message}`, "error");
      }
    }
    return;
  }

  // --- MULTIPART RESUME FLOW ---
  try {
    const fileId = tx.fileId;
    const uploadId = tx.uploadId;
    const totalParts = tx.totalChunks;
    const etags = tx.etags || [];
    const partUrls = tx.partUrls || [];

    // Determine which parts still need uploading
    const pendingPartNumbers = partUrls
      .filter((_, idx) => !etags[idx])
      .map((p) => p.part_number);

    // Refresh presigned URLs for pending parts (old ones may have expired)
    let freshPartUrls = partUrls;
    if (pendingPartNumbers.length > 0) {
      try {
        appendLog("Refreshing expired presigned URLs for pending parts.");
        const refreshed = await apiClient(`/api/v1/files/${fileId}/refresh-part-urls`, {
          method: "POST",
          body: JSON.stringify({
            upload_id: uploadId,
            part_numbers: pendingPartNumbers,
          }),
          signal: abortController.signal,
        });
        // Merge fresh URLs into the existing partUrls array
        const refreshedMap = new Map<number, string>();
        for (const p of refreshed.part_urls) {
          refreshedMap.set(p.part_number, p.url);
        }
        freshPartUrls = partUrls.map((p) => ({
          part_number: p.part_number,
          url: refreshedMap.get(p.part_number) || p.url,
        }));
        // Update store with fresh URLs
        store.updateTransfer(txId, { partUrls: freshPartUrls });
      } catch (refreshErr: any) {
        if (refreshErr.name !== "AbortError") {
          store.updateTransfer(txId, { status: "failed" });
          appendLog(`Failed to refresh URLs: ${refreshErr.message}`, "error");
          activeUploadsRegistry.delete(txId);
        }
        return;
      }
    }

    if (!fileId || !uploadId) {
      throw new Error("Missing session identifiers to resume multipart upload.");
    }

    const speedHistory: { t: number; bytesPerSecond: number }[] = [];
    let currentTransferredBytes = 0;

    // Synchronize progress with already uploaded chunks
    const initialChunks = tx.chunks.map((chk, idx) => {
      if (etags[idx]) {
        currentTransferredBytes += (idx === totalParts - 1) ? (fileObj.size - idx * CHUNK_SIZE) : CHUNK_SIZE;
        return { index: idx, status: "complete" as const, retries: 0 };
      }
      return { index: idx, status: "pending" as const, retries: 0 };
    });

    store.updateTransfer(txId, { chunks: initialChunks, transferredBytes: currentTransferredBytes });

    const uploadPromises = freshPartUrls.map(async (part) => {
      const idx = part.part_number - 1;
      if (etags[idx]) {
        return { part_number: part.part_number, etag: etags[idx] };
      }

      const start = idx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileObj.size);
      const chunk = fileObj.slice(start, end);
      const chunkSize = end - start;

      const txLatest = useTransferStore.getState().transfers.find((t) => t.id === txId);
      if (txLatest) {
        const currentChunks = [...txLatest.chunks];
        currentChunks[idx] = { index: idx, status: "uploading", retries: 0 };
        store.updateTransfer(txId, { chunks: currentChunks });
      }

      const startTime = Date.now();
      const uploadResponse = await fetch(part.url, {
        method: "PUT",
        headers: {
          "Content-Type": fileObj.type || "application/octet-stream",
        },
        body: chunk,
        signal: abortController.signal,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload part ${part.part_number}`);
      }

      const etag = uploadResponse.headers.get("ETag")?.replace(/"/g, "") || "";
      if (!etag) {
        throw new Error(`Missing ETag for part ${part.part_number}`);
      }

      const durationSec = (Date.now() - startTime) / 1000 || 1;
      const speed = chunkSize / durationSec;

      currentTransferredBytes += chunkSize;
      const txUp = useTransferStore.getState().transfers.find((t) => t.id === txId);
      if (txUp) {
        const currentChunks = [...txUp.chunks];
        currentChunks[idx] = { index: idx, status: "complete", retries: 0 };
        
        const newEtags = [...(txUp.etags || [])];
        newEtags[idx] = etag;

        speedHistory.push({ t: speedHistory.length + 1, bytesPerSecond: speed });
        const avgSpeed = speedHistory.reduce((acc, curr) => acc + curr.bytesPerSecond, 0) / speedHistory.length;
        const remainingBytes = fileObj.size - currentTransferredBytes;
        const eta = avgSpeed > 0 ? Math.ceil(remainingBytes / avgSpeed) : null;

        store.updateTransfer(txId, {
          chunks: currentChunks,
          etags: newEtags,
          transferredBytes: Math.min(currentTransferredBytes, fileObj.size),
          speedBytesPerSecond: avgSpeed,
          etaSeconds: eta,
          logs: [
            ...txUp.logs,
            {
              id: Math.random().toString(),
              timestamp: new Date().toISOString(),
              level: "info",
              message: `Part #${part.part_number} uploaded successfully.`,
            },
          ],
        });
      }

      return {
        part_number: part.part_number,
        etag: etag,
      };
    });

    const completedParts = await Promise.all(uploadPromises);

    appendLog("Assembling parts and validating signature integrity.");
    await apiClient(`/api/v1/files/${fileId}/complete-multipart`, {
      method: "POST",
      body: JSON.stringify({
        upload_id: uploadId,
        parts: completedParts.sort((a, b) => a.part_number - b.part_number),
      }),
      signal: abortController.signal,
    });

    store.updateTransfer(txId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    appendLog("Multipart upload successfully completed.");
    activeUploadsRegistry.delete(txId);
  } catch (err: any) {
    if (err.name === "AbortError") {
      appendLog("Upload paused.");
    } else {
      store.updateTransfer(txId, { status: "failed" });
      appendLog(`Upload failed: ${err.message}`, "error");
      activeUploadsRegistry.delete(txId);
    }
  }
}

function determineFileKind(contentType: string): FileKind {
  const mime = contentType.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime.startsWith("text/") ||
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("typescript") ||
    mime.includes("html") ||
    mime.includes("css") ||
    mime.includes("xml") ||
    mime.includes("yaml") ||
    mime.includes("sql") ||
    mime.includes("python") ||
    mime.includes("shell") ||
    mime.includes("wasm") ||
    mime.includes("toml") ||
    mime.includes("graphql")
  ) {
    return "code";
  }
  if (
    mime.includes("pdf") ||
    mime.includes("msword") ||
    mime.includes("wordprocessing") ||
    mime.includes("officedocument") ||
    mime.includes("iwork") ||
    mime.includes("pages") ||
    mime.includes("numbers") ||
    mime.includes("keynote") ||
    mime.includes("epub") ||
    mime.includes("rtf")
  ) {
    return "document";
  }
  if (
    mime.includes("zip") ||
    mime.includes("x-tar") ||
    mime.includes("gzip") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    mime.includes("bzip2") ||
    mime.includes("apple-diskimage")
  ) {
    return "archive";
  }
  if (
    mime.includes("csv") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("parquet") ||
    mime.includes("sqlite") ||
    (mime.includes("octet-stream") && mime.endsWith("db"))
  ) {
    return "dataset";
  }
  return "other";
}

function getThumbnailColor(kind: FileKind): string {
  switch (kind) {
    case "image":
      return "#4CB782";
    case "video":
      return "#E5484D";
    case "audio":
      return "#F5A623";
    case "document":
      return "#5E6AD2";
    case "code":
      return "#5E9DD2";
    case "archive":
      return "#8A8F98";
    case "dataset":
      return "#10B981";
    default:
      return "#5C5F66";
  }
}

export function mapBackendFileToFrontend(f: any): FileRecord {
  const kind = determineFileKind(f.content_type || "");
  return {
    id: f.id,
    name: f.filename,
    kind,
    sizeBytes: parseInt(f.file_size || "0", 10),
    mimeType: f.content_type,
    providerId: (f.storage_provider as any) || "local",
    uploadedAt: f.created_at,
    updatedAt: f.updated_at,
    ownerName: "Me",
    ownerAvatar: "ME",
    checksum: f.storage_key || "",
    downloads: f.downloads || 0,
    shared: !!f.is_public,
    starred: false,
    tags: Array.isArray(f.tags) ? f.tags : [],
    path: f.storage_key,
    thumbnailColor: getThumbnailColor(kind),
    status: f.status || "READY",
    folderId: f.folder_id || undefined,
    thumbnailUrl: f.thumbnail_url || undefined,
  };
}

export function useFiles(params: {
  folderId?: string | null;
  search?: string;
  sortBy?: "name" | "size" | "date";
  sortDirection?: "asc" | "desc";
  cursor?: string;
  limit?: number;
  isPublic?: boolean;
}) {
  return useQuery<{ files: FileRecord[]; next_cursor?: string }>({
    queryKey: ["files", params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.folderId === null) {
        query.append("folder_id", "root");
      } else if (params.folderId !== undefined) {
        query.append("folder_id", params.folderId);
      }
      if (params.search) query.append("q", params.search);
      if (params.sortBy) query.append("sort_by", params.sortBy);
      if (params.sortDirection) query.append("sort_dir", params.sortDirection);
      if (params.cursor) query.append("cursor", params.cursor);
      if (params.limit) query.append("limit", String(params.limit));
      if (params.isPublic !== undefined) query.append("is_public", String(params.isPublic));

      const data = await apiClient(`/api/v1/files?${query.toString()}`);
      
      const filesList = Array.isArray(data.files)
        ? data.files.map(mapBackendFileToFrontend)
        : [];

      return {
        files: filesList,
        next_cursor: data.pagination?.next_cursor || undefined,
      };
    },
    refetchInterval: (query) => {
      const files = query.state.data?.files;
      const hasPending = files?.some((f: any) => f.status === "PENDING_SCAN");
      return hasPending ? 2000 : false;
    },
  });
}

export function useFile(id: string) {
  return useQuery<FileRecord>({
    queryKey: ["files", id],
    queryFn: async () => {
      const data = await apiClient(`/api/v1/files/${id}`);
      return mapBackendFileToFrontend(data.file);
    },
    enabled: !!id,
  });
}

export function useFileHistory(id: string) {
  return useQuery<any[]>({
    queryKey: ["files", id, "history"],
    queryFn: async () => {
      return [];
    },
    enabled: !!id,
  });
}

export function useFileImageBlob(fileId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["file-thumbnail-blob", fileId],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/files/${fileId}/thumbnail`, {
        headers: { Accept: "image/*" },
      });
      return res.url || `/api/v1/files/${fileId}/thumbnail`;
    },
    enabled: enabled && !!fileId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount) => failureCount < 3, // Retry up to 3 times while background worker generates thumbnail
    retryDelay: 2000,                          // Wait 2s between retries
  });
}

export function useFolders(parentId?: string | null) {
  return useQuery<FolderRecord[]>({
    queryKey: ["folders", parentId],
    queryFn: async () => {
      const query = parentId ? `?parent_id=${parentId}` : "";
      const data = await apiClient(`/api/v1/folders${query}`);
      if (Array.isArray(data.folders)) {
        return data.folders;
      }
      return [];
    },
  });
}

export function useFoldersFlat() {
  return useQuery<FolderRecord[]>({
    queryKey: ["folders", "flat"],
    queryFn: async () => {
      const data = await apiClient("/api/v1/folders?flat=true");
      if (Array.isArray(data.folders)) {
        return data.folders;
      }
      return [];
    },
  });
}

export function useQuota() {
  return useQuery<QuotaStats>({
    queryKey: ["quota"],
    queryFn: async () => {
      return apiClient("/api/v1/me/quota");
    },
  });
}

export function useCreateFolderMutation(currentParentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      parentId,
    }: {
      name: string;
      parentId?: string | null;
    }) => {
      return apiClient("/api/v1/folders", {
        method: "POST",
        body: JSON.stringify({ name, parent_id: parentId || undefined }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", currentParentId] });
      queryClient.invalidateQueries({ queryKey: ["folders", "flat"] });
    },
  });
}

export function useMoveFolderMutation(currentParentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      parentId,
    }: {
      id: string;
      parentId: string | null;
    }) => {
      return apiClient(`/api/v1/folders/${id}/move`, {
        method: "PUT",
        body: JSON.stringify({ parent_id: parentId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["folders", "flat"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useRenameFolderMutation(currentParentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return apiClient(`/api/v1/folders/${id}/rename`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", currentParentId] });
      queryClient.invalidateQueries({ queryKey: ["folders", "flat"] });
    },
  });
}

export function useDeleteFolderMutation(currentParentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/api/v1/folders/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", currentParentId] });
      queryClient.invalidateQueries({ queryKey: ["folders", "flat"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["quota"] });
    },
  });
}

export function useMoveFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      folderId,
    }: {
      id: string;
      folderId: string | null;
    }) => {
      return apiClient(`/api/v1/files/${id}/move`, {
        method: "PUT",
        body: JSON.stringify({ folder_id: folderId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useToggleShareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      return apiClient(`/api/v1/files/${id}/share`, {
        method: "PATCH",
        body: JSON.stringify({ is_public: isPublic }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useDeleteFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/api/v1/files/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["quota"] });
    },
  });
}

export function useRenameFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      return apiClient(`/api/v1/files/${id}/rename`, {
        method: "PUT",
        body: JSON.stringify({ filename }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

async function validateFileSignature(file: File) {
  const header = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, 512));
  });

  const getMime = (bytes: Uint8Array) => {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "application/zip";
    return "";
  };

  const detected = getMime(header);
  const declared = file.type;

  if (detected && declared && detected !== declared) {
    if (
      detected === "application/zip" &&
      (declared.includes("officedocument") ||
        declared.includes("wordprocessingml") ||
        declared.includes("spreadsheetml") ||
        declared.includes("presentationml") ||
        declared.includes("iwork") ||
        declared.includes("pages") ||
        declared.includes("numbers") ||
        declared.includes("keynote") ||
        declared.includes("epub") ||
        declared.includes("jar") ||
        declared.includes("apk"))
    ) {
      return;
    }
    // Only throw if binary header does not match expected image/pdf/zip format
    if (detected !== "application/zip") {
      throw new Error("Extension spoofing detected! Upload rejected.");
    }
  }
}

export function useUploadFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      folderId,
      tags,
    }: {
      file: File;
      folderId?: string | null;
      tags?: string[];
    }) => {
      // Dynamically fetch quota limits from query cache, fallback to default limit (100MB)
      const quota = queryClient.getQueryData<QuotaStats>(["quota"]);
      const maxFileSizeBytes = quota?.max_file_size_bytes || MAX_UPLOAD_LIMIT_BYTES;
      const maxFileSizeMb = Math.round(maxFileSizeBytes / (1024 * 1024));

      if (file.size > maxFileSizeBytes) {
        throw new Error(`File exceeds maximum allowed size of ${maxFileSizeMb}MB`);
      }

      // Block only dangerous executable payloads (allow shell scripts, dev configs, etc.)
      const unsupportedExtensions = /\.(exe|bat|cmd|com|msi|scr|pif|vbs|wsf)$/i;
      if (unsupportedExtensions.test(file.name)) {
        throw new Error("Unsupported file type. Windows/DOS executables are not allowed.");
      }

      await validateFileSignature(file);

      const txId = Math.random().toString(36).substring(7);
      const totalParts = file.size <= CHUNK_SIZE ? 1 : Math.ceil(file.size / CHUNK_SIZE);

      const newTx: TransferSession = {
        id: txId,
        fileName: file.name,
        fileId: "",
        direction: "upload",
        status: "active",
        providerId: "r2",
        sizeBytes: file.size,
        transferredBytes: 0,
        speedBytesPerSecond: 0,
        etaSeconds: null,
        retryCount: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        chunkSize: file.size <= CHUNK_SIZE ? file.size : CHUNK_SIZE,
        totalChunks: totalParts,
        chunks: file.size <= CHUNK_SIZE
          ? [{ index: 0, status: "pending", retries: 0 }]
          : Array.from({ length: totalParts }, (_, i) => ({ index: i, status: "pending", retries: 0 })),
        logs: [{ id: Math.random().toString(), timestamp: new Date().toISOString(), level: "info", message: "Upload session initialized." }],
        speedHistory: [],
        initiatedBy: "Me",
        etags: [],
        partUrls: [],
        folderId,
      };

      useTransferStore.getState().addTransfer(newTx);

      const abortController = new AbortController();
      activeUploadsRegistry.set(txId, { file, abortController, folderId });

      const appendLog = (msg: string, level: "info" | "warn" | "error" = "info") => {
        const tx = useTransferStore.getState().transfers.find((t) => t.id === txId);
        if (!tx) return;
        useTransferStore.getState().updateTransfer(txId, {
          logs: [...tx.logs, { id: Math.random().toString(), timestamp: new Date().toISOString(), level, message: msg }],
        });
      };

      if (file.size <= CHUNK_SIZE) {
        try {
          appendLog("Initiating single-part upload session.");
          const session = await apiClient("/api/v1/files/upload-session", {
            method: "POST",
            body: JSON.stringify({
              filename: file.name,
              file_size: file.size,
              content_type: file.type || "application/octet-stream",
              folder_id: folderId || undefined,
              tags: tags && tags.length > 0 ? tags : undefined,
            }),
            signal: abortController.signal,
          });

          const { file_id, upload_url } = session;
          useTransferStore.getState().updateTransfer(txId, {
            fileId: file_id,
            chunks: [{ index: 0, status: "uploading", retries: 0 }],
          });

          appendLog("Uploading file payload directly to storage provider.");
          const startTime = Date.now();
          const uploadResponse = await fetch(upload_url, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
            signal: abortController.signal,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Direct upload failed! Status: ${uploadResponse.status}`);
          }

          const durationSec = (Date.now() - startTime) / 1000 || 1;
          const speed = file.size / durationSec;
          useTransferStore.getState().updateTransfer(txId, {
            speedBytesPerSecond: speed,
            speedHistory: [{ t: 1, bytesPerSecond: speed }],
          });

          appendLog("Finalizing metadata handshake with backend.");
          await apiClient(`/api/v1/files/${file_id}/complete`, {
            method: "POST",
            signal: abortController.signal,
          });

          useTransferStore.getState().updateTransfer(txId, {
            status: "completed",
            transferredBytes: file.size,
            completedAt: new Date().toISOString(),
            chunks: [{ index: 0, status: "complete", retries: 0 }],
          });
          appendLog("Upload completed and verified successfully.");
          activeUploadsRegistry.delete(txId);
          return file_id;
        } catch (err: any) {
          if (err.name === "AbortError") {
            appendLog("Upload paused.");
          } else {
            useTransferStore.getState().updateTransfer(txId, { status: "failed" });
            appendLog(`Upload failed: ${err.message}`, "error");
            activeUploadsRegistry.delete(txId);
            throw err;
          }
        }
      } else {
        // --- MULTIPART UPLOAD ---
        let fileId = "";
        let uploadId = "";

        try {
          appendLog(`Initiating multipart upload session (${totalParts} parts).`);
          const session = await apiClient("/api/v1/files/multipart-session", {
            method: "POST",
            body: JSON.stringify({
              filename: file.name,
              file_size: file.size,
              content_type: file.type || "application/octet-stream",
              folder_id: folderId || undefined,
              part_count: totalParts,
            }),
            signal: abortController.signal,
          });

          const { file_id, upload_id, part_urls } = session;
          fileId = file_id;
          uploadId = upload_id;

          useTransferStore.getState().updateTransfer(txId, {
            fileId: file_id,
            uploadId: upload_id,
            partUrls: part_urls,
          });

          appendLog("Handshake complete. Dispatching parallel upload workers.");

          const speedHistory: { t: number; bytesPerSecond: number }[] = [];
          let currentTransferredBytes = 0;
          const etags: string[] = [];

          const uploadPromises = part_urls.map(
            async (part: { part_number: number; url: string }) => {
              const idx = part.part_number - 1;
              const start = idx * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, file.size);
              const chunk = file.slice(start, end);
              const chunkSize = end - start;

              const tx = useTransferStore.getState().transfers.find((t) => t.id === txId);
              if (tx) {
                const currentChunks = [...tx.chunks];
                currentChunks[idx] = { index: idx, status: "uploading", retries: 0 };
                useTransferStore.getState().updateTransfer(txId, { chunks: currentChunks });
              }

              const startTime = Date.now();
              const uploadResponse = await fetch(part.url, {
                method: "PUT",
                headers: {
                  "Content-Type": file.type || "application/octet-stream",
                },
                body: chunk,
                signal: abortController.signal,
              });

              if (!uploadResponse.ok) {
                throw new Error(`Failed to upload part ${part.part_number}: Status ${uploadResponse.status}`);
              }

              const etag = uploadResponse.headers.get("ETag")?.replace(/"/g, "") || "";
              if (!etag) {
                throw new Error(`Did not receive ETag header for part ${part.part_number}`);
              }

              const durationSec = (Date.now() - startTime) / 1000 || 1;
              const speed = chunkSize / durationSec;

              currentTransferredBytes += chunkSize;
              const txLatest = useTransferStore.getState().transfers.find((t) => t.id === txId);
              if (txLatest) {
                const currentChunks = [...txLatest.chunks];
                currentChunks[idx] = { index: idx, status: "complete", retries: 0 };
                
                etags[idx] = etag;

                const lastT = speedHistory.length > 0 ? speedHistory[speedHistory.length - 1].t : 0;
                speedHistory.push({ t: lastT + 1, bytesPerSecond: speed });

                const avgSpeed = speedHistory.reduce((acc, curr) => acc + curr.bytesPerSecond, 0) / speedHistory.length;
                const remainingBytes = file.size - currentTransferredBytes;
                const eta = avgSpeed > 0 ? Math.ceil(remainingBytes / avgSpeed) : null;

                useTransferStore.getState().updateTransfer(txId, {
                  chunks: currentChunks,
                  etags,
                  transferredBytes: Math.min(currentTransferredBytes, file.size),
                  speedBytesPerSecond: avgSpeed,
                  speedHistory: speedHistory.slice(-30),
                  etaSeconds: eta,
                  logs: [
                    ...txLatest.logs,
                    {
                      id: Math.random().toString(),
                      timestamp: new Date().toISOString(),
                      level: "info",
                      message: `Part #${part.part_number} uploaded successfully.`,
                    },
                  ],
                });
              }

              return {
                part_number: part.part_number,
                etag: etag,
              };
            },
          );

          const completedParts = await Promise.all(uploadPromises);

          appendLog("Assembling parts and validating signature integrity.");
          await apiClient(`/api/v1/files/${fileId}/complete-multipart`, {
            method: "POST",
            body: JSON.stringify({
              upload_id: uploadId,
              parts: completedParts.sort((a, b) => a.part_number - b.part_number),
            }),
            signal: abortController.signal,
          });

          useTransferStore.getState().updateTransfer(txId, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });
          appendLog("Multipart upload successfully completed.");
          activeUploadsRegistry.delete(txId);
          return fileId;
        } catch (uploadError: any) {
          if (uploadError.name === "AbortError") {
            appendLog("Upload paused.");
          } else {
            useTransferStore.getState().updateTransfer(txId, { status: "failed" });
            appendLog(`Upload failed: ${uploadError.message}`, "error");
            activeUploadsRegistry.delete(txId);

            if (fileId && uploadId) {
              await apiClient(`/api/v1/files/${fileId}/abort-multipart`, {
                method: "POST",
                body: JSON.stringify({ upload_id: uploadId }),
              }).catch((err) => console.error("Failed to abort multipart session:", err));
            }
            throw uploadError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["file-thumbnail-blob"] });
      queryClient.invalidateQueries({ queryKey: ["quota"] });
    },
  });
}

export function getResolvedMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    // Developer & Code
    case "json":
      return "application/json";
    case "yaml":
    case "yml":
      return "application/x-yaml";
    case "js":
    case "mjs":
    case "cjs":
      return "text/javascript";
    case "ts":
    case "tsx":
      return "text/typescript";
    case "jsx":
      return "text/javascript";
    case "py":
      return "text/x-python";
    case "go":
      return "text/x-go";
    case "rs":
      return "text/x-rust";
    case "java":
      return "text/x-java-source";
    case "c":
      return "text/x-c";
    case "cpp":
    case "cc":
    case "h":
    case "hpp":
      return "text/x-c++";
    case "sql":
      return "text/x-sql";
    case "html":
    case "htm":
      return "text/html";
    case "css":
      return "text/css";
    case "xml":
      return "text/xml";
    case "sh":
    case "bash":
    case "zsh":
      return "text/x-shellscript";
    case "md":
    case "markdown":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "toml":
      return "text/x-toml";
    case "graphql":
    case "gql":
      return "application/graphql";
    case "wasm":
      return "application/wasm";
    case "proto":
      return "application/x-protobuf";
    case "env":
      return "text/plain";

    // Apple & Media
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "avif":
      return "image/avif";
    case "mov":
      return "video/quicktime";
    case "m4a":
      return "audio/x-m4a";
    case "aiff":
    case "aif":
      return "audio/x-aiff";
    case "pages":
      return "application/x-iwork-pages-sffpages";
    case "numbers":
      return "application/x-iwork-numbers-sffnumbers";
    case "key":
      return "application/x-iwork-keynote-sffkey";
    case "dmg":
      return "application/x-apple-diskimage";
    case "plist":
      return "application/x-plist";

    // Documents & Common
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "parquet":
      return "application/vnd.apache.parquet";
    case "sqlite":
    case "sqlite3":
    case "db":
      return "application/x-sqlite3";
    default:
      return file.type || "application/octet-stream";
  }
}
