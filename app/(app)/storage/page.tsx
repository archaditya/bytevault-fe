import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

export const metadata: Metadata = {
  title: "Storage providers — PushPort",
};

export default function StoragePage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-bg-surface border-border-strong">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <HardDrive className="h-12 w-12 text-ink-faint mb-4" />
          <h2 className="text-lg font-semibold text-ink">Storage management coming soon</h2>
          <p className="mt-2 max-w-sm text-[13px] text-ink-muted">
            Multi-provider storage management, routing preferences, and usage breakdowns will be available here in a future release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
