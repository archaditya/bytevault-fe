"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import { useFiles, useAdminSharedFiles } from "@/services";
import { ShareLinkCard } from "@/features/shared/components/share-link-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Share2, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { SharedLink } from "@/types";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SharedLinksPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const [adminPage, setAdminPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 15;

  // Query custom admin/user hooks
  const { data: userData, isLoading: userLoading } = useFiles({ limit: 100 });
  const { data: adminData, isLoading: adminLoading, refetch, isFetching } = useAdminSharedFiles(adminPage, limit);

  const handleCopyLink = (fileId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/s/${fileId}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public URL copied to clipboard");
  };

  // If Admin role, render Global Shared Links dashboard table
  if (isAdmin) {
    const files = adminData?.files || [];
    const total = adminData?.total || 0;

    const filteredFiles = files.filter(f =>
      f.filename.toLowerCase().includes(search.toLowerCase()) ||
      f.user_id.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
              <Share2 className="h-5 w-5 text-accent-bright" /> Global Public Links
            </h1>
            <p className="text-[13px] text-ink-muted mt-0.5">
              Review and audit all active public access links active on ByteVault.
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
            <CardTitle className="text-sm font-semibold">Active Public Links ({total})</CardTitle>
            <Input
              placeholder="Search filename or owner ID..."
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
            ) : filteredFiles.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted text-center">No active shared links.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <div className="flex flex-col min-w-[800px]">
                  <div className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    <span>File Name</span>
                    <span>Owner ID</span>
                    <span>Size</span>
                    <span>Shared Date</span>
                    <span className="text-right">Actions</span>
                  </div>

                  {filteredFiles.map((file) => {
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

                        <span className="text-ink-muted font-mono truncate" title={file.user_id}>
                          {file.user_id.slice(0, 8)}...
                        </span>

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

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
                  <span className="text-xs text-ink-muted">
                    Showing {filteredFiles.length} of {total} shared links
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                      disabled={adminPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAdminPage((p) => p + 1)}
                      disabled={adminPage * limit >= total}
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

  // Standard User Workspace Shared links view
  if (userLoading) {
    return <div className="text-[13px] text-ink-muted">Loading shared links...</div>;
  }

  const sharedFiles = userData?.files?.filter(f => f.shared) || [];

  const links: SharedLink[] = sharedFiles.map(f => ({
    id: f.id,
    fileId: f.id,
    fileName: f.name,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${f.id}`,
    createdAt: f.uploadedAt,
    expiresAt: null,
    passwordProtected: false,
    downloadLimit: null,
    downloadCount: f.downloads || 0,
    views: 0,
    active: true,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">
          {links.length} active shared links.
        </p>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> Create link
        </Button>
      </div>
      {links.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-ink-muted">
          No shared links found. Share a file to see it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <ShareLinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
