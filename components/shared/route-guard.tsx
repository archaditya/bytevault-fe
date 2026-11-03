"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store";

/**
 * Evaluates whether a requested pathname requires an authenticated session.
 * Only explicit user workspace & admin routes are protected.
 * All public landing pages, pricing, contact, legal, instant share, live share,
 * public downloads (/s/...), guest upload invites (/collect/:token), and 404 pages
 * are NOT protected, so unauthenticated users are never redirected to /login unexpectedly.
 */
function isProtectedPath(pathname: string): boolean {
  // /collect without token is the user's dashboard collect manager
  if (pathname === "/collect") {
    return true;
  }

  const protectedPrefixes = [
    "/dashboard",
    "/files",
    "/transfers",
    "/storage",
    "/settings",
    "/profile",
    "/analytics",
    "/admin",
    "/shared", // Note: /shared is user's dashboard link manager; /s/ is the public receiver link
  ];

  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, checkSession } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminUser = user?.role === "super_admin" || user?.role === "admin";

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

    // 1. Unauthenticated users trying to access ANY protected route
    if (!isAuthenticated) {
      if (isProtectedPath(pathname)) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // 2. Authenticated users trying to access ADMIN routes without admin privileges
    if (isAdminRoute && !isAdminUser) {
      router.push("/dashboard");
      return;
    }

    // 3. Authenticated users landing on auth pages (login/register) → redirect to dashboard/target
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    if (isAuthPage && !pathname.startsWith("/verify-email")) {
      router.push(redirectTo);
    }
    if (pathname.startsWith("/verify-email") && user?.isVerified) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, sessionChecked, user, pathname, router, isAdminRoute, isAdminUser]);

  // Public pages render immediately — no spinner, no session check delay
  if (!sessionChecked && !isProtectedPath(pathname)) {
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

  // Unauthenticated user attempting to access a protected page:
  // Render spinner and hold children unmounted while router redirects to /login
  if (!isAuthenticated && isProtectedPath(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="font-mono text-[12px] text-ink-muted">
            Redirecting to sign in...
          </span>
        </div>
      </div>
    );
  }

  // Authenticated user attempting to access an ADMIN route without admin privileges:
  // Strictly prevent children from mounting, show access denied spinner, and redirect
  if (isAuthenticated && isAdminRoute && !isAdminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-danger border-t-transparent" />
          <span className="font-mono text-[12px] text-danger font-semibold">
            Administrative privileges required. Redirecting to dashboard...
          </span>
        </div>
      </div>
    );
  }

  // Authenticated user landing on an auth page:
  // Render spinner while redirecting to dashboard / redirect target
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email");

  if (isAuthenticated && isAuthPage && (!pathname.startsWith("/verify-email") || user?.isVerified)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="font-mono text-[12px] text-ink-muted">
            Loading your workspace...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
