"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import {
  useSendAdminNotificationMutation,
  useAdminNotifications,
  useRoles,
} from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { BellRing, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminNotificationsPage() {
  const { user: currentUser } = useAuthStore();
  const [notificationsPage, setNotificationsPage] = useState(1);

  // Compose state
  const [targetType, setTargetType] = useState<"global" | "role" | "single">("global");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [channels, setChannels] = useState<string[]>(["in_app"]);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useAdminNotifications(notificationsPage, 20);
  const { data: roles = [] } = useRoles();
  const sendNotificationMutation = useSendAdminNotificationMutation();

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Access Denied</h2>
      </div>
    );
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (channels.length === 0) {
      toast.error("Please select at least one delivery channel.");
      return;
    }
    if (targetType === "role" && !targetRole) {
      toast.error("Please select a target role.");
      return;
    }
    if (targetType === "single" && !targetUserId) {
      toast.error("Please enter a target User ID.");
      return;
    }

    try {
      await sendNotificationMutation.mutateAsync({
        target_type: targetType,
        user_id: targetType === "single" ? targetUserId : undefined,
        role: targetType === "role" ? targetRole : undefined,
        title,
        body,
        channels,
        priority,
      });
      toast.success("Notification sent successfully!");
      setTitle("");
      setBody("");
      refetchNotifications();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch notification");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
          <BellRing className="h-5 w-5 text-accent-bright" /> System Broadcasts & Notifications
        </h1>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Send urgent updates or informational system notifications via in-app banner, browser push or Brevo email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <Card className="bg-bg-surface border-border-strong lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BellRing className="h-4 w-4 text-accent-bright" /> Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNotification} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted">Target Audience</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="global">All Active Users (Global)</option>
                  <option value="role">Target By Role</option>
                  <option value="single">Target Single User ID</option>
                </select>
              </div>

              {targetType === "role" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-ink-muted">Select User Role</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent font-sans"
                  >
                    <option value="">Choose role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "single" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-ink-muted font-sans">Target User UUID</label>
                  <Input
                    placeholder="Enter Target User UUID"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted font-sans">Delivery Channels</label>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes("in_app")}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, "in_app"]);
                        else setChannels(channels.filter((c) => c !== "in_app"));
                      }}
                      className="rounded border-border bg-bg-raised text-accent focus:ring-accent"
                    />
                    In-App Box
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer font-sans">
                    <input
                      type="checkbox"
                      checked={channels.includes("push")}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, "push"]);
                        else setChannels(channels.filter((c) => c !== "push"));
                      }}
                      className="rounded border-border bg-bg-raised text-accent focus:ring-accent"
                    />
                    FCM Push
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink cursor-pointer font-sans">
                    <input
                      type="checkbox"
                      checked={channels.includes("email")}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, "email"]);
                        else setChannels(channels.filter((c) => c !== "email"));
                      }}
                      className="rounded border-border bg-bg-raised text-accent focus:ring-accent"
                    />
                    Brevo Email
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted font-sans">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted font-sans">Subject / Title</label>
                <Input
                  placeholder="Alert heading..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 font-sans">
                <label className="text-xs font-semibold text-ink-muted">Body Message</label>
                <textarea
                  placeholder="Enter notification details..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full min-h-[90px] rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent resize-y"
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={sendNotificationMutation.isPending}>
                {sendNotificationMutation.isPending ? "Dispatching..." : "Send Notification"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History / Logs */}
        <Card className="bg-bg-surface border-border-strong lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Broadcast & Notification History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 font-sans">
            {notificationsLoading ? (
              <div className="p-6 flex flex-col gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !notificationsData?.notifications || notificationsData.notifications.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted text-center font-sans">No notifications dispatched yet.</div>
            ) : (
              <div className="flex flex-col w-full">
                <div className="w-full overflow-x-auto">
                  <div className="flex flex-col min-w-[600px]">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_2fr_1fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      <span>Dispatched Date</span>
                      <span>Recipient</span>
                      <span>Channel</span>
                      <span>Content details</span>
                      <span>Delivery status</span>
                    </div>
                    {notificationsData.notifications.map((n) => (
                      <div
                        key={n.id}
                        className="grid grid-cols-[1.5fr_1fr_1fr_2fr_1fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                      >
                        <span className="font-mono text-ink-muted">{new Date(n.created_at).toLocaleString()}</span>
                        <span className="font-mono text-ink-muted truncate" title={n.user_id}>{n.user_id.slice(0, 8)}</span>
                        <span>
                          <Badge variant="muted" className="capitalize text-[10px]">{n.channel.replace("_", " ")}</Badge>
                        </span>
                        <div className="flex flex-col gap-0.5 truncate">
                          <span className="font-semibold text-ink truncate text-xs">{n.title}</span>
                          <span className="text-ink-muted text-[11px] truncate">{n.body}</span>
                        </div>
                        <span>
                          <Badge variant={n.is_read ? "success" : "info"} className="text-[10px] px-2 py-0.5">
                            {n.is_read ? "Read" : "Sent"}
                          </Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border mt-auto">
                  <span className="text-xs text-ink-muted">
                    Total {notificationsData.total} logs
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setNotificationsPage((p) => Math.max(1, p - 1))}
                      disabled={notificationsPage === 1}
                    >
                      Previous
                  </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setNotificationsPage((p) => p + 1)}
                      disabled={notificationsPage * 20 >= notificationsData.total}
                    >
                      Next
                  </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
