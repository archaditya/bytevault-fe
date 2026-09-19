import { Metadata } from "next";
import { Suspense } from "react";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export const metadata: Metadata = {
  title: "Settings — PushPortVault",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded bg-bg-surface" />}>
      <SettingsTabs />
    </Suspense>
  );
}
