export type ProviderStatus = "healthy" | "degraded" | "down";

export interface StorageProvider {
  id: "r2" | "s3" | "local";
  name: string;
  vendor: string;
  region: string;
  status: ProviderStatus;
  latencyMs: number;
  usedBytes: number;
  capacityBytes: number;
  availabilityPct: number;
  costPerGbCents: number;
  fileCount: number;
  isDefault: boolean;
  isPrimary: boolean;
  uptimeHistory: { day: string; uptimePct: number }[];
}

export interface QuotaStats {
  used_bytes: number;
  total_bytes: number;
  remaining_bytes: number;
  max_file_size_bytes: number;
}
