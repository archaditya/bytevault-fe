"use client";

import { useAuthStore } from "@/store";
import { useAdminStats } from "@/services";
import { formatBytes } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Files,
  HardDrive,
  Activity,
  Server,
  UserCheck,
  Shield,
} from "lucide-react";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
import { RecentTransfersWidget } from "@/features/dashboard/components/recent-transfers-widget";
import { StorageProviderWidget } from "@/features/dashboard/components/storage-providers";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useAdminStats();

  const providerColors: Record<string, string> = {
    r2: "bg-[#F38020]",
    s3: "bg-[#FF9900]",
    local: "bg-[#5E9DD2]",
  };

  if (isAdmin) {
    const totalUsers = stats?.total_users || 0;
    const activeUsers = stats?.active_users || 0;
    const verifiedUsers = stats?.verified_users || 0;
    const activeSessions = stats?.active_sessions || 0;
    const totalFiles = stats?.total_files || 0;
    const totalStorage = stats?.total_storage || 0;

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent-bright" /> Administrative Overview
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Platform-wide metrics, system storage distribution, and account health.
          </p>
        </div>

        {/* KPI Row */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Users" value={totalUsers.toLocaleString()} icon={Users} />
            <StatCard label="Total Files" value={totalFiles.toLocaleString()} icon={Files} />
            <StatCard label="Total Storage Used" value={formatBytes(totalStorage)} icon={HardDrive} />
            <StatCard label="Active Sessions" value={activeSessions.toLocaleString()} icon={Activity} accent="text-live" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-bg-surface border-border-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Server className="h-4 w-4 text-accent" /> Storage Consumption by Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {statsLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : !stats?.provider_storage || stats.provider_storage.length === 0 ? (
                <div className="text-sm text-ink-muted py-4 text-center">No storage activity recorded yet.</div>
              ) : (
                <div className="flex flex-col gap-5">
                  {stats.provider_storage.map((provider) => {
                    const percentage = totalStorage > 0 ? (provider.used_bytes / totalStorage) * 100 : 0;
                    const colorClass = providerColors[provider.provider.toLowerCase()] || "bg-accent";
                    return (
                      <div key={provider.provider} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-semibold text-ink capitalize">{provider.provider} Storage</span>
                          <span className="font-mono text-ink-muted">
                            {formatBytes(provider.used_bytes)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                          <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percentage}%` }} />
                        </div>
                        <div className="flex justify-between text-[11px] text-ink-faint">
                          <span>{provider.file_count} files uploaded</span>
                          <span>{provider.provider.toLowerCase() === "r2" ? "Cloudflare R2" : provider.provider.toLowerCase() === "s3" ? "Amazon S3" : "Local Storage"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-bg-surface border-border-strong">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-accent" /> Platform User Health
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {statsLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="flex flex-col gap-4 text-[13px]">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <span className="text-ink-muted">Active Users</span>
                    <span className="font-mono font-semibold text-ink">{activeUsers}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <span className="text-ink-muted">Verified Accounts</span>
                    <span className="font-mono font-semibold text-ink">{verifiedUsers}</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-ink-muted">Verification Rate</span>
                    <span className="font-mono font-semibold text-ink">
                      {totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Standard User Dashboard View
  return (
    <div className="flex flex-col gap-6">
      <DashboardStats />
      <DashboardCharts />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransfersWidget />
        </div>
        <StorageProviderWidget />
      </div>
    </div>
  );
}
