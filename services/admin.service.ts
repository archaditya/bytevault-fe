import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getAccessToken } from "@/lib/api-client";
import { Subscription } from "@/types/subscription";

export interface AdminStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  active_sessions: number;
  total_files: number;
  total_storage: number;
  provider_storage: Array<{
    provider: string;
    used_bytes: number;
    file_count: number;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  status: string;
  role?: string;
  package_name?: string;
  subscription_status?: string;
  storage_limit_bytes?: number | null;
  max_file_size_bytes?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityLog {
  id: string;
  user_id: string | null;
  user_email?: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ContactQuery {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  status: "pending" | "replied";
  created_at: string;
  updated_at: string;
  replier_name?: string;
  replier_email?: string;
}

export function useSubmitContactQueryMutation() {
  return useMutation({
    mutationFn: async (req: { name: string; email: string; subject: string; message: string }) => {
      return apiClient("/api/v1/contact", {
        method: "POST",
        body: JSON.stringify(req),
      });
    },
  });
}

export function useAdminContactQueries(page = 1, limit = 20) {
  return useQuery<{ queries: ContactQuery[]; total: number }>({
    queryKey: ["admin", "contact-queries", page, limit],
    queryFn: async () => {
      const data = await apiClient(`/api/v1/admin/contact-queries?page=${page}&limit=${limit}`);
      return {
        queries: data.queries || [],
        total: data.pagination?.total || 0,
      };
    },
  });
}

export function useReplyContactQueryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      return apiClient(`/api/v1/admin/contact-queries/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contact-queries"] });
    },
  });
}


export interface AdminFile {
  id: string;
  user_id: string;
  filename: string;
  storage_provider: string;
  bucket: string;
  storage_key: string;
  file_size: string | number;
  content_type: string;
  is_public: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_email?: string;
}

export interface AdminNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useSendAdminNotificationMutation() {
  return useMutation({
    mutationFn: async (params: {
      target_type: "global" | "role" | "single";
      user_id?: string;
      role?: string;
      title: string;
      body: string;
      channels: string[];
      priority: string;
      category?: string;
      path?: string;
    }) => {
      const qs = new URLSearchParams();
      qs.set("target_type", params.target_type);
      if (params.user_id) qs.set("user_id", params.user_id);
      if (params.role) qs.set("role", params.role);
      qs.set("title", params.title);
      qs.set("body", params.body);
      params.channels.forEach((ch) => qs.append("channels", ch));
      qs.set("priority", params.priority);
      if (params.category) qs.set("category", params.category);
      if (params.path) qs.set("path", params.path);

      return apiClient(`/api/v1/notifications/admin/send?${qs.toString()}`, {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  });
}

export function useAdminNotifications(page = 1, limit = 20) {
  return useQuery<{ notifications: AdminNotification[]; total: number }>({
    queryKey: ["admin", "notifications", page, limit],
    queryFn: async () => {
      const data = await apiClient(`/api/v1/admin/notifications?offset=${(page - 1) * limit}&limit=${limit}`);
      return {
        notifications: data.notifications || [],
        total: data.total || 0,
      };
    },
  });
}

export function useAdminStats(options?: { enabled?: boolean }) {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      return apiClient("/api/v1/admin/stats");
    },
    ...options,
  });
}

export function useAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 10;
  return useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin", "users", params],
    queryFn: async () => {
      const queryParts = [`page=${page}`, `limit=${limit}`];
      if (params.search) queryParts.push(`q=${encodeURIComponent(params.search)}`);
      if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
      if (params.role) queryParts.push(`role=${encodeURIComponent(params.role)}`);
      const queryString = queryParts.join("&");

      const data = await apiClient(`/api/v1/admin/users?${queryString}`);
      return {
        users: data.users || [],
        total: data.pagination?.total || 0,
      };
    },
  });
}

export function useAdminUser(id: string) {
  return useQuery<{
    user: AdminUser & { role_id?: string };
    subscription?: Subscription | null;
    total_files: number;
    total_storage: number;
  }>({
    queryKey: ["admin", "users", id],
    queryFn: async () => {
      return apiClient(`/api/v1/admin/users/${id}`);
    },
    enabled: !!id,
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      first_name,
      last_name,
      status,
      is_verified,
      role_id,
      storage_limit_bytes,
      max_file_size_bytes,
    }: {
      id: string;
      first_name?: string;
      last_name?: string;
      status?: string;
      is_verified?: boolean;
      role_id?: string;
      storage_limit_bytes?: number;
      max_file_size_bytes?: number;
    }) => {
      return apiClient(`/api/v1/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ first_name, last_name, status, is_verified, role_id, storage_limit_bytes, max_file_size_bytes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/api/v1/admin/users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useRoles() {
  return useQuery<Array<{ id: string; name: string; description: string }>>({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const data = await apiClient("/api/v1/admin/roles");
      return data.roles || [];
    },
  });
}

export function useAdminActivity(page = 1, limit = 20, startDate?: string, endDate?: string) {
  return useQuery<{ logs: AdminActivityLog[]; total: number }>({
    queryKey: ["admin", "activity", page, limit, startDate, endDate],
    queryFn: async () => {
      const queryParts = [`page=${page}`, `limit=${limit}`];
      if (startDate) queryParts.push(`start_date=${encodeURIComponent(startDate)}`);
      if (endDate) queryParts.push(`end_date=${encodeURIComponent(endDate)}`);
      const data = await apiClient(`/api/v1/admin/activity?${queryParts.join("&")}`);
      return {
        logs: data.logs || [],
        total: data.total ?? data.pagination?.total ?? (data.logs?.length || 0),
      };
    },
  });
}

export interface AdminAuditLogEntry {
  id: string;
  tenant_id?: string;
  actor_user_id?: string;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  status: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export function useAdminAuditLogs(
  page = 1,
  limit = 20,
  startDate?: string,
  endDate?: string,
  action?: string,
  resourceType?: string
) {
  return useQuery<{ audit_logs: AdminAuditLogEntry[]; total: number }>({
    queryKey: ["admin", "audit-logs", page, limit, startDate, endDate, action, resourceType],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const queryParts = [`limit=${limit}`, `offset=${offset}`];
      if (startDate) queryParts.push(`start_date=${encodeURIComponent(startDate)}`);
      if (endDate) queryParts.push(`end_date=${encodeURIComponent(endDate)}`);
      if (action) queryParts.push(`action=${encodeURIComponent(action)}`);
      if (resourceType) queryParts.push(`resource_type=${encodeURIComponent(resourceType)}`);
      const data = await apiClient(`/api/v1/admin/audit-logs?${queryParts.join("&")}`);
      return {
        audit_logs: data.audit_logs || [],
        total: data.total ?? (data.audit_logs?.length || 0),
      };
    },
  });
}

export function useAdminFiles(params: {
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery<{ files: AdminFile[]; next_cursor?: string }>({
    queryKey: ["admin", "files", params],
    queryFn: async () => {
      const queryParts = [];
      if (params.search) queryParts.push(`q=${encodeURIComponent(params.search)}`);
      if (params.cursor) queryParts.push(`cursor=${params.cursor}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);
      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const res = await apiClient(`/api/v1/admin/files${queryString}`);
      return {
        files: res?.files || [],
        next_cursor: res?.pagination?.next_cursor || undefined,
      };
    },
  });
}

export function useAdminSharedFiles(params: {
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery<{ files: AdminFile[]; next_cursor?: string }>({
    queryKey: ["admin", "files", "shared", params],
    queryFn: async () => {
      const queryParts = [];
      if (params.search) queryParts.push(`q=${encodeURIComponent(params.search)}`);
      if (params.cursor) queryParts.push(`cursor=${params.cursor}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);
      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const res = await apiClient(`/api/v1/admin/files/shared${queryString}`);
      return {
        files: res?.files || [],
        next_cursor: res?.pagination?.next_cursor || undefined,
      };
    },
  });
}

export interface TelemetryData {
  uptime_seconds: number;
  total_requests: number;
  success_2xx: number;
  client_err_4xx: number;
  server_err_5xx: number;
  error_rate_pct: number;
  current_rps: number;
  window_requests?: number;
  queue_depths?: Record<string, number>;
  latency: {
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    avg_ms: number;
    max_ms: number;
  };
  resources: {
    alloc_mb: number;
    sys_mb: number;
    goroutines: number;
    num_gc: number;
  };
  database: {
    total_conns: number;
    idle_conns: number;
    acquired_conns: number;
    max_conns: number;
  };
  top_routes: Array<{
    route: string;
    count: number;
    errors: number;
    avg_ms: number;
  }>;
}

export interface BandwidthData {
  total_bytes_transferred: number;
  total_transfer_count: number;
  breakdown: Record<string, number>;
  top_consumers: Array<{
    user_id: string | null;
    user_email: string | null;
    total_bytes: number;
    transfer_count: number;
  }>;
}

export function useAdminTelemetry(options?: { refetchInterval?: number; enabled?: boolean }) {
  return useQuery<TelemetryData>({
    queryKey: ["admin", "telemetry"],
    queryFn: async () => {
      return apiClient("/api/v1/admin/telemetry");
    },
    refetchInterval: options?.refetchInterval ?? 5000,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminBandwidth(timeframe: string = "today", options?: { enabled?: boolean }) {
  return useQuery<BandwidthData>({
    queryKey: ["admin", "bandwidth", timeframe],
    queryFn: async () => {
      return apiClient(`/api/v1/admin/bandwidth?timeframe=${timeframe}`);
    },
    enabled: options?.enabled ?? true,
  });
}

export interface ModerationStats {
  total_blocked: number;
  total_flagged: number;
  restricted_users: number;
  pending_appeals: number;
}

export interface FlaggedFile extends AdminFile {
  owner_name?: string;
  owner_email?: string;
  nsfw_score?: number;
}

export function useAdminModerationStats() {
  return useQuery<ModerationStats>({
    queryKey: ["admin", "moderation", "stats"],
    queryFn: async () => {
      return apiClient("/api/v1/admin/moderation/stats");
    },
  });
}

export function useAdminFlaggedFiles(params?: { cursor?: string }) {
  return useQuery<{ files: FlaggedFile[]; next_cursor?: string }>({
    queryKey: ["admin", "moderation", "flagged", params],
    queryFn: async () => {
      const query = params?.cursor ? `?cursor=${params.cursor}` : "";
      const data = await apiClient(`/api/v1/admin/moderation/flagged${query}`);
      return {
        files: data?.files || [],
        next_cursor: data?.next_cursor,
      };
    },
  });
}

export function useApproveFlaggedFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string) => {
      return apiClient(`/api/v1/admin/moderation/files/${fileId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
    },
  });
}

export function useRejectFlaggedFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string) => {
      return apiClient(`/api/v1/admin/moderation/files/${fileId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
    },
  });
}

export interface AdminSettings {
  max_upload_mb: number;
  rate_limit_per_hour: number;
  allow_public_shares: boolean;
  maintenance_mode: boolean;
}

export function useAdminSettings() {
  return useQuery<AdminSettings>({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const data = await apiClient("/api/v1/admin/settings");
      return data;
    },
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AdminSettings) => {
      return apiClient("/api/v1/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

export interface AbuseReport {
  id: string;
  ticket_number: string;
  file_id?: string | null;
  target_url: string;
  category: string;
  reporter_name: string;
  reporter_email: string;
  description: string;
  evidence_url?: string | null;
  status: "pending" | "investigating" | "actioned_takedown" | "dismissed";
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  file_name?: string | null;
  file_size?: number | null;
  file_content_type?: string | null;
  file_status?: string | null;
  uploader_id?: string | null;
  uploader_email?: string | null;
  uploader_strikes?: number | null;
  reviewer_email?: string | null;
}

export function useSubmitAbuseReportMutation() {
  return useMutation({
    mutationFn: async (req: {
      reporter_name: string;
      reporter_email: string;
      category: string;
      target_url: string;
      description: string;
      evidence_url?: string;
    }) => {
      return apiClient("/api/v1/report/abuse", {
        method: "POST",
        body: JSON.stringify(req),
      });
    },
  });
}

export function useAdminAbuseReports(page = 1, limit = 20, status?: string) {
  return useQuery<{ reports: AbuseReport[]; total: number }>({
    queryKey: ["admin", "moderation", "reports", page, limit, status],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("limit", String(limit));
      if (status) qs.set("status", status);

      const data = await apiClient(`/api/v1/admin/moderation/reports?${qs.toString()}`);
      return {
        reports: data?.reports || [],
        total: data?.pagination?.total || 0,
      };
    },
  });
}

export function useTakedownAbuseReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes?: string }) => {
      return apiClient(`/api/v1/admin/moderation/reports/${id}/takedown`, {
        method: "POST",
        body: JSON.stringify({ admin_notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
    },
  });
}

export function useStrikeReportUploaderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes?: string }) => {
      return apiClient(`/api/v1/admin/moderation/reports/${id}/strike`, {
        method: "POST",
        body: JSON.stringify({ admin_notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
    },
  });
}

export function useDismissAbuseReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes?: string }) => {
      return apiClient(`/api/v1/admin/moderation/reports/${id}/dismiss`, {
        method: "POST",
        body: JSON.stringify({ admin_notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation"] });
    },
  });
}

export interface AdminFilePreviewData {
  file_id: string;
  filename: string;
  file_size: number;
  content_type: string;
  status: string;
  is_public: boolean;
  created_at: string;
  preview_url?: string;
  uploader_email?: string;
  uploader_strikes?: number;
  account_created?: string;
}

export function useAdminFilePreview(fileId: string | null) {
  return useQuery<AdminFilePreviewData>({
    queryKey: ["admin", "moderation", "preview", fileId],
    queryFn: async () => {
      return apiClient(`/api/v1/admin/moderation/files/${fileId}/preview`);
    },
    enabled: !!fileId,
  });
}

// -------------------------------------------------------------
// Server Log Management
// -------------------------------------------------------------

export interface LogFileInfo {
  filename: string;
  size_bytes: number;
  updated_at: string;
}

export interface LogTailResponse {
  filename: string;
  lines: string[];
  total_lines: number;
}

export function useAdminLogFiles() {
  return useQuery<LogFileInfo[]>({
    queryKey: ["admin", "logs", "files"],
    queryFn: async () => {
      const data = await apiClient("/api/v1/admin/logs");
      return data?.files || [];
    },
  });
}

export function useAdminLogTail(filename: string | null, lines = 200, options?: { refetchInterval?: number; enabled?: boolean }) {
  return useQuery<LogTailResponse>({
    queryKey: ["admin", "logs", "tail", filename, lines],
    queryFn: async () => {
      if (!filename) throw new Error("No filename provided");
      return apiClient(`/api/v1/admin/logs/tail?file=${encodeURIComponent(filename)}&lines=${lines}`);
    },
    enabled: !!filename && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}

export async function downloadAdminLogFile(filename: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`/api/v1/admin/logs/download?file=${encodeURIComponent(filename)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to download log: ${res.statusText}`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}



