"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isLoading) {
      const isLandingPage = pathname === "/";
      const isAuthPage = pathname.startsWith("/login") || 
                         pathname.startsWith("/register") || 
                         pathname.startsWith("/forgot-password") || 
                         pathname.startsWith("/reset-password") ||
                         pathname.startsWith("/verify-email");
      const isPublicSharePage = pathname.startsWith("/s/");
      
      if (!isAuthenticated) {
        // If not authenticated, restrict access to auth pages, landing page, and public shares only
        if (!isAuthPage && !isLandingPage && !isPublicSharePage) {
          router.push("/login");
        }
      } else {
        // If authenticated
        if (!user?.isVerified) {
          // If not verified, they must verify their email first (unless they are on the verify page already)
          if (!pathname.startsWith("/verify-email")) {
            router.push(`/verify-email?email=${encodeURIComponent(user?.email || "")}`);
          }
        } else {
          // If verified, prevent accessing auth pages (including verify-email) and redirect to dashboard
          if (isAuthPage) {
            router.push("/dashboard");
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, user, pathname, router]);

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
