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
import { Flame, Settings } from "lucide-react";
import toast from "react-hot-toast";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

export default function AdminInstantSharesPage() {
  const [page, setPage] = useState(1);

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
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Anonymous Upload Transactions</CardTitle>
          <span className="text-xs text-ink-muted">Total {data?.total || 0} events</span>
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
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-bg-raised text-ink-faint uppercase text-[10px] font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Downloads</th>
                    <th className="p-3">Guest IP</th>
                    <th className="p-3">Expires At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.shares.map((s: any) => (
                    <tr key={s.id} className="hover:bg-bg-overlay/20">
                      <td className="p-3 font-semibold text-ink truncate max-w-xs">{s.filename}</td>
                      <td className="p-3">{formatBytes(s.file_size)}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            s.status === "READY"
                              ? "success"
                              : s.status === "BURNED"
                              ? "danger"
                              : "info"
                          }
                          className="text-[10px]"
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {s.download_count} / {s.max_downloads}
                      </td>
                      <td className="p-3 text-accent">{s.ip_address || "Unknown"}</td>
                      <td className="p-3 text-ink-muted">{formatRelativeTime(s.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
