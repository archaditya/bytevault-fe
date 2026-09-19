import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics — PushPostVault",
};

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-bg-surface border-border-strong">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-ink-faint mb-4" />
          <h2 className="text-lg font-semibold text-ink">Analytics coming soon</h2>
          <p className="mt-2 max-w-sm text-[13px] text-ink-muted">
            Detailed upload/download trends, storage growth, and provider performance metrics will be available here once the analytics pipeline is implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
