"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
import { RecentTransfersWidget } from "@/features/dashboard/components/recent-transfers-widget";
import { StorageProviderWidget } from "@/features/dashboard/components/storage-providers";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
    }
  }, [isAdmin, router]);

  if (isAdmin) {
    return null;
  }

  // Standard User Dashboard View
  return (
    <div className="flex flex-col gap-6">
      <DashboardStats />
      <DashboardCharts />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransfersWidget />
        </div>
        <StorageProviderWidget />
      </div>
    </div>
  );
}
