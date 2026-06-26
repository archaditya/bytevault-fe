import { Metadata } from "next";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
import { RecentTransfersWidget } from "@/features/dashboard/components/recent-transfers-widget";
import { StorageProviderWidget } from "@/features/dashboard/components/storage-providers";

export const metadata: Metadata = {
  title: "Dashboard — ByteVault",
};

export default function DashboardPage() {
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
