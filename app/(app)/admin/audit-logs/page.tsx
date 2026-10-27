"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import { useAdminActivity, useAdminAuditLogs } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Terminal,
  AlertTriangle,
  Calendar,
  RotateCcw,
  ShieldCheck,
  Database,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatMetadata(metadata?: Record<string, any> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  const parts: string[] = [];
  if (metadata.filename || metadata.file_name) parts.push(String(metadata.filename || metadata.file_name));
  if (metadata.file_size) parts.push(formatBytes(Number(metadata.file_size)));
  if (metadata.role) parts.push(`Role: ${metadata.role}`);
  if (metadata.reason) parts.push(`Reason: ${metadata.reason}`);
  if (metadata.speed_bytes_sec) parts.push(`${formatBytes(Number(metadata.speed_bytes_sec))}/s`);
  if (metadata.duration_ms) parts.push(`${metadata.duration_ms}ms`);
  if (metadata.chunks) parts.push(`${metadata.chunks} chunks`);
  if (parts.length > 0) return parts.join(" • ");

  return Object.entries(metadata)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(", ");
}

export default function AdminAuditLogsPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"security" | "compliance">("security");
  const [securityPage, setSecurityPage] = useState(1);
  const [compliancePage, setCompliancePage] = useState(1);
  const pageSize = 20;

  const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const getEffectiveDates = () => {
    const now = new Date();
    if (datePreset === "today") {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === "7d") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start: past.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0],
      };
    }
    if (datePreset === "30d") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        start: past.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0],
      };
    }
    if (datePreset === "custom") {
      return { start: startDate, end: endDate };
    }
    return { start: "", end: "" };
  };

  const effectiveDates = getEffectiveDates();

  // 1. Original User & Security Activity logs (Logins, logouts, emails, etc.)
  const { data: activityData, isLoading: activityLoading } = useAdminActivity(
    securityPage,
    pageSize,
    effectiveDates.start || undefined,
    effectiveDates.end || undefined
  );

  // 2. Structured Database & Compliance Audit logs (Mutations, file metrics, chunks)
  const { data: auditData, isLoading: auditLoading } = useAdminAuditLogs(
    compliancePage,
    pageSize,
    effectiveDates.start || undefined,
    effectiveDates.end || undefined
  );

  const handlePresetChange = (preset: "all" | "today" | "7d" | "30d" | "custom") => {
    setDatePreset(preset);
    setSecurityPage(1);
    setCompliancePage(1);
    if (preset !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleResetDates = () => {
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setSecurityPage(1);
    setCompliancePage(1);
  };

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

  const currentLogsCount =
    activeTab === "security" ? activityData?.total || 0 : auditData?.total || 0;
  const currentPage = activeTab === "security" ? securityPage : compliancePage;
  const setPage = activeTab === "security" ? setSecurityPage : setCompliancePage;
  const totalPages = Math.max(1, Math.ceil(currentLogsCount / pageSize));
  const isLoading = activeTab === "security" ? activityLoading : auditLoading;

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Terminal className="h-5 w-5 text-accent-bright" /> System Audit Logs
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Review security events, user authentications, data updates, and administrative compliance trails.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-bg-raised p-1 rounded-lg border border-border text-xs">
            {(
              [
                { label: "All Time", value: "all" },
                { label: "Today", value: "today" },
                { label: "7 Days", value: "7d" },
                { label: "30 Days", value: "30d" },
                { label: "Custom", value: "custom" },
              ] as const
            ).map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePresetChange(p.value)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  datePreset === p.value
                    ? "bg-accent text-white shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-bg-surface"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 bg-bg-surface border border-border rounded-lg px-2 py-1 text-xs">
              <Calendar className="h-3.5 w-3.5 text-accent" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSecurityPage(1);
                  setCompliancePage(1);
                }}
                className="bg-transparent border-0 text-ink text-xs focus:ring-0 focus:outline-none"
                placeholder="From"
              />
              <span className="text-ink-faint">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSecurityPage(1);
                  setCompliancePage(1);
                }}
                className="bg-transparent border-0 text-ink text-xs focus:ring-0 focus:outline-none"
                placeholder="To"
              />
            </div>
          )}

          {datePreset !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDates}
              className="h-8 px-2 text-xs text-ink-muted hover:text-ink gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
            activeTab === "security"
              ? "border-accent text-accent bg-bg-surface"
              : "border-transparent text-ink-muted hover:text-ink hover:bg-bg-surface/50"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>User Activity & Security</span>
          {activityData?.total !== undefined && (
            <Badge variant="muted" className="text-[10px] ml-1 font-mono">
              {activityData.total.toLocaleString()}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compliance")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
            activeTab === "compliance"
              ? "border-accent text-accent bg-bg-surface"
              : "border-transparent text-ink-muted hover:text-ink hover:bg-bg-surface/50"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>DB & Compliance Trail</span>
          {auditData?.total !== undefined && (
            <Badge variant="muted" className="text-[10px] ml-1 font-mono">
              {auditData.total.toLocaleString()}
            </Badge>
          )}
        </button>
      </div>

      <Card className="bg-bg-surface border-border-strong">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              {activeTab === "security" ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  User Authentication & Security Events
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 text-accent" />
                  Database Mutation & Compliance Trail
                </>
              )}
              {datePreset !== "all" && (
                <Badge variant="default" className="text-[10px] font-normal border-accent/40 text-accent">
                  Filtered: {datePreset === "custom" ? `${startDate || "Start"} to ${endDate || "End"}` : datePreset}
                </Badge>
              )}
            </span>
            {currentLogsCount > 0 && (
              <span className="text-xs font-normal text-ink-muted">
                Showing {Math.min((currentPage - 1) * pageSize + 1, currentLogsCount)}–
                {Math.min(currentPage * pageSize, currentLogsCount)} of {currentLogsCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : activeTab === "security" ? (
            /* TAB 1: USER SECURITY ACTIVITY LOGS */
            !activityData?.logs || activityData.logs.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted text-center">No user activity logged.</div>
            ) : (
              <div className="flex flex-col font-sans">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-[1.4fr_1.8fr_1.2fr_1.2fr_1fr_1.5fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      <span>Timestamp</span>
                      <span>User / Initiator</span>
                      <span>Action</span>
                      <span>Resource</span>
                      <span>IP Address</span>
                      <span>Details</span>
                    </div>
                    {activityData.logs.map((log) => (
                      <div
                        key={log.id}
                        className="grid grid-cols-[1.4fr_1.8fr_1.2fr_1.2fr_1fr_1.5fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                      >
                        <span className="font-mono text-ink-muted text-[12px] truncate">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span
                            className="font-medium text-ink truncate text-[13px]"
                            title={log.user_email || log.user_id || "System"}
                          >
                            {log.user_email || (log.user_id ? log.user_id.slice(0, 8) : "System")}
                          </span>
                          {log.user_email && log.user_id && (
                            <span className="font-mono text-[11px] text-ink-faint truncate">
                              ID: {log.user_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        <span>
                          <Badge
                            variant={
                              log.action.includes("login")
                                ? "info"
                                : log.action.includes("upload")
                                ? "success"
                                : log.action.includes("delete")
                                ? "danger"
                                : "default"
                            }
                            className="font-mono text-[10px]"
                          >
                            {log.action}
                          </Badge>
                        </span>
                        <span className="truncate">
                          {log.resource_type ? (
                            <span className="capitalize text-ink-muted">{log.resource_type}: </span>
                          ) : null}
                          <span className="font-mono text-[12px] text-ink-faint">
                            {log.resource_id ? log.resource_id.slice(0, 8) : "—"}
                          </span>
                        </span>
                        <span className="font-mono text-ink-muted text-[12px]">{log.ip_address || "—"}</span>
                        <span
                          className="text-ink-muted truncate text-[12px]"
                          title={log.metadata ? JSON.stringify(log.metadata, null, 2) : ""}
                        >
                          {formatMetadata(log.metadata)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
                  <span className="text-xs text-ink-muted">
                    Page {securityPage} of {totalPages} ({currentLogsCount} logs)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSecurityPage((p) => Math.max(1, p - 1))}
                      disabled={securityPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSecurityPage((p) => Math.min(totalPages, p + 1))}
                      disabled={securityPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* TAB 2: DB & COMPLIANCE TRAIL LOGS */
            !auditData?.audit_logs || auditData.audit_logs.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted text-center">No compliance audit records found.</div>
            ) : (
              <div className="flex flex-col font-sans">
                <div className="overflow-x-auto">
                  <div className="min-w-[850px]">
                    <div className="grid grid-cols-[1.4fr_1.6fr_1.2fr_1.2fr_0.9fr_1fr_1.4fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      <span>Timestamp</span>
                      <span>Actor / User ID</span>
                      <span>Action</span>
                      <span>Resource</span>
                      <span>Status</span>
                      <span>IP Address</span>
                      <span>Metrics / Details</span>
                    </div>
                    {auditData.audit_logs.map((al) => (
                      <div
                        key={al.id}
                        className="grid grid-cols-[1.4fr_1.6fr_1.2fr_1.2fr_0.9fr_1fr_1.4fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                      >
                        <span className="font-mono text-ink-muted text-[12px] truncate">
                          {new Date(al.created_at).toLocaleString()}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-ink truncate text-[12px]">
                            {al.actor_user_id ? al.actor_user_id.slice(0, 8) : al.actor_type || "system"}
                          </span>
                          <span className="font-mono text-[10px] text-ink-faint capitalize">
                            Type: {al.actor_type}
                          </span>
                        </div>
                        <span>
                          <Badge
                            variant={
                              al.action.includes("create") || al.action.includes("upload")
                                ? "success"
                                : al.action.includes("delete")
                                ? "danger"
                                : "default"
                            }
                            className="font-mono text-[10px]"
                          >
                            {al.action}
                          </Badge>
                        </span>
                        <span className="truncate">
                          <span className="capitalize text-ink-muted">{al.resource_type}: </span>
                          <span className="font-mono text-[12px] text-ink-faint">
                            {al.resource_id ? al.resource_id.slice(0, 8) : "—"}
                          </span>
                        </span>
                        <span>
                          {al.status === "success" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-danger font-medium">
                              <XCircle className="h-3 w-3" /> failure
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-ink-muted text-[12px]">{al.ip_address || "—"}</span>
                        <span
                          className="text-ink-muted truncate text-[12px]"
                          title={al.metadata ? JSON.stringify(al.metadata, null, 2) : ""}
                        >
                          {formatMetadata(al.metadata)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
                  <span className="text-xs text-ink-muted">
                    Page {compliancePage} of {totalPages} ({currentLogsCount} audit logs)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCompliancePage((p) => Math.max(1, p - 1))}
                      disabled={compliancePage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCompliancePage((p) => Math.min(totalPages, p + 1))}
                      disabled={compliancePage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
