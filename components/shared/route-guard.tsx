"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store";

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/instant") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/subscription-policy")
  );
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, checkSession } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    checkSession().finally(() => setSessionChecked(true));
  }, [checkSession]);

  useEffect(() => {
    if (!sessionChecked) return;

    const isAuthPage =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/verify-email");

    if (!isAuthenticated) {
      if (!isPublicPath(pathname)) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get("redirect") || "/dashboard";

      // Verified user hitting any auth page → redirect target
      if (isAuthPage && !pathname.startsWith("/verify-email")) {
        router.push(redirectTo);
      }
      // Verified user on verify-email → redirect target
      if (pathname.startsWith("/verify-email") && user?.isVerified) {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, sessionChecked, user, pathname, router]);

  // Public pages render immediately — no spinner
  if (!sessionChecked && isPublicPath(pathname)) {
    return <>{children}</>;
  }

  // Protected pages wait for session check
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="font-mono text-[12px] text-ink-muted">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
