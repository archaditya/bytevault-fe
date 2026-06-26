"use client";


import { storageProviders } from "@/lib/mock";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store";
import { UsageWidget } from "@/features/storage/components/usage-widget";

export function StorageProviderWidget() {

  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Storage usage</CardTitle>
      </CardHeader>
      <div className="p-4 pt-0">
        <UsageWidget providers={storageProviders} />
      </div>
    </Card>
  );
}
