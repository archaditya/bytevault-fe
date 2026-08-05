"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderClosed,
  Share2,
  Settings,
  Box,
  LogOut,
  X,
  Users,
  Files,
  BellRing,
  ScrollText,
  ArrowUpDown,
  MessageSquare,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files", label: "Files", icon: FolderClosed },
  { href: "/transfers", label: "Transfers", icon: ArrowUpDown },
  { href: "/shared", label: "Shared links", icon: Share2 },
];

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },  
  { href: "/admin/files", label: "Files", icon: Files },
  { href: "/admin/instant-shares", label: "Instant Shares", icon: Flame },
  { href: "/admin/shared", label: "Shared Links", icon: Share2 },
  { href: "/admin/contact-queries", label: "Contact Queries", icon: MessageSquare },
  { href: "/admin/notifications", label: "Notifications", icon: BellRing },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const navItems = isAdmin ? adminNavItems : userNavItems;
  const sectionLabel = isAdmin ? "Administration" : "Workspace";

  const handleNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
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
          <Link href={"/"} className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-accent">
              <Box className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-ink">ByteVault</span>
          </Link>
          
          <button 
            className="md:hidden text-ink-muted hover:text-ink"
            onClick={() => setMobileOpen?.(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="label-eyebrow px-2 pb-2">{sectionLabel}</p>
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center justify-between gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                      active
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
            {!isAdmin && (
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
            )}
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
