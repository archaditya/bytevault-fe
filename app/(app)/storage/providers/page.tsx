import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";

export const metadata: Metadata = {
  title: "Manage storage providers — PushPostVault",
};

export default function ProviderManagementPage() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-bg-surface border-border-strong">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Database className="h-12 w-12 text-ink-faint mb-4" />
          <h2 className="text-lg font-semibold text-ink">Provider management coming soon</h2>
          <p className="mt-2 max-w-sm text-[13px] text-ink-muted">
            Enable, disable, and configure individual storage providers here in a future release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
