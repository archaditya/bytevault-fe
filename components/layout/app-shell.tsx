"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="md:pl-60">
        <Navbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
