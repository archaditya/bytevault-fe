"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { DashboardHome } from "@/features/dashboard/components/dashboard-home";

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

  return <DashboardHome />;
}
