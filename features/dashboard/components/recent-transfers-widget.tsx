"use client";

import Link from "next/link";
import { useFiles } from "@/services";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileKindIcon } from "@/components/shared/file-kind-icon";
import { formatRelativeTime, formatBytes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export function RecentTransfersWidget() {
  const { data: filesResponse, isLoading } = useFiles({ sortBy: "date", sortDirection: "desc", limit: 6 });
  const recent = filesResponse?.files?.slice(0, 6) ?? [];

  return (
    <Card className="bg-bg-surface border-border-strong">
      <CardHeader className="pb-3">
        <CardTitle>Recent activity</CardTitle>
        <Link
          href="/files"
          className="flex items-center gap-1 text-[12px] text-accent-bright hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <div className="flex flex-col">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="m-3 h-12" />
            ))
          : recent.length === 0
            ? <div className="p-6 text-center text-sm text-ink-muted">No recent activity.</div>
            : recent.map((f) => (
              <Link
                key={f.id}
                href={`/files/${f.id}`}
                className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] transition-colors hover:bg-bg-overlay/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${f.thumbnailColor}1A`, color: f.thumbnailColor }}
                  >
                    <FileKindIcon kind={f.kind} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{f.name}</p>
                    <span className="text-[11px] text-ink-muted">{formatBytes(f.sizeBytes)} · {formatRelativeTime(f.uploadedAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </Card>
  );
}
