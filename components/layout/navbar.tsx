"use client";

import { useState } from "react";
import { Search, Upload, Loader2, Menu, Settings, LogOut, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/shared/notification-bell";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store";
import { useFilesStore } from "@/store";
import { useUploadFileMutation } from "@/services";
import { UploadModal } from "@/components/shared/upload-modal";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/files": "Files",
  "/transfers": "Transfers",
  "/storage": "Storage providers",
  "/shared": "Shared links",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/profile": "Profile",
};

import { GlobalSearch } from "@/components/shared/global-search";

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const uploadMutation = useUploadFileMutation();

  const title = titleMap[pathname] || (pathname.startsWith("/admin") ? "Admin Console" : "PushPortVault");
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden text-ink-muted hover:text-ink transition-colors"
          aria-label="Toggle Navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-[14px] font-semibold text-ink whitespace-nowrap">{title}</h1>
      </div>

      {/* Global Live Autocomplete Search Bar */}
      <GlobalSearch />

      <div className="flex items-center gap-2 shrink-0">
        {/* Desktop upload button */}
        {!isAdmin && (
          <Button
            size="sm"
            variant="primary"
            className="hidden sm:flex gap-1.5 items-center"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload File
          </Button>
        )}

        {/* Mobile upload button */}
        {!isAdmin && (
          <Button
            size="icon"
            variant="primary"
            className="sm:hidden"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={uploadMutation.isPending}
            aria-label="Upload file"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Dynamic Notification Bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none rounded-full ring-offset-bg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
              <Avatar className="cursor-pointer">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback>{user?.avatar || "ME"}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-bg-surface border-border-strong text-ink">
            <div className="px-2 py-1.5">
              <p className="text-[13px] font-semibold text-ink">{user?.name}</p>
              <p className="text-[11px] text-ink-muted truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex w-full items-center gap-2 text-[13px]">
                <User className="h-4 w-4 text-ink-muted" /> Profile settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex w-full items-center gap-2 text-[13px]">
                <Settings className="h-4 w-4 text-ink-muted" /> System Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => logout()}
              className="text-danger focus:bg-danger/10 focus:text-danger flex items-center gap-2 text-[13px] cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isAdmin && (
        <UploadModal 
          open={isUploadModalOpen} 
          onOpenChange={setIsUploadModalOpen} 
        />
      )}
    </header>
  );
}
