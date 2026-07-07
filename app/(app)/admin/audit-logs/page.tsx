"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import { useAdminActivity } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal, AlertTriangle } from "lucide-react";

export default function AdminAuditLogsPage() {
  const { user: currentUser } = useAuthStore();
  const [activityPage, setActivityPage] = useState(1);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const { data: activityData, isLoading: activityLoading } = useAdminActivity(activityPage, 20);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
          <Terminal className="h-5 w-5 text-accent-bright" /> System Audit Logs
        </h1>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Review security events, folder operations, user updates, and administrative actions.
        </p>
      </div>

      <Card className="bg-bg-surface border-border-strong">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-accent" /> System Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="p-6 flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !activityData?.logs || activityData.logs.length === 0 ? (
            <div className="p-6 text-sm text-ink-muted text-center">No system events logged.</div>
          ) : (
            <div className="flex flex-col font-sans">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    <span>Timestamp</span>
                    <span>User ID</span>
                    <span>Action</span>
                    <span>Resource</span>
                    <span>IP Address</span>
                    <span>Extra Details</span>
                  </div>
                  {activityData.logs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                    >
                      <span className="font-mono text-ink-muted truncate">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <span className="font-mono text-ink-muted truncate" title={log.user_id || "System"}>
                        {log.user_id ? log.user_id.slice(0, 8) : "System"}
                      </span>
                      <span>
                        <Badge variant="info" className="font-mono text-[10px]">
                          {log.action}
                        </Badge>
                      </span>
                      <span className="truncate">
                        {log.resource_type ? `${log.resource_type}:` : ""}
                        <span className="font-mono text-[12px] text-ink-muted">
                          {log.resource_id ? log.resource_id.slice(0, 8) : "—"}
                        </span>
                      </span>
                      <span className="font-mono text-ink-muted">{log.ip_address || "—"}</span>
                      <span className="text-ink-faint truncate max-w-xs font-mono text-[11px]" title={JSON.stringify(log.metadata)}>
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
                <span className="text-xs text-ink-muted">
                  Total {activityData.total} logs
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivityPage((p) => p + 1)}
                    disabled={activityPage * 20 >= activityData.total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
