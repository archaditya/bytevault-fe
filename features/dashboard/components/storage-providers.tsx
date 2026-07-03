"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuota } from "@/services";
import { formatBytes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { HardDrive } from "lucide-react";

export function StorageProviderWidget() {
  const { data: quota, isLoading } = useQuota();

  return (
    <Card className="bg-bg-surface border-border-strong">
      <CardHeader className="pb-3">
        <CardTitle>Storage usage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : quota ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink">{formatBytes(quota.used_bytes)}</span>
                  <span className="text-ink-muted">of {formatBytes(quota.total_bytes)}</span>
                </div>
                <div className="mt-2 h-2 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min(100, (quota.used_bytes / quota.total_bytes) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {formatBytes(quota.remaining_bytes)} remaining
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted text-center py-4">Unable to load storage data.</p>
        )}
      </CardContent>
    </Card>
  );
}
