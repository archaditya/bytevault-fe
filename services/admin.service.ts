import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      return apiClient("/api/v1/admin/stats");
    },
  });
}

export function useAdminUsers(page = 1, limit = 10) {
  return useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin", "users", page, limit],
    queryFn: async () => {
      const data = await apiClient(`/api/v1/admin/users?page=${page}&limit=${limit}`);
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
