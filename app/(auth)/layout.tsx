import React from "react";
import { RouteGuard } from "@/components/shared/route-guard";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 animate-fade-up">
          {children}
        </div>
      </div>
    </RouteGuard>
  );
}
