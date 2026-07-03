"use client";

import { Card, CardContent } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

export function StoragePreferencesSection() {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Card className="bg-bg-surface border-border-strong">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <HardDrive className="h-10 w-10 text-ink-faint mb-3" />
          <h3 className="text-sm font-semibold text-ink">Storage preferences coming soon</h3>
          <p className="mt-1 text-[13px] text-ink-muted">
            Default provider selection will be configurable here in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
