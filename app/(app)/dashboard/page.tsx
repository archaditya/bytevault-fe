"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
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
      <div className="w-full">
        <StorageProviderWidget />
      </div>
      <DashboardCharts />
    </div>
  );
}
