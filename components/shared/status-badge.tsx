import { Badge } from "@/components/ui/badge";
import { TransferStatus } from "@/types";
import { ProviderStatus } from "@/types";

const transferStatusConfig: Record<TransferStatus, { label: string; variant: "live" | "muted" | "success" | "danger" | "info" }> = {
  // Unified Lifecycle States
  IDLE: { label: "Idle", variant: "muted" },
  QUEUED: { label: "Queued", variant: "info" },
  PREPARING: { label: "Preparing", variant: "info" },
  UPLOADING: { label: "Uploading", variant: "live" },
  ASSEMBLING: { label: "Assembling", variant: "live" },
  COMPLETED: { label: "Completed", variant: "success" },
  PAUSED: { label: "Paused", variant: "muted" },
  FAILED: { label: "Failed", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "muted" },

  // Legacy Lowercase Mappings
  active: { label: "Active", variant: "live" },
  paused: { label: "Paused", variant: "muted" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
  queued: { label: "Queued", variant: "info" },
};

const providerStatusConfig: Record<ProviderStatus, { label: string; variant: "success" | "live" | "danger" }> = {
  healthy: { label: "Healthy", variant: "success" },
  degraded: { label: "Degraded", variant: "live" },
  down: { label: "Down", variant: "danger" },
};

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const config = transferStatusConfig[status] || { label: String(status), variant: "muted" as const };
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  const config = providerStatusConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
