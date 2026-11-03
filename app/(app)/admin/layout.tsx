"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/admin");
    } else if (!isAdmin) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20 text-danger mb-4 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-ink mb-1">Restricted Admin Console</h1>
        <p className="text-xs text-ink-muted max-w-sm mb-6 leading-relaxed">
          You do not have administrative privileges to access this console. Unauthorized access attempts are audited.
        </p>
        <Button asChild size="sm" variant="secondary">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
