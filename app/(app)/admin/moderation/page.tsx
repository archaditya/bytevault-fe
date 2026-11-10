"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import {
  useAdminFlaggedFiles,
  useAdminModerationStats,
  useApproveFlaggedFile,
  useRejectFlaggedFile,
  useAdminAbuseReports,
  useTakedownAbuseReportMutation,
  useStrikeReportUploaderMutation,
  useDismissAbuseReportMutation,
  AbuseReport,
} from "@/services/admin.service";
import { formatBytes, formatRelativeTime, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  User,
  Clock,
  ShieldCheck,
  Ban,
  FileWarning,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FilePreviewModal } from "@/features/admin/components/file-preview-modal";

export default function AdminModerationPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"flagged" | "reports">("flagged");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useAdminModerationStats();
  const { data: flaggedData, isLoading: flaggedLoading, refetch: refetchFlagged, isFetching: flaggedFetching } = useAdminFlaggedFiles();
  const { data: abuseData, isLoading: abuseLoading, refetch: refetchAbuse, isFetching: abuseFetching } = useAdminAbuseReports(1, 50);

  const approveMutation = useApproveFlaggedFile();
  const rejectMutation = useRejectFlaggedFile();
  const takedownMutation = useTakedownAbuseReportMutation();
  const strikeMutation = useStrikeReportUploaderMutation();
  const dismissMutation = useDismissAbuseReportMutation();
  const confirm = useConfirm();

  const extractFileId = (report: AbuseReport): string | null => {
    if (report.file_id) return report.file_id;
    if (!report.target_url) return null;
    const uuidMatch = report.target_url.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    if (uuidMatch) return uuidMatch[0];
    const sMatch = report.target_url.match(/\/s\/([a-zA-Z0-9_-]+)/);
    if (sMatch && sMatch[1]) return sMatch[1];
    return null;
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

  const files = flaggedData?.files || [];
  const reports = abuseData?.reports || [];
  const pendingReportsCount = reports.filter((r) => r.status === "pending").length;

  const handleApprove = async (id: string, name: string) => {
    setActiveActionId(id);
    try {
      await approveMutation.mutateAsync(id);
      toast.success(`"${name}" approved and marked READY`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve file");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Reject and Remove File",
      description: `Are you sure you want to reject "${name}"? This will delete the file and apply a strike to the user.`,
      confirmLabel: "Reject & Strike",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    setActiveActionId(id);
    try {
      await rejectMutation.mutateAsync(id);
      toast.success(`"${name}" rejected and removed`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject file");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleTakedownReport = async (report: AbuseReport) => {
    const ok = await confirm({
      title: "Take Down Reported Resource",
      description: `This will mark the file as BLOCKED_ABUSE, revoke all public share links, and notify the reporter (${report.reporter_email}).`,
      confirmLabel: "Take Down File",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    setActiveActionId(report.id);
    try {
      await takedownMutation.mutateAsync({ id: report.id, admin_notes: "Confirmed violation via statutory review" });
      toast.success(`Report #${report.ticket_number} actioned: file disabled`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to take down reported file");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleStrikeReport = async (report: AbuseReport) => {
    const ok = await confirm({
      title: "Take Down & Strike Uploader",
      description: `This will disable the target file, add a moderation strike to the uploader (${report.uploader_email || "account"}), and restrict the account if strikes >= 3.`,
      confirmLabel: "Take Down & Strike",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    setActiveActionId(report.id);
    try {
      const res = await strikeMutation.mutateAsync({ id: report.id, admin_notes: "Malicious / repeated abuse violation" });
      toast.success(`File taken down and strike applied (Current strikes: ${res?.data?.uploader_strikes ?? 1})`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply strike");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDismissReport = async (report: AbuseReport) => {
    const ok = await confirm({
      title: "Dismiss Abuse Report",
      description: `Are you sure you want to dismiss report #${report.ticket_number}? The reported file will remain untouched.`,
      confirmLabel: "Dismiss Report",
      cancelLabel: "Cancel",
      variant: "neutral",
    });
    if (!ok) return;

    setActiveActionId(report.id);
    try {
      await dismissMutation.mutateAsync({ id: report.id, admin_notes: "Dismissed: lacks evidence or valid ownership proof" });
      toast.success(`Report #${report.ticket_number} dismissed`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to dismiss report");
    } finally {
      setActiveActionId(null);
    }
  };

  const isFetching = flaggedFetching || abuseFetching;
  const handleRefresh = () => {
    refetchFlagged();
    refetchAbuse();
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-accent-bright" /> Content Moderation
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Review AI-flagged files, inspect user abuse complaints, and enforce statutory takedowns.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-bg-surface border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] text-ink-muted font-medium">AI Flagged</p>
              <p className="text-lg font-bold text-ink">
                {statsLoading ? "..." : stats?.total_flagged ?? files.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bg-surface border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <FileWarning className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] text-ink-muted font-medium">Pending Reports</p>
              <p className="text-lg font-bold text-ink">
                {abuseLoading ? "..." : pendingReportsCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bg-surface border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] text-ink-muted font-medium">Blocked Files</p>
              <p className="text-lg font-bold text-ink">
                {statsLoading ? "..." : stats?.total_blocked ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bg-surface border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] text-ink-muted font-medium">Restricted Users</p>
              <p className="text-lg font-bold text-ink">
                {statsLoading ? "..." : stats?.restricted_users ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("flagged")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "flagged" ? "border-accent text-accent" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          AI Flagged Files ({files.length})
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "reports" ? "border-accent text-accent" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          User Abuse Reports
          {pendingReportsCount > 0 && (
            <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {pendingReportsCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content: AI Flagged Files */}
      {activeTab === "flagged" && (
        <Card className="border-border bg-bg-surface">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
              Pending AI Review Queue ({files.length})
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {flaggedLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-ink">Queue is Empty</p>
                <p className="text-[13px] text-ink-muted mt-1 max-w-sm">
                  No files are currently pending admin review. All uploads are safe.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {files.map((file) => {
                  const isWorking = activeActionId === file.id;
                  const score = file.nsfw_score ? Math.round(file.nsfw_score * 100) : 65;

                  return (
                    <div
                      key={file.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4 hover:bg-bg-elevated/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning font-semibold text-xs">
                          {file.content_type?.startsWith("image/") ? "IMG" : "DOC"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-ink truncate max-w-xs sm:max-w-md">
                              {file.filename}
                            </p>
                            <Badge
                              variant="muted"
                              className="bg-warning/10 text-warning border-warning/20 text-[11px] px-1.5 py-0"
                            >
                              NSFW Score: {score}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[12px] text-ink-muted mt-1">
                            <span>{formatBytes(file.file_size as number)}</span>
                            <span>•</span>
                            <span>{file.owner_email || file.owner_name || `User: ${file.user_id.slice(0, 8)}`}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(file.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-ink-muted hover:text-ink text-xs"
                          onClick={() => setPreviewFileId(file.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-success border-success/30 hover:bg-success/10 hover:text-success text-xs"
                          onClick={() => handleApprove(file.id, file.filename)}
                          disabled={isWorking}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve (Make Ready)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-danger border-danger/30 hover:bg-danger/10 hover:text-danger text-xs"
                          onClick={() => handleReject(file.id, file.filename)}
                          disabled={isWorking}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject &amp; Strike
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content: User Abuse Reports */}
      {activeTab === "reports" && (
        <div className="flex flex-col gap-4">
          {abuseLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <Card className="p-12 text-center bg-bg-surface border-border">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink">No Abuse Reports Registered</p>
              <p className="text-xs text-ink-muted mt-1">
                Complaints submitted via the Report Abuse center will be listed here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reports.map((report) => {
                const isWorking = activeActionId === report.id;
                const isPending = report.status === "pending";

                return (
                  <Card key={report.id} className="p-5 bg-bg-surface border-border hover:border-border-strong transition-all flex flex-col gap-4">
                    {/* Top Row: Ticket Number & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-ink">#{report.ticket_number}</span>
                        <span className="text-xs text-ink-muted">•</span>
                        <Badge
                          variant="muted"
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                            report.category === "csam" || report.category === "malware"
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              : report.category === "copyright"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                          }`}
                        >
                          {report.category}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-ink-faint font-mono">
                          {formatDateTime(report.created_at)}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-medium ${
                            report.status === "actioned_takedown"
                              ? "bg-rose-500/15 text-rose-400"
                              : report.status === "dismissed"
                              ? "bg-ink-muted/15 text-ink-muted"
                              : "bg-amber-500/15 text-amber-400 animate-pulse"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Reported Resource Context */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Box: Target File Details */}
                      <div className="bg-bg border border-border/60 rounded-md p-3.5 space-y-2.5 text-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between font-semibold text-ink border-b border-border/30 pb-1.5">
                            <span>Reported Resource</span>
                            {report.file_status && (
                              <span className="font-mono text-[10px] text-accent">Status: {report.file_status}</span>
                            )}
                          </div>
                          {report.file_name ? (
                            <div className="space-y-1 mt-2">
                              <p className="font-medium text-ink truncate">{report.file_name}</p>
                              <div className="flex items-center gap-2 text-ink-muted text-[11px]">
                                <span>{report.file_size ? formatBytes(report.file_size) : "Unknown size"}</span>
                                <span>•</span>
                                <span>{report.file_content_type || "File"}</span>
                              </div>
                              <div className="pt-1 text-[11px] text-ink-muted">
                                Uploader: <strong className="text-ink">{report.uploader_email || "N/A"}</strong>
                                {report.uploader_strikes !== undefined && (
                                  <span className="ml-2 font-mono text-rose-400">
                                    (Strikes: {report.uploader_strikes})
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 mt-2">
                              <p className="text-ink-muted text-[11px]">Reported Target URL / Shared Identifier:</p>
                              <p className="font-mono text-[11px] text-accent break-all bg-bg-elevated/40 p-2 rounded border border-border/50">
                                {report.target_url}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Interactive Preview / Inspect button inside Resource Box */}
                        <div className="pt-2 flex items-center justify-between border-t border-border/40 mt-1">
                          <span className="text-[11px] text-ink-muted font-medium">Verify Content:</span>
                          {(() => {
                            const effectiveFileId = extractFileId(report);
                            return effectiveFileId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-accent hover:text-accent-bright border-accent/40 hover:bg-accent/10 gap-1.5 font-medium"
                                onClick={() => setPreviewFileId(effectiveFileId)}
                              >
                                <Eye className="h-3.5 w-3.5" /> Inspect / Preview Media
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-ink hover:text-white border-border hover:bg-bg-elevated gap-1.5 font-medium"
                                onClick={() => window.open(report.target_url, "_blank")}
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-accent" /> Open Target Link
                              </Button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Right Box: Reporter Claim */}
                      <div className="bg-bg border border-border/60 rounded-md p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-semibold text-ink border-b border-border/30 pb-1.5">
                          <span>Reporter Claim</span>
                          <span className="text-[11px] text-ink-muted">{report.reporter_name}</span>
                        </div>
                        <p className="text-ink-muted leading-relaxed line-clamp-3">
                          {report.description}
                        </p>
                        <div className="text-[11px] text-ink-faint flex items-center justify-between pt-1">
                          <span>Official Email: <strong className="text-ink">{report.reporter_email}</strong></span>
                          {report.evidence_url && (
                            <a
                              href={report.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline flex items-center gap-1 font-mono"
                            >
                              Evidence <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes if reviewed */}
                    {report.admin_notes && (
                      <div className="bg-bg-elevated/40 border border-border/50 rounded p-2.5 text-xs text-ink-muted flex items-center justify-between">
                        <span><strong>Resolution Note:</strong> {report.admin_notes}</span>
                        {report.reviewer_email && (
                          <span className="text-[10px] font-mono text-ink-faint">Reviewer: {report.reviewer_email}</span>
                        )}
                      </div>
                    )}

                    {/* Bottom Actions Row */}
                    {isPending && (
                      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                        {(() => {
                          const effectiveFileId = extractFileId(report);
                          return effectiveFileId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-accent border-accent/40 hover:bg-accent/10 hover:text-accent-bright gap-1.5 font-medium"
                              onClick={() => setPreviewFileId(effectiveFileId)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Inspect Media
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-ink-muted hover:text-ink gap-1.5"
                              onClick={() => window.open(report.target_url, "_blank")}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-accent" /> Open Target Link
                            </Button>
                          );
                        })()}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-ink-muted hover:text-ink"
                          onClick={() => handleDismissReport(report)}
                          disabled={isWorking}
                        >
                          Dismiss Report
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={() => handleTakedownReport(report)}
                          disabled={isWorking}
                        >
                          Take Down File
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={() => handleStrikeReport(report)}
                          disabled={isWorking}
                        >
                          Take Down &amp; Strike
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* File Preview Modal for Admins */}
      <FilePreviewModal
        fileId={previewFileId}
        isOpen={!!previewFileId}
        onClose={() => setPreviewFileId(null)}
      />
    </div>
  );
}
