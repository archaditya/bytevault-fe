"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Settings, Clock, Radio } from "lucide-react";
import toast from "react-hot-toast";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

function formatDuration(createdStr?: string, burnedStr?: string, status?: string) {
  if (!createdStr) return "—";
  const created = new Date(createdStr).getTime();
  if (isNaN(created)) return "—";
  const ended = burnedStr ? new Date(burnedStr).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((ended - created) / 1000));

  let timeFormatted = "";
  if (diffSec < 60) {
    timeFormatted = `${diffSec}s`;
  } else {
    const mins = Math.floor(diffSec / 60);
    const sec = diffSec % 60;
    if (mins < 60) {
      timeFormatted = sec > 0 ? `${mins}m ${sec}s` : `${mins}m`;
    } else {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      timeFormatted = `${hrs}h ${remMins}m`;
    }
  }

  if (status === "BURNED") {
    return `Burned in ${timeFormatted}`;
  }
  if (status === "EXPIRED") {
    return `Expired (${timeFormatted})`;
  }
  if (status === "UPLOADING") {
    return `Uploading (${timeFormatted})`;
  }
  return `Active for ${timeFormatted}`;
}

export default function AdminInstantSharesPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "instant">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dynamic Form State for Admin Governance Controls
  const [maxUploadGb, setMaxUploadGb] = useState<number>(2);
  const [maxDownloadsCap, setMaxDownloadsCap] = useState<number>(1);
  const [rateLimit24h, setRateLimit24h] = useState<number>(2);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Fetch current live settings from DB on page load
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoadingConfig(true);
        const data = await apiClient("/api/v1/ephemeral/config");
        if (data) {
          setMaxUploadGb(data.max_file_size_gb || 2);
          setMaxDownloadsCap(data.max_downloads_cap || 1);
          setRateLimit24h(data.rate_limit_24h || 2);
        }
      } catch (err) {
        console.error("Failed to fetch ephemeral config from DB:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadSettings();
  }, []);

  // Fetch live anonymous transaction logs from backend
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ephemeral-logs", page],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/admin/ephemeral-logs?offset=${(page - 1) * 20}&limit=20`);
      return {
        shares: res.shares || [],
        total: res.total || 0,
      };
    },
  });

  // Save updated settings to DB
  const handleSaveControls = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await apiClient("/api/v1/admin/ephemeral-config", {
        method: "POST",
        body: JSON.stringify({
          max_file_size_gb: Number(maxUploadGb),
          max_downloads_cap: Number(maxDownloadsCap),
          rate_limit_24h: Number(rateLimit24h),
          expiry_minutes: 60,
        }),
      });
      toast.success("Ephemeral rules saved to Database!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" /> Instant Share Telemetry & Controls
          </h1>
          <p className="text-xs text-ink-muted">
            Configure global rules and monitor anonymous "Burn After Reading" guest uploads.
          </p>
        </div>
      </div>

      {/* Admin Ephemeral Control Settings Panel (Live DB Connected) */}
      <Card className="bg-bg-surface border-border-strong">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-accent" /> Ephemeral System Rules & Rate Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSaveControls} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <Label className="text-xs">Guest Max File Size (GB)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={maxUploadGb}
                  onChange={(e) => setMaxUploadGb(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Max Downloads Cap</Label>
                <Input
                  type="number"
                  value={maxDownloadsCap}
                  onChange={(e) => setMaxDownloadsCap(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Rate Limit (Uploads/24h per IP)</Label>
                <Input
                  type="number"
                  value={rateLimit24h}
                  onChange={(e) => setRateLimit24h(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" size="sm" disabled={savingConfig}>
                  {savingConfig ? "Saving to Database..." : "Save Ephemeral Controls"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Live Transaction Telemetry Logs Table */}
      <Card className="bg-bg-surface border-border-strong">
        <CardHeader className="pb-3 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Anonymous Upload Transactions</CardTitle>
            <p className="text-[11px] text-ink-muted">
              Total {data?.total || 0} events recorded across all guest sessions.
            </p>
          </div>

          {/* Filtering toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Mode Filter */}
            <div className="flex items-center rounded-lg border border-border bg-bg-raised p-0.5">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  typeFilter === "all" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                All Modes
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("live")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  typeFilter === "live" ? "bg-emerald-500 text-black font-semibold" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Radio className="w-3 h-3" /> Live Only
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("instant")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  typeFilter === "instant" ? "bg-accent/20 text-accent font-semibold" : "text-ink-muted hover:text-ink"
                }`}
              >
                Standard
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center rounded-lg border border-border bg-bg-raised p-0.5">
              {["all", "UPLOADING", "ACTIVE", "BURNED", "EXPIRED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    statusFilter === st ? "bg-border-strong text-ink font-semibold" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {st === "all" ? "All" : st}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !data?.shares || data.shares.length === 0 ? (
            <div className="p-6 text-xs text-ink-muted text-center">No guest instant uploads recorded.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              {(() => {
                const filtered = data.shares.filter((s: any) => {
                  if (typeFilter === "live" && !s.is_live) return false;
                  if (typeFilter === "instant" && s.is_live) return false;
                  if (statusFilter !== "all" && s.status !== statusFilter) return false;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-ink-muted">
                      No records match the selected filter criteria.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-bg-raised text-ink-faint uppercase text-[10px] font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">File Name</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Size</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Duration / Lifespan</th>
                        <th className="p-3">Downloads</th>
                        <th className="p-3">Guest IP</th>
                        <th className="p-3">Created</th>
                        <th className="p-3">Expires At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((s: any) => (
                        <tr key={s.id} className="hover:bg-bg-overlay/20">
                          <td className="p-3 font-semibold text-ink truncate max-w-xs">
                            <span className="truncate" title={s.filename}>{s.filename}</span>
                          </td>
                          <td className="p-3">
                            {s.is_live ? (
                              <Badge variant="default" className="text-[9px] px-1.5 py-0 uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1 w-fit">
                                <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                              </Badge>
                            ) : (
                              <Badge variant="muted" className="text-[9px] px-1.5 py-0 uppercase tracking-wider text-ink-muted border-border shrink-0">
                                INSTANT
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">{formatBytes(s.file_size)}</td>
                          <td className="p-3">
                            <Badge
                              variant={
                                s.status === "READY" || s.status === "ACTIVE"
                                  ? "live"
                                  : s.status === "BURNED"
                                  ? "danger"
                                  : s.status === "EXPIRED"
                                  ? "muted"
                                  : "info"
                              }
                              className="text-[10px]"
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-ink-muted">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 text-ink-faint" />
                              {formatDuration(s.created_at, s.burned_at, s.status)}
                            </span>
                          </td>
                          <td className="p-3">
                            {s.download_count} / {s.max_downloads}
                          </td>
                          <td className="p-3 text-accent">{s.ip_address || "Unknown"}</td>
                          <td className="p-3 text-ink-muted text-[11px]">
                            {s.created_at ? new Date(s.created_at).toLocaleTimeString() : "—"}
                          </td>
                          <td className="p-3 text-ink-muted">{formatRelativeTime(s.expires_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-ink-muted">Page {page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= (data?.total || 0)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
