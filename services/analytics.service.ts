import { useQuery } from "@tanstack/react-query";
import { AnalyticsPoint } from "@/types";

// Analytics data is not yet backed by a real API endpoint.
// Return empty arrays so the UI renders empty states instead of fake data.

export function useAnalyticsHistory() {
  return useQuery<AnalyticsPoint[]>({
    queryKey: ["analytics", "history"],
    queryFn: async () => [],
  });
}

export function useProviderComparison() {
  return useQuery({
    queryKey: ["analytics", "provider-comparison"],
    queryFn: async () => [],
  });
}

export function useSharedLinks() {
  return useQuery({
    queryKey: ["shared-links"],
    queryFn: async () => [],
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => [],
  });
}
