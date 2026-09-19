import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Package, Subscription, Transaction, SubscriptionAuditLog, SystemLogArchive } from "@/types/subscription";

export function usePackages() {
  return useQuery<Package[]>({
    queryKey: ["packages"],
    queryFn: async () => {
      const data = await apiClient("/api/v1/packages");
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCurrentSubscription(enabled = true) {
  return useQuery<Subscription>({
    queryKey: ["current-subscription"],
    queryFn: async () => {
      return apiClient("/api/v1/subscription/current");
    },
    enabled,
    retry: false,
  });
}

export function useTransactions(limit = 20, offset = 0) {
  return useQuery<{ data: Transaction[]; total: number }>({
    queryKey: ["subscription-transactions", limit, offset],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/subscription/transactions?limit=${limit}&offset=${offset}`);
      return {
        data: Array.isArray(res) ? res : res?.data || [],
        total: res?.pagination?.total || 0,
      };
    },
  });
}

export function useSubscribe() {
  return useMutation({
    mutationFn: async (packageId: string) => {
      return apiClient("/api/v1/subscription/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });
    },
  });
}

export function useVerifySubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      razorpay_subscription_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      return apiClient("/api/v1/subscription/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-subscription"] });
      qc.invalidateQueries({ queryKey: ["subscription-transactions"] });
      qc.invalidateQueries({ queryKey: ["user-storage"] });
      qc.invalidateQueries({ queryKey: ["user-quota"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUpgradeSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (packageId: string) => {
      return apiClient("/api/v1/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-subscription"] });
      qc.invalidateQueries({ queryKey: ["user-storage"] });
    },
  });
}

export function useDowngradeSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (packageId: string) => {
      return apiClient("/api/v1/subscription/downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-subscription"] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return apiClient("/api/v1/subscription/cancel", {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-subscription"] });
    },
  });
}

export function useAdminCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Package>) => {
      return apiClient("/api/v1/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useAdminUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Package> & { id: string }) => {
      return apiClient(`/api/v1/admin/packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useAdminDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/api/v1/admin/packages/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

// Admin: Fetch all subscriptions
export function useAdminSubscriptions(status?: string, limit = 20, offset = 0) {
  return useQuery<{ data: Subscription[]; meta: { total: number; limit: number } }>({
    queryKey: ["admin-subscriptions", status, limit, offset],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      qs.set("limit", String(limit));
      qs.set("offset", String(offset));
      return apiClient(`/api/v1/admin/subscriptions?${qs.toString()}`);
    },
  });
}

// Admin: Force cancel a user subscription
export function useAdminCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/api/v1/admin/subscriptions/${id}/cancel`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
}

// Admin: Manually assign package to a user
export function useAdminAssignSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, packageId, durationDays }: { userId: string; packageId: string; durationDays: number }) => {
      return apiClient(`/api/v1/admin/users/${userId}/assign-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId, duration_days: durationDays }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
}

// Admin: Fetch all transactions
export function useAdminTransactions(limit = 20, offset = 0) {
  return useQuery<{ data: Transaction[]; meta: { total: number; limit: number } }>({
    queryKey: ["admin-transactions", limit, offset],
    queryFn: async () => {
      return apiClient(`/api/v1/admin/transactions?limit=${limit}&offset=${offset}`);
    },
  });
}

// Admin: Fetch subscription audit logs
export function useAdminSubscriptionLogs(limit = 50, offset = 0) {
  return useQuery<{ data: SubscriptionAuditLog[]; meta: { total: number; limit: number } }>({
    queryKey: ["admin-subscription-logs", limit, offset],
    queryFn: async () => {
      return apiClient(`/api/v1/admin/subscription-logs?limit=${limit}&offset=${offset}`);
    },
  });
}

// Admin: Fetch tracked system log archives across local server and R2
export function useAdminSystemLogs(limit = 50, offset = 0) {
  return useQuery<{ data: SystemLogArchive[]; meta: { total: number; limit: number } }>({
    queryKey: ["admin-system-logs", limit, offset],
    queryFn: async () => {
      return apiClient(`/api/v1/admin/system-logs?limit=${limit}&offset=${offset}`);
    },
  });
}
