"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, ShieldAlert, MessageSquare, AlertCircle } from "lucide-react";
import { apiClient, getAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type?: string;
  title: string;
  body: string;
  metadata?: {
    path?: string;
    type?: string;
    category?: string;
    [key: string]: any;
  } | null;
  is_read: boolean;
  created_at: string;
}

export function resolveNotificationPath(n: Notification): string {
  if (n.metadata?.path && typeof n.metadata.path === "string" && n.metadata.path.trim() !== "") {
    return n.metadata.path.trim();
  }

  const t = (n.type || n.metadata?.type || n.metadata?.category || "").toLowerCase();
  if (t.includes("file") || t.includes("upload")) return "/files";
  if (t.includes("transfer")) return "/transfers";
  if (t.includes("storage") || t.includes("quota")) return "/storage/usage";
  if (t.includes("sub") || t.includes("bill") || t.includes("plan") || t.includes("pricing")) return "/pricing";
  if (t.includes("security") || t.includes("settings")) return "/settings";
  if (t.includes("moderation") || t.includes("abuse") || t.includes("nsfw")) return "/admin/moderation";
  if (t.includes("contact")) return "/contact";
  if (t.includes("profile")) return "/profile";
  if (t.includes("shared") || t.includes("link")) return "/shared";

  return "/files";
}

export function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await apiClient("/api/v1/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to update notification");
    }
  };

  const handleClickNotification = async (n: Notification) => {
    if (!n.is_read) {
      await handleMarkAsRead(n.id);
    }
    const targetPath = resolveNotificationPath(n);
    if (targetPath) {
      router.push(targetPath);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient("/api/v1/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to update notifications");
    }
  };

  const renderIcon = (n: Notification) => {
    const t = n.type || n.metadata?.type || "";
    if (t.includes("abuse") || t.includes("moderation") || t.includes("nsfw")) {
      return <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />;
    }
    if (t.includes("contact")) {
      return <MessageSquare className="h-4 w-4 text-accent shrink-0 mt-0.5" />;
    }
    return <AlertCircle className="h-4 w-4 text-ink-muted shrink-0 mt-0.5" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-ink-muted hover:text-ink focus:outline-none rounded-full transition">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-bg-surface border-border-strong text-ink p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] text-accent hover:underline hover:text-accent-bright flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 text-accent animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-ink-faint gap-1">
              <Bell className="h-8 w-8 stroke-1" />
              <span className="text-[11px]">All caught up!</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`flex items-start gap-2.5 p-3 cursor-pointer transition hover:bg-bg/60 ${
                    !n.is_read ? "bg-accent/5 border-l-2 border-accent" : ""
                  }`}
                >
                  {renderIcon(n)}
                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    <span className="text-xs font-medium text-ink truncate">{n.title}</span>
                    <span className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">{n.body}</span>
                    <span className="text-[9px] text-ink-faint mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
