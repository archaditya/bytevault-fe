"use client";

import { HardDrive, Files, Download, Activity } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatBytes } from "@/lib/utils";
import { useFiles, useQuota } from "@/services";

export function DashboardStats() {
  const { data: quota } = useQuota();
  const { data: filesResponse } = useFiles({});
  
  const totalUsed = quota?.used_bytes || 0;
  const totalQuota = quota?.total_bytes || 0;
  const fileCount = filesResponse?.files?.length || 0;

  const sharedCount = filesResponse?.files?.filter((f) => f.shared).length || 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Storage used"
        value={formatBytes(totalUsed)}
        icon={HardDrive}
      />
      <StatCard
        label="Total files"
        value={fileCount.toLocaleString()}
        icon={Files}
      />
      <StatCard
        label="Shared files"
        value={sharedCount.toLocaleString()}
        icon={Download}
      />
      <StatCard
        label="Quota remaining"
        value={totalQuota > 0 ? `${Math.round(((totalQuota - totalUsed) / totalQuota) * 100)}%` : "—"}
        icon={Activity}
        accent="text-live"
      />
    </div>
  );
}
