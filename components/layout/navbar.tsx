"use client";

import { useState } from "react";
import { Search, Upload, Bell, Loader2, Menu, Settings, LogOut, User } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store";
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

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const uploadMutation = useUploadFileMutation();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const title =
    Object.entries(titleMap).find(([path]) => pathname.startsWith(path))?.[1] ?? "ByteVault";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-bg/95 px-4 backdrop-blur-sm md:px-6">
      <UploadModal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen} />
      
      {/* Mobile Menu Toggle */}
      <div className="flex items-center md:hidden">
        <Button size="icon" variant="ghost" onClick={onMenuClick} aria-label="Open Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <h1 className="text-[15px] font-semibold text-ink whitespace-nowrap">{title}</h1>

      <div className="hidden flex-1 items-center lg:flex">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <Input placeholder="Search files, transfers..." className="pl-8 bg-bg-surface" />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Desktop upload button */}
        <Button
          size="sm"
          variant="primary"
          className="hidden sm:inline-flex"
          onClick={() => setIsUploadModalOpen(true)}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </Button>

        {/* Mobile upload button — visible only on small screens */}
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

        <Button size="icon" variant="ghost" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

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
          <DropdownMenuContent align="end" className="w-48 bg-bg-surface border-border-strong">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-ink truncate">{user?.name || "User"}</p>
              <p className="text-xs text-ink-muted truncate">{user?.email || ""}</p>
            </div>
            <DropdownMenuItem asChild className="cursor-pointer hover:bg-bg-overlay">
              <Link href="/settings" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer hover:bg-bg-overlay">
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-danger hover:bg-danger/10 flex items-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
