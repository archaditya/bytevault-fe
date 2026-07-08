"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { useFiles } from "@/services";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Globe } from "lucide-react";

export function DashboardCharts() {
  // Fetch up to 100 files to ensure we have enough shared files to display 10 rows
  const { data: filesResponse, isLoading } = useFiles({ sortBy: "date", sortDirection: "desc", limit: 100 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[480px]" />
        <Skeleton className="h-[480px]" />
      </div>
    );
  }

  const files = filesResponse?.files || [];
  const recentFiles = files.slice(0, 10);
  const sharedFiles = files.filter((f) => f.shared).slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Recent Files */}
      <Card className="bg-bg-surface border-border-strong">
        <CardHeader className="pb-3">
          <CardTitle>Recent uploads</CardTitle>
          <Link
            href="/files"
            className="flex items-center gap-1 text-[12px] text-accent-bright hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentFiles.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">No files uploaded yet.</div>
          ) : (
            <div className="flex flex-col">
              {recentFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/files/${file.id}`}
                  className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] transition-colors hover:bg-bg-overlay/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${file.thumbnailColor}1A`, color: file.thumbnailColor }}
                    >
                      <FileKindIcon kind={file.kind} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{file.name}</p>
                      <p className="text-[11px] text-ink-muted">{formatBytes(file.sizeBytes)} · {formatRelativeTime(file.uploadedAt)}</p>
                    </div>
                  </div>
                  {file.shared && (
                    <Badge variant="info" className="shrink-0 text-[10px] px-1.5 flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" /> Public
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared Files */}
      <Card className="bg-bg-surface border-border-strong">
        <CardHeader className="pb-3">
          <CardTitle>Shared files</CardTitle>
          <Link
            href="/shared"
            className="flex items-center gap-1 text-[12px] text-accent-bright hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {sharedFiles.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">No shared files yet. Share a file to see it here.</div>
          ) : (
            <div className="flex flex-col">
              {sharedFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/files/${file.id}`}
                  className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] transition-colors hover:bg-bg-overlay/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${file.thumbnailColor}1A`, color: file.thumbnailColor }}
                    >
                      <FileKindIcon kind={file.kind} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{file.name}</p>
                      <p className="text-[11px] text-ink-muted">{formatBytes(file.sizeBytes)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
