import { useQuery } from "@tanstack/react-query";
import { StorageProvider } from "@/types";

// Storage provider management is not yet implemented in the backend.
// Return empty arrays so the UI renders empty states instead of fake data.

export function useStorageProviders() {
  return useQuery<StorageProvider[]>({
    queryKey: ["storage-providers"],
    queryFn: async () => [],
  });
}

export function useStorageProvider(id: string) {
  return useQuery<StorageProvider | null>({
    queryKey: ["storage-providers", id],
    queryFn: async () => null,
    enabled: !!id,
  });
}
