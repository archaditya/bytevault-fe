import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─────────────────────────────────────────────────────────────
// Types (mirror backend/internal/model/upload_invite.go)
// ─────────────────────────────────────────────────────────────

export type InviteStatus = "active" | "revoked" | "expired";

export interface UploadInvite {
  id: string;
  token: string;
  label: string;
  max_total_bytes: number;
  max_files: number;
  used_bytes: number;
  used_files: number;
  has_passcode: boolean;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  target_folder_id?: string;
}

/** What a guest is allowed to see about an invite. */
export interface PublicInvite {
  label: string;
  owner_name: string;
  has_passcode: boolean;
  status: InviteStatus;
  max_total_bytes: number;
  max_files: number;
  used_bytes: number;
  used_files: number;
  expires_at: string;
  /** Optional: send this from the backend to let the guest page warn about per-file limits up front. */
  max_file_bytes?: number;
}

export interface CreateInviteInput {
  label?: string;
  max_total_bytes?: number;
  max_files?: number;
  expiry_hours?: number;
  passcode?: string;
}

// Keep in sync with BlockedGuestExtensions in upload_invite_service.go.
export const BLOCKED_GUEST_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".msi", ".sh", ".ps1", ".dll", ".scr", ".com",
  ".vbs", ".wsf", ".jar", ".cpl", ".pif", ".hta", ".reg", ".apk", ".ipa",
];

export const MAX_ACTIVE_INVITES = 10;

export function getBlockedExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = filename.slice(dot).toLowerCase();
  return BLOCKED_GUEST_EXTENSIONS.includes(ext) ? ext : null;
}

export function isInviteActive(invite: Pick<UploadInvite, "status" | "expires_at">): boolean {
  return invite.status === "active" && new Date(invite.expires_at).getTime() > Date.now();
}

export function buildInviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/collect/${token}`;
}

// ─────────────────────────────────────────────────────────────
// Owner hooks (JWT, via apiClient)
// ─────────────────────────────────────────────────────────────

const INVITES_KEY = ["upload-invites"];

export function useUploadInvites() {
  return useQuery<UploadInvite[]>({
    queryKey: INVITES_KEY,
    queryFn: async () => {
      const data = await apiClient("/api/v1/upload-invites?limit=50");
      return (data?.invites ?? []) as UploadInvite[];
    },
  });
}

export function useCreateUploadInvite() {
  const queryClient = useQueryClient();
  return useMutation<UploadInvite, Error, CreateInviteInput>({
    mutationFn: async (input) => {
      const body: CreateInviteInput = { ...input };
      if (!body.passcode) delete body.passcode;
      const data = await apiClient("/api/v1/upload-invites", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return data.invite as UploadInvite;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

export function useRevokeUploadInvite() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient(`/api/v1/upload-invites/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

// ─────────────────────────────────────────────────────────────
// Guest API (public, no auth header, no token refresh side effects)
// ─────────────────────────────────────────────────────────────

export class GuestApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GuestApiError";
    this.status = status;
  }
}

async function guestRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === "error") {
    throw new GuestApiError(json?.detail || json?.message || `Request failed (${res.status})`, res.status);
  }
  return json.data as T;
}

const publicBase = (token: string) => `/api/v1/public/upload-invite/${encodeURIComponent(token)}`;

export function getPublicInvite(token: string): Promise<PublicInvite> {
  return guestRequest<PublicInvite>(publicBase(token));
}

export async function verifyInvitePasscode(token: string, passcode: string): Promise<string> {
  const data = await guestRequest<{ session_token: string }>(`${publicBase(token)}/verify-passcode`, {
    method: "POST",
    body: JSON.stringify({ passcode }),
  });
  return data.session_token;
}

export function createGuestUploadSession(
  token: string,
  input: { filename: string; file_size: number; content_type: string; session_token?: string },
): Promise<{ file_id: string; upload_url: string }> {
  return guestRequest(`${publicBase(token)}/upload-session`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeGuestUpload(token: string, fileId: string): Promise<void> {
  await guestRequest(`${publicBase(token)}/complete/${encodeURIComponent(fileId)}`, { method: "POST" });
}

/** PUT a file to a presigned URL, reporting progress (0-100). */
export function putToStorage(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(file);
  });
}
