"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderClosed,
  Share2,
  Settings,
  Box,
  Shield,
  LogOut,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const activeNavItems = isAdmin
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/files", label: "Files", icon: FolderClosed },
        { href: "/admin", label: "Admin Console", icon: Shield },
        { href: "/shared", label: "Shared links", icon: Share2 },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/files", label: "Files", icon: FolderClosed },
        { href: "/shared", label: "Shared links", icon: Share2 },
      ];

  const handleNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen?.(false)} 
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-bg-surface transition-transform duration-300 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-accent">
              <Box className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-ink">ByteVault</span>
          </div>
          
          <button 
            className="md:hidden text-ink-muted hover:text-ink"
            onClick={() => setMobileOpen?.(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="label-eyebrow px-2 pb-2">Workspace</p>
          <ul className="flex flex-col gap-0.5">
            {activeNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center justify-between gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent-bright"
                        : "text-ink-muted hover:bg-bg-overlay hover:text-ink"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="label-eyebrow px-2 pb-2 pt-6">Account</p>
          <ul className="flex flex-col gap-0.5">
            <li>
              <Link
                href="/settings"
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  pathname.startsWith("/settings")
                    ? "bg-accent/10 text-accent-bright"
                    : "text-ink-muted hover:bg-bg-overlay hover:text-ink"
                )}
              >
                <Settings className="h-[15px] w-[15px]" strokeWidth={2} />
                Settings
              </Link>
            </li>
            <li>
              <button
                onClick={() => logout()}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-danger/10 hover:text-danger transition-colors text-left"
              >
                <LogOut className="h-[15px] w-[15px]" strokeWidth={2} />
                Logout
              </button>
            </li>
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-sm px-2 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-live rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="font-mono text-[11px] text-ink-faint">All systems operational</span>
          </div>
        </div>
      </aside>
    </>
  );
}
