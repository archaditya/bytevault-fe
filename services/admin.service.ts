import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getAccessToken } from "@/lib/api-client";

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
  return useQuery<{ user: AdminUser & { role_id?: string }; total_files: number; total_storage: number }>({
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
    }: {
      id: string;
      first_name?: string;
      last_name?: string;
      status?: string;
      is_verified?: boolean;
      role_id?: string;
    }) => {
      return apiClient(`/api/v1/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ first_name, last_name, status, is_verified, role_id }),
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
