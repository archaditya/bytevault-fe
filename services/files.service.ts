import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { FileRecord, FileKind, FolderRecord } from "@/types";

import { useTransferStore } from "@/store/transfer.store";
import { TransferSession } from "@/types";

// Maximum size constraints
const MAX_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024; // 100MB

export interface QuotaStats {
  used_bytes: number;
  total_bytes: number;
  remaining_bytes: number;
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
    mime.includes("xml")
  ) {
    return "code";
  }
  if (
    mime.includes("pdf") ||
    mime.includes("msword") ||
    mime.includes("wordprocessing") ||
    mime.includes("officedocument.word") ||
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
    mime.includes("7z")
  ) {
    return "archive";
  }
  if (
    mime.includes("csv") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("parquet") ||
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

// Client-side file signature (magic numbers) validator
async function validateFileSignature(file: File): Promise<void> {
  const chunk = file.slice(0, 262); // Read first 262 bytes for signatures
  const buffer = await chunk.arrayBuffer();
  const arr = new Uint8Array(buffer);
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // 1. Strict executable blocking (MZ, ELF, Mach-O headers)
  const isPE = arr[0] === 0x4d && arr[1] === 0x5a; // MZ header
  const isELF =
    arr[0] === 0x7f && arr[1] === 0x45 && arr[2] === 0x4c && arr[3] === 0x46; // ELF header
  const isMachO =
    (arr[0] === 0xcf &&
      arr[1] === 0xfa &&
      arr[2] === 0xed &&
      arr[3] === 0xfe) ||
    (arr[0] === 0xce && arr[1] === 0xfa && arr[2] === 0xed && arr[3] === 0xfe);

  if (isPE || isELF || isMachO) {
    throw new Error("Security Violation: Executable files are not allowed.");
  }

  // 2. Validate known headers if extension claims to be a specific type
  if (ext === "png") {
    const isPng =
      arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47;
    if (!isPng)
      throw new Error(
        "Security Violation: Spoofed file extension. Content is not a PNG image.",
      );
  }

  if (ext === "jpg" || ext === "jpeg") {
    const isJpeg = arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff;
    if (!isJpeg)
      throw new Error(
        "Security Violation: Spoofed file extension. Content is not a JPEG image.",
      );
  }

  if (ext === "pdf") {
    const isPdf =
      arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46; // %PDF
    if (!isPdf)
      throw new Error(
        "Security Violation: Spoofed file extension. Content is not a PDF document.",
      );
  }

  if (["zip", "docx", "xlsx", "pptx"].includes(ext)) {
    const isZip =
      arr[0] === 0x50 && arr[1] === 0x4b && arr[2] === 0x03 && arr[3] === 0x04; // PK..
    if (!isZip)
      throw new Error(
        "Security Violation: Spoofed file extension. Content is not a valid archive/document.",
      );
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
    tags: [],
    path: f.storage_key,
    thumbnailColor: getThumbnailColor(kind),
    status: f.status || "READY",
    folderId: f.folder_id || undefined,
  };
}

export interface FilesResponse {
  files: FileRecord[];
  next_cursor?: string;
}

export function useFiles(params: {
  folderId?: string | null;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  cursor?: string;
  limit?: number;
  isPublic?: boolean;
}) {
  return useQuery<FilesResponse>({
    queryKey: ["files", params],
    queryFn: async () => {
      const queryParts = [];
      if (params.folderId) queryParts.push(`folder_id=${params.folderId}`);
      if (params.search)
        queryParts.push(`q=${encodeURIComponent(params.search)}`);
      if (params.isPublic !== undefined)
        queryParts.push(`is_public=${params.isPublic}`);
      if (params.sortBy) {
        let sort = "date";
        if (params.sortBy === "name") sort = "name";
        else if (params.sortBy === "size") sort = "size";
        queryParts.push(`sort_by=${sort}`);
      }
      if (params.sortDirection)
        queryParts.push(`sort_dir=${params.sortDirection}`);
      if (params.cursor) queryParts.push(`cursor=${params.cursor}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);

      const queryString =
        queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
      const data = await apiClient(`/api/v1/files${queryString}`);

      const filesList = Array.isArray(data.files)
        ? data.files.map(mapBackendFileToFrontend)
        : [];

      return {
        files: filesList,
        next_cursor: data.pagination?.next_cursor || undefined,
      };
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
    onSuccess: (_, variables) => {
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

const CHUNK_SIZE = 5 * 1024 * 1024;

export function useUploadFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      folderId,
    }: {
      file: File;
      folderId?: string | null;
    }) => {
      if (file.size > MAX_UPLOAD_LIMIT_BYTES) {
        throw new Error("File exceeds maximum allowed size of 100MB");
      }

      const unsupportedExtensions = /\.(exe|bat|sh|dll|com|cmd)$/i;
      if (unsupportedExtensions.test(file.name)) {
        throw new Error("Unsupported file type. Executables are not allowed.");
      }

      await validateFileSignature(file);

      // Register transfer session in dynamic client state
      const txId = Math.random().toString(36).substring(7);
      const totalParts =
        file.size <= CHUNK_SIZE ? 1 : Math.ceil(file.size / CHUNK_SIZE);

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
        chunks:
          file.size <= CHUNK_SIZE
            ? [{ index: 0, status: "pending", retries: 0 }]
            : Array.from({ length: totalParts }, (_, i) => ({
                index: i,
                status: "pending",
                retries: 0,
              })),
        logs: [
          {
            id: Math.random().toString(),
            timestamp: new Date().toISOString(),
            level: "info",
            message: "Upload session initialized.",
          },
        ],
        speedHistory: [],
        initiatedBy: "Me",
      };

      useTransferStore.getState().addTransfer(newTx);

      const appendLog = (
        msg: string,
        level: "info" | "warn" | "error" = "info",
      ) => {
        const tx = useTransferStore
          .getState()
          .transfers.find((t) => t.id === txId);
        if (!tx) return;
        const logs = [
          ...tx.logs,
          {
            id: Math.random().toString(),
            timestamp: new Date().toISOString(),
            level,
            message: msg,
          },
        ];
        useTransferStore.getState().updateTransfer(txId, { logs });
      };

      if (file.size <= CHUNK_SIZE) {
        // --- SIMPLE UPLOAD FLOW ---
        try {
          appendLog("Initiating single-part upload session.");
          const session = await apiClient("/api/v1/files/upload-session", {
            method: "POST",
            body: JSON.stringify({
              filename: file.name,
              file_size: file.size,
              content_type: file.type || "application/octet-stream",
              folder_id: folderId || undefined,
            }),
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
          });

          if (!uploadResponse.ok) {
            throw new Error(
              `Direct upload failed! Status: ${uploadResponse.status}`,
            );
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
          });

          useTransferStore.getState().updateTransfer(txId, {
            status: "completed",
            transferredBytes: file.size,
            completedAt: new Date().toISOString(),
            chunks: [{ index: 0, status: "complete", retries: 0 }],
          });
          appendLog("Upload completed and verified successfully.");

          return file_id;
        } catch (err: any) {
          useTransferStore
            .getState()
            .updateTransfer(txId, { status: "failed" });
          appendLog(`Upload failed: ${err.message}`, "error");
          throw err;
        }
      } else {
        // --- MULTIPART UPLOAD FLOW ---
        let fileId = "";
        let uploadId = "";

        try {
          appendLog(
            `Initiating multipart upload session (${totalParts} parts).`,
          );
          const session = await apiClient("/api/v1/files/multipart-session", {
            method: "POST",
            body: JSON.stringify({
              filename: file.name,
              file_size: file.size,
              content_type: file.type || "application/octet-stream",
              folder_id: folderId || undefined,
              part_count: totalParts,
            }),
          });

          const { file_id, upload_id, part_urls } = session;
          fileId = file_id;
          uploadId = upload_id;

          useTransferStore.getState().updateTransfer(txId, { fileId: file_id });

          appendLog("Handshake complete. Dispatching parallel upload workers.");

          const speedHistory: { t: number; bytesPerSecond: number }[] = [];
          let currentTransferredBytes = 0;

          const uploadPromises = part_urls.map(
            async (part: { part_number: number; url: string }) => {
              const start = (part.part_number - 1) * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, file.size);
              const chunk = file.slice(start, end);
              const chunkSize = end - start;

              // Set chunk state to uploading
              const tx = useTransferStore
                .getState()
                .transfers.find((t) => t.id === txId);
              if (tx) {
                const currentChunks = [...tx.chunks];
                currentChunks[part.part_number - 1] = {
                  index: part.part_number - 1,
                  status: "uploading",
                  retries: 0,
                };
                useTransferStore
                  .getState()
                  .updateTransfer(txId, { chunks: currentChunks });
              }

              const startTime = Date.now();
              const uploadResponse = await fetch(part.url, {
                method: "PUT",
                headers: {
                  "Content-Type": file.type || "application/octet-stream",
                },
                body: chunk,
              });

              if (!uploadResponse.ok) {
                throw new Error(
                  `Failed to upload part ${part.part_number}: Status ${uploadResponse.status}`,
                );
              }

              const etag =
                uploadResponse.headers.get("ETag")?.replace(/"/g, "") || "";
              if (!etag) {
                throw new Error(
                  `Did not receive ETag header for part ${part.part_number}`,
                );
              }

              const durationSec = (Date.now() - startTime) / 1000 || 1;
              const speed = chunkSize / durationSec;

              // Update stats
              currentTransferredBytes += chunkSize;
              const txLatest = useTransferStore
                .getState()
                .transfers.find((t) => t.id === txId);
              if (txLatest) {
                const currentChunks = [...txLatest.chunks];
                currentChunks[part.part_number - 1] = {
                  index: part.part_number - 1,
                  status: "complete",
                  retries: 0,
                };

                const lastT =
                  speedHistory.length > 0
                    ? speedHistory[speedHistory.length - 1].t
                    : 0;
                speedHistory.push({ t: lastT + 1, bytesPerSecond: speed });

                const avgSpeed =
                  speedHistory.reduce(
                    (acc, curr) => acc + curr.bytesPerSecond,
                    0,
                  ) / speedHistory.length;
                const remainingBytes = file.size - currentTransferredBytes;
                const eta =
                  avgSpeed > 0 ? Math.ceil(remainingBytes / avgSpeed) : null;

                useTransferStore.getState().updateTransfer(txId, {
                  chunks: currentChunks,
                  transferredBytes: Math.min(
                    currentTransferredBytes,
                    file.size,
                  ),
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
              parts: completedParts.sort(
                (a, b) => a.part_number - b.part_number,
              ),
            }),
          });

          useTransferStore.getState().updateTransfer(txId, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });
          appendLog("Multipart upload successfully archived.");

          return fileId;
        } catch (uploadError: any) {
          useTransferStore
            .getState()
            .updateTransfer(txId, { status: "failed" });
          appendLog(`Upload failed: ${uploadError.message}`, "error");

          if (fileId && uploadId) {
            await apiClient(`/api/v1/files/${fileId}/abort-multipart`, {
              method: "POST",
              body: JSON.stringify({ upload_id: uploadId }),
            }).catch((err) =>
              console.error("Failed to abort multipart session:", err),
            );
          }

          throw uploadError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["quota"] });
    },
  });
}
