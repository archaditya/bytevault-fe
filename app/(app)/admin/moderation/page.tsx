"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import {
  useAdminFlaggedFiles,
  useAdminModerationStats,
  useApproveFlaggedFile,
  useRejectFlaggedFile,
} from "@/services";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
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
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminModerationPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useAdminModerationStats();
  const { data, isLoading, refetch, isFetching } = useAdminFlaggedFiles();

  const approveMutation = useApproveFlaggedFile();
  const rejectMutation = useRejectFlaggedFile();

  const [activeFileId, setActiveFileId] = useState<string | null>(null);

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

  const files = data?.files || [];

  const handleApprove = async (id: string, name: string) => {
    setActiveFileId(id);
    try {
      await approveMutation.mutateAsync(id);
      toast.success(`"${name}" approved and marked READY`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve file");
    } finally {
      setActiveFileId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to reject "${name}"? This will delete the file and apply a strike to the user.`)) {
      return;
    }
    setActiveFileId(id);
    try {
      await rejectMutation.mutateAsync(id);
      toast.success(`"${name}" rejected and removed`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject file");
    } finally {
      setActiveFileId(null);
    }
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
            Review AI-flagged files, inspect false positives, and approve or reject content.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => refetch()}
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
              <p className="text-[12px] text-ink-muted font-medium">Pending Review</p>
              <p className="text-lg font-bold text-ink">
                {statsLoading ? "..." : stats?.total_flagged ?? files.length}
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

        <Card className="p-4 bg-bg-surface border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[12px] text-ink-muted font-medium">Pending Appeals</p>
              <p className="text-lg font-bold text-ink">
                {statsLoading ? "..." : stats?.pending_appeals ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Flagged Files Table */}
      <Card className="border-border bg-bg-surface">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-ink flex items-center gap-2">
              Pending Review Queue ({files.length})
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
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
                const isWorking = activeFileId === file.id;
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
                        className="h-8 gap-1.5 text-success border-success/30 hover:bg-success/10 hover:text-success"
                        onClick={() => handleApprove(file.id, file.filename)}
                        disabled={isWorking}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve (Make Ready)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
                        onClick={() => handleReject(file.id, file.filename)}
                        disabled={isWorking}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject & Strike
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
