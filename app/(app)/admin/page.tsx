"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import { useAdminStats, useAdminTelemetry, useAdminBandwidth } from "@/services";
import { formatBytes } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Files,
  HardDrive,
  Activity,
  Shield,
  Server,
  AlertTriangle,
  UserCheck,
  Gauge,
  Cpu,
  Database,
  ArrowDownToLine,
  Zap,
  Globe,
  FileDown,
} from "lucide-react";

export default function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const [bandwidthTimeframe, setBandwidthTimeframe] = useState<string>("today");

  const { data: stats, isLoading: statsLoading } = useAdminStats({ enabled: isAdmin });
  const { data: telemetry, isLoading: telemetryLoading } = useAdminTelemetry({
    enabled: isAdmin,
    refetchInterval: 5000,
  });
  const { data: bandwidth, isLoading: bandwidthLoading } = useAdminBandwidth(bandwidthTimeframe, {
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Access Denied</h2>
        <p className="text-sm text-ink-muted mt-1 max-w-sm">
          You do not have the required permissions to view the Admin Console. Please contact a system administrator.
        </p>
      </div>
    );
  }

  const providerColors: Record<string, string> = {
    r2: "bg-[#F38020]",
    s3: "bg-[#FF9900]",
    local: "bg-[#5E9DD2]",
  };

  const totalUsers = stats?.total_users || 0;
  const activeUsers = stats?.active_users || 0;
  const verifiedUsers = stats?.verified_users || 0;
  const activeSessions = stats?.active_sessions || 0;
  const totalFiles = stats?.total_files || 0;
  const totalStorage = stats?.total_storage || 0;

  // DB pool saturation calculation
  const dbMax = telemetry?.database?.max_conns || 25;
  const dbAcquired = telemetry?.database?.acquired_conns || 0;
  const dbSaturationPct = dbMax > 0 ? Math.min(100, Math.round((dbAcquired / dbMax) * 100)) : 0;

  // Latency status color
  const p95 = telemetry?.latency?.p95_ms || 0;
  const latencyBadgeColor =
    p95 < 100
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : p95 < 400
      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
      : "bg-danger/10 text-danger border-danger/20";

  // Error rate status
  const errorRate = telemetry?.error_rate_pct || 0;
  const errorBadgeColor =
    errorRate === 0
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : errorRate < 1
      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
      : "bg-danger/10 text-danger border-danger/20";

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent-bright" /> Admin Console
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Real-time platform vitals, in-memory telemetry, bandwidth metering, and system overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="muted" className="px-3 py-1 font-mono text-[11px] gap-1.5 border-border-strong bg-bg-surface text-ink-muted">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Telemetry (5s poll)
          </Badge>
        </div>
      </div>

      {/* Overview Stat Cards */}
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

      {/* SECTION 1: System Vitals & In-Memory Telemetry */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold tracking-tight text-ink">System Vitals & In-Memory Telemetry</h2>
          </div>
          <span className="text-[11px] text-ink-muted font-mono">
            Uptime: {telemetry ? `${Math.floor(telemetry.uptime_seconds / 3600)}h ${Math.floor((telemetry.uptime_seconds % 3600) / 60)}m` : "--"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Latency Card */}
          <Card className="bg-bg-surface border-border-strong">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Response Latency
                </CardTitle>
                <Badge variant="muted" className={`text-[10px] px-1.5 py-0 font-mono ${latencyBadgeColor}`}>
                  p95: {p95.toFixed(1)}ms
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="rounded-lg bg-bg/50 p-2 border border-border">
                  <span className="text-[10px] text-ink-muted block uppercase">p50</span>
                  <span className="font-mono text-sm font-bold text-ink">
                    {telemetryLoading ? "--" : `${(telemetry?.latency?.p50_ms || 0).toFixed(1)}ms`}
                  </span>
                </div>
                <div className="rounded-lg bg-bg/50 p-2 border border-border">
                  <span className="text-[10px] text-ink-muted block uppercase">p95</span>
                  <span className="font-mono text-sm font-bold text-ink">
                    {telemetryLoading ? "--" : `${(telemetry?.latency?.p95_ms || 0).toFixed(1)}ms`}
                  </span>
                </div>
                <div className="rounded-lg bg-bg/50 p-2 border border-border">
                  <span className="text-[10px] text-ink-muted block uppercase">p99</span>
                  <span className="font-mono text-sm font-bold text-ink">
                    {telemetryLoading ? "--" : `${(telemetry?.latency?.p99_ms || 0).toFixed(1)}ms`}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-faint pt-1 border-t border-border">
                <span>Avg: {(telemetry?.latency?.avg_ms || 0).toFixed(1)}ms</span>
                <span>Max: {(telemetry?.latency?.max_ms || 0).toFixed(1)}ms</span>
              </div>
            </CardContent>
          </Card>

          {/* Error Rate & Throughput */}
          <Card className="bg-bg-surface border-border-strong">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-blue-500" /> Error Rate & RPS
                </CardTitle>
                <Badge variant="muted" className={`text-[10px] px-1.5 py-0 font-mono ${errorBadgeColor}`}>
                  5xx: {errorRate.toFixed(2)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-bold font-mono text-ink">
                    {telemetryLoading ? "--" : (telemetry?.current_rps || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-ink-muted ml-1.5">req / sec</span>
                </div>
                <div className="text-right font-mono text-xs text-ink-muted">
                  Total: {telemetry?.total_requests.toLocaleString() || 0}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  2xx: {telemetry?.success_2xx || 0}
                </span>
                <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  4xx: {telemetry?.client_err_4xx || 0}
                </span>
                <span className="text-danger bg-danger/10 px-1.5 py-0.5 rounded">
                  5xx: {telemetry?.server_err_5xx || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Database Pool Saturation */}
          <Card className="bg-bg-surface border-border-strong">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-purple-500" /> PostgreSQL Pool
                </CardTitle>
                <span className="text-[11px] font-mono text-ink-muted">
                  {dbAcquired} / {dbMax} Conns
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1.5 font-mono">
                  <span className="text-ink-muted">Pool Saturation</span>
                  <span className="font-semibold text-ink">{dbSaturationPct}%</span>
                </div>
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dbSaturationPct > 80 ? "bg-danger" : dbSaturationPct > 50 ? "bg-amber-500" : "bg-purple-500"
                    }`}
                    style={{ width: `${dbSaturationPct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-faint pt-1 border-t border-border">
                <span>Idle: {telemetry?.database?.idle_conns || 0}</span>
                <span>Active: {dbAcquired}</span>
                <span>Max: {dbMax}</span>
              </div>
            </CardContent>
          </Card>

          {/* Go Runtime Resources */}
          <Card className="bg-bg-surface border-border-strong">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-cyan-500" /> Go Runtime Heap
                </CardTitle>
                <span className="text-[11px] font-mono text-ink-muted">
                  {telemetry?.resources?.goroutines || 0} routines
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold font-mono text-ink">
                    {telemetryLoading ? "--" : (telemetry?.resources?.alloc_mb || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-ink-muted ml-1.5">MB Alloc</span>
                </div>
                <div className="text-right font-mono text-[11px] text-ink-muted">
                  Sys: {(telemetry?.resources?.sys_mb || 0).toFixed(1)} MB
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-faint pt-1 border-t border-border">
                <span>GC Cycles: {telemetry?.resources?.num_gc || 0}</span>
                <span>Status: Optimal</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Active API Routes */}
        {telemetry?.top_routes && telemetry.top_routes.length > 0 && (
          <Card className="bg-bg-surface border-border-strong mt-2">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-accent" /> Active Route Telemetry (In-Memory Circular Window)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border text-xs">
                {telemetry.top_routes.slice(0, 5).map((route) => (
                  <div key={route.route} className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-elevated/40">
                    <span className="font-mono text-ink font-medium truncate max-w-sm">{route.route}</span>
                    <div className="flex items-center gap-6 font-mono text-[11px]">
                      <span className="text-ink-muted">{route.count.toLocaleString()} calls</span>
                      <span className={route.errors > 0 ? "text-danger font-semibold" : "text-ink-faint"}>
                        {route.errors} errors
                      </span>
                      <span className="text-ink font-semibold w-16 text-right">{route.avg_ms.toFixed(1)} ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SECTION 2: Egress & Bandwidth Metering */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold tracking-tight text-ink">Egress & Bandwidth Metering</h2>
          </div>
          <div className="flex items-center gap-1 bg-bg-surface p-0.5 rounded-lg border border-border">
            {[
              { label: "Today", value: "today" },
              { label: "24 Hours", value: "24h" },
              { label: "7 Days", value: "7d" },
              { label: "30 Days", value: "30d" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setBandwidthTimeframe(t.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  bandwidthTimeframe === t.value
                    ? "bg-accent text-white shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-bg-elevated"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Egress Overview & Breakdown */}
          <Card className="lg:col-span-1 bg-bg-surface border-border-strong">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Total Data Transferred ({bandwidthTimeframe === "today" ? "Today" : bandwidthTimeframe})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <span className="text-3xl font-extrabold font-mono text-ink tracking-tight">
                  {bandwidthLoading ? "--" : formatBytes(bandwidth?.total_bytes_transferred || 0)}
                </span>
                <p className="text-xs text-ink-muted mt-1">
                  Across {(bandwidth?.total_transfer_count || 0).toLocaleString()} completed file & link downloads
                </p>
              </div>

              <div className="space-y-4 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-ink block">Transfer Breakdown by Channel</span>
                {[
                  { key: "file_download", label: "Private Vault Downloads", icon: FileDown, color: "bg-blue-500" },
                  { key: "public_share", label: "Public Shared Links", icon: Globe, color: "bg-emerald-500" },
                  { key: "instant_share", label: "Instant Transfers", icon: Zap, color: "bg-amber-500" },
                ].map((item) => {
                  const bytes = bandwidth?.breakdown?.[item.key] || 0;
                  const total = bandwidth?.total_bytes_transferred || 1;
                  const pct = total > 0 ? (bytes / total) * 100 : 0;
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-ink-muted">
                          <item.icon className="h-3.5 w-3.5" /> {item.label}
                        </span>
                        <span className="font-mono text-ink font-semibold">
                          {formatBytes(bytes)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Bandwidth Consumers */}
          <Card className="lg:col-span-2 bg-bg-surface border-border-strong">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center justify-between">
                <span>Top Bandwidth Consumers ({bandwidthTimeframe === "today" ? "Today" : bandwidthTimeframe})</span>
                <Badge variant="muted" className="text-[10px] font-mono border-border text-ink-muted">
                  Top 5 Egress Accounts
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bandwidthLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !bandwidth?.top_consumers || bandwidth.top_consumers.length === 0 ? (
                <div className="text-center py-10 text-xs text-ink-muted">
                  No egress transfers recorded for this timeframe yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-ink-muted font-medium pb-2">
                        <th className="pb-2">User / Account</th>
                        <th className="pb-2 text-right">Downloads</th>
                        <th className="pb-2 text-right">Egress Transferred</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {bandwidth.top_consumers.map((c, i) => (
                        <tr key={c.user_id || i} className="hover:bg-bg-elevated/30">
                          <td className="py-2.5 text-ink font-sans">
                            <span className="font-semibold block">{c.user_email || "Anonymous User"}</span>
                            <span className="text-[10px] font-mono text-ink-faint">ID: {c.user_id || "N/A"}</span>
                          </td>
                          <td className="py-2.5 text-right text-ink-muted">{c.transfer_count.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-semibold text-ink">{formatBytes(c.total_bytes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3: Storage by Provider & Platform Health */}
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
                        <span>
                          {provider.provider.toLowerCase() === "r2"
                            ? "Cloudflare R2"
                            : provider.provider.toLowerCase() === "s3"
                            ? "Amazon S3"
                            : "Local Storage"}
                        </span>
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
