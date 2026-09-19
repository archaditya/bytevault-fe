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
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to submit contact query.");
      }
      return response.json();
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
    }) => {
      const qs = new URLSearchParams();
      qs.set("target_type", params.target_type);
      if (params.user_id) qs.set("user_id", params.user_id);
      if (params.role) qs.set("role", params.role);
      qs.set("title", params.title);
      qs.set("body", params.body);
      params.channels.forEach((ch) => qs.append("channels", ch));
      qs.set("priority", params.priority);

      return apiClient(`/api/v1/notifications/admin/send?${qs.toString()}`, {
        method: "POST",
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

export function useAdminActivity(page = 1, limit = 20) {
  return useQuery<{ logs: AdminActivityLog[]; total: number }>({
    queryKey: ["admin", "activity", page, limit],
    queryFn: async () => {
      const data = await apiClient(`/api/v1/admin/activity?page=${page}&limit=${limit}`);
      return {
        logs: data.logs || [],
        total: data.pagination?.total || 0,
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
      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const queryParts = [];
      if (params.search) queryParts.push(`q=${encodeURIComponent(params.search)}`);
      if (params.cursor) queryParts.push(`cursor=${params.cursor}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);
      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const res = await fetch(`/api/v1/admin/files${queryString}`, { headers });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      return {
        files: json.data?.files || [],
        next_cursor: json.pagination?.next_cursor || undefined,
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
      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const queryParts = [];
      if (params.search) queryParts.push(`q=${encodeURIComponent(params.search)}`);
      if (params.cursor) queryParts.push(`cursor=${params.cursor}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);
      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const res = await fetch(`/api/v1/admin/files/shared${queryString}`, { headers });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      return {
        files: json.data?.files || [],
        next_cursor: json.pagination?.next_cursor || undefined,
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
      const token = getAccessToken();
      const res = await fetch("/api/v1/admin/telemetry", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      return json.data;
    },
    refetchInterval: options?.refetchInterval ?? 5000,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminBandwidth(timeframe: string = "today", options?: { enabled?: boolean }) {
  return useQuery<BandwidthData>({
    queryKey: ["admin", "bandwidth", timeframe],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/admin/bandwidth?timeframe=${timeframe}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      return json.data;
    },
    enabled: options?.enabled ?? true,
  });
}

