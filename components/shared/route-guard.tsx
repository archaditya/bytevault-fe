"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isLoading) {
      const isLandingPage = pathname === "/";
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
      const isPublicSharePage = pathname.startsWith("/s/") || pathname.startsWith("/shared/");
      
      if (!isAuthenticated && !isAuthPage && !isLandingPage && !isPublicSharePage) {
        router.push("/login");
      } else if (isAuthenticated && isAuthPage) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="font-mono text-[12px] text-ink-muted">Verifying session...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
