import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { FileRecord, FileKind, FolderRecord } from "@/types";

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
    mime.includes("octet-stream") && mime.endsWith("db")
  ) {
    return "dataset";
  }
  return "other";
}

function getThumbnailColor(kind: FileKind): string {
  switch (kind) {
    case "image": return "#4CB782";
    case "video": return "#E5484D";
    case "audio": return "#F5A623";
    case "document": return "#5E6AD2";
    case "code": return "#5E9DD2";
    case "archive": return "#8A8F98";
    case "dataset": return "#10B981";
    default: return "#5C5F66";
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
    downloads: 0,
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
}) {
  return useQuery<FilesResponse>({
    queryKey: ["files", params],
    queryFn: async () => {
      const queryParts = [];
      if (params.folderId) queryParts.push(`folder_id=${params.folderId}`);
      if (params.search) queryParts.push(`q=${encodeURIComponent(params.search)}`);
      if (params.sortBy) {
        let sort = "date";
        if (params.sortBy === "name") sort = "name";
        else if (params.sortBy === "size") sort = "size";
        queryParts.push(`sort_by=${sort}`);
      }
      if (params.sortDirection) queryParts.push(`sort_dir=${params.sortDirection}`);
      if (params.cursor) queryParts.push(`cursor=${params.cursor}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);

      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
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
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
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
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
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
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
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

export function useUploadFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId?: string | null }) => {
      // 1. Client-Side Size and Whitelist Validations
      if (file.size > MAX_UPLOAD_LIMIT_BYTES) {
        throw new Error("File exceeds maximum allowed size of 100MB");
      }

      // 2. Create upload session
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

      // 3. Direct PUT upload
      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Direct upload to cloud storage failed! Status: ${uploadResponse.status}`);
      }

      // 4. Confirm completion
      await apiClient(`/api/v1/files/${file_id}/complete`, {
        method: "POST",
      });

      return file_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["quota"] });
    },
  });
}
