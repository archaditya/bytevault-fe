"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store";
import { useAdminSharedFiles } from "@/services";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, Copy, ExternalLink, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSharedLinksPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const limit = 15;

  // Keyset / Cursor Pagination History
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  // Debounce search query to prevent database query overload
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      // Reset cursors on query change
      setCursors([undefined]);
      setPageIndex(0);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: adminData, isLoading: adminLoading, refetch, isFetching } = useAdminSharedFiles({
    search: debouncedSearch,
    cursor: cursors[pageIndex],
    limit,
  });

  const handleCopyLink = (fileId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/s/${fileId}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public URL copied to clipboard");
  };

  const handleNext = () => {
    if (adminData?.next_cursor) {
      setCursors((prev) => {
        const next = [...prev];
        next[pageIndex + 1] = adminData.next_cursor;
        return next;
      });
      setPageIndex((idx) => idx + 1);
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      setPageIndex((idx) => idx - 1);
    }
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

  const files = adminData?.files || [];

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Share2 className="h-5 w-5 text-accent-bright" /> Global Public Links
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Review and audit all active public access links active on PushPostVault. Search query runs on database.
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

      <Card className="bg-bg-surface border-border-strong">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Active Shared Files Registry</CardTitle>
          <Input
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-8 text-[13px]"
          />
        </CardHeader>
        <CardContent className="p-0">
          {adminLoading ? (
            <div className="p-6 flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : files.length === 0 ? (
            <div className="p-6 text-sm text-ink-muted text-center">No active shared links match criteria.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="flex flex-col min-w-[800px]">
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <span>File Name</span>
                  <span>Owner</span>
                  <span>Size</span>
                  <span>Shared Date</span>
                  <span className="text-right">Actions</span>
                </div>

                {files.map((file) => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const publicUrl = `${origin}/s/${file.id}`;
                  return (
                    <div
                      key={file.id}
                      className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-ink truncate" title={file.filename}>
                          {file.filename}
                        </span>
                        <span className="text-[11px] text-accent font-mono truncate">
                          /s/{file.id}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-ink truncate" title={file.owner_name}>
                          {file.owner_name || "Unknown User"}
                        </span>
                        <span className="text-[11px] text-ink-muted truncate" title={file.owner_email}>
                          {file.owner_email || "No Email"}
                        </span>
                      </div>

                      <span className="font-mono text-ink-muted">{formatBytes(Number(file.file_size))}</span>

                      <span className="text-ink-muted font-mono">{formatRelativeTime(file.created_at)}</span>

                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleCopyLink(file.id)}
                          title="Copy Public URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => window.open(publicUrl, "_blank")}
                          title="Open Link"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Keyset Cursor-Based Pagination Actions */}
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
                <span className="text-xs text-ink-muted">
                  Showing page {pageIndex + 1}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    onClick={handlePrev}
                    disabled={pageIndex === 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    onClick={handleNext}
                    disabled={!adminData?.next_cursor}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
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
