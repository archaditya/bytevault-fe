import React from "react";
import { RouteGuard } from "@/components/shared/route-guard";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <div className="flex min-h-screen flex-col bg-bg">
        <LandingNav />
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8 animate-fade-up">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </RouteGuard>
  );
}
