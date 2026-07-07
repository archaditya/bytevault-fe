"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings, Save, AlertTriangle, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const [maxUploadMB, setMaxUploadMB] = useState(100);
  const [allowPublicShares, setAllowPublicShares] = useState(true);
  const [rateLimitPerHour, setRateLimitPerHour] = useState(1000);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Access Denied</h2>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("System configurations updated successfully!");
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent-bright" /> Administrative Settings
        </h1>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Configure system limits, storage permissions, and maintenance status for ByteVault.
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl flex flex-col gap-6">
        <Card className="bg-bg-surface border-border-strong">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              System Policy Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-[13px]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="maxUploadMB" className="font-semibold text-ink-muted flex items-center gap-1.5">
                Maximum File Upload Size (MB)
                <span className="text-accent-bright font-mono text-[10px]">Active Cap</span>
              </label>
              <Input
                id="maxUploadMB"
                type="number"
                value={maxUploadMB}
                onChange={(e) => setMaxUploadMB(Number(e.target.value))}
                min={1}
                max={500}
                required
              />
              <p className="text-[11px] text-ink-faint">
                Upper bound file size for direct R2/S3 storage uploads. Currently capped at 100MB per file.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 pt-2">
              <label htmlFor="rateLimitPerHour" className="font-semibold text-ink-muted">
                Rate Limit per API Token (Requests / Hour)
              </label>
              <Input
                id="rateLimitPerHour"
                type="number"
                value={rateLimitPerHour}
                onChange={(e) => setRateLimitPerHour(Number(e.target.value))}
                min={100}
                max={10000}
                required
              />
              <p className="text-[11px] text-ink-faint">
                Limits non-admin requests to prevent API resource exhaustion.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-3 border-t border-border mt-2">
              <input
                type="checkbox"
                id="allowPublicShares"
                checked={allowPublicShares}
                onChange={(e) => setAllowPublicShares(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-bg-raised text-accent focus:ring-accent"
              />
              <div className="flex flex-col">
                <label htmlFor="allowPublicShares" className="font-semibold text-ink">
                  Allow Public File Sharing
                </label>
                <span className="text-[11px] text-ink-faint">
                  Enables users to create public read links for files.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-surface border-border-strong border-danger/20">
          <CardHeader className="bg-danger/5 border-b border-danger/10">
            <CardTitle className="text-sm font-semibold text-danger flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4 text-[13px]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-ink">System Maintenance Mode</span>
                <span className="text-[11px] text-ink-faint max-w-md">
                  Puts ByteVault into read-only mode. All non-admin logins and file uploads are paused until deactivated.
                </span>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="h-5 w-5 rounded border-border bg-bg-raised text-danger focus:ring-danger"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
