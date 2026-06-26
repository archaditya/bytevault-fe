"use client";

import { HardDrive, Files, ArrowLeftRight, Activity } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatBytes } from "@/lib/utils";
import { useFiles, useQuota } from "@/services";

export function DashboardStats() {
  const { data: quota } = useQuota();
  const { data: filesResponse } = useFiles({});
  
  const totalUsed = quota?.used_bytes || 0;
  const fileCount = filesResponse?.files?.length || 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Storage used"
        value={formatBytes(totalUsed)}
        icon={HardDrive}
        trend={{ value: "+4.2% this week", direction: "up" }}
      />
      <StatCard
        label="Total files"
        value={fileCount.toLocaleString()}
        icon={Files}
        trend={{ value: "+12 today", direction: "up" }}
      />
      <StatCard
        label="Transfers"
        value="0"
        icon={ArrowLeftRight}
        trend={{ value: "+38 today", direction: "up" }}
      />
      <StatCard
        label="Active sessions"
        value="0"
        icon={Activity}
        accent="text-live"
      />
    </div>
  );
}
