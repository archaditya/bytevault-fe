import { useQuery } from "@tanstack/react-query";

// Transfer tracking is not yet implemented in the backend.
// Return empty arrays so the UI renders empty states instead of fake data.

export function useTransfers() {
  return useQuery<any[]>({
    queryKey: ["transfers"],
    queryFn: async () => [],
  });
}

export function useTransfer(id: string) {
  return useQuery({
    queryKey: ["transfers", id],
    queryFn: async () => null,
    enabled: !!id,
  });
}

export function useTransferStats() {
  return useQuery({
    queryKey: ["transfers", "stats"],
    queryFn: async () => ({ active: 0, completed: 0, failed: 0 }),
  });
}
