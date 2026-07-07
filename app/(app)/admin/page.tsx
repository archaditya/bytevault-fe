"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import {
  useAdminStats,
  useAdminUsers,
  useAdminUser,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useRoles,
  useAdminActivity,
  useSendAdminNotificationMutation,
  useAdminNotifications,
} from "@/services";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";
import {
  Users,
  Files,
  HardDrive,
  Activity,
  Shield,
  Terminal,
  Server,
  AlertTriangle,
  UserCheck,
  Eye,
  Edit2,
  Trash2,
  BellRing,
} from "lucide-react";

export default function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity" | "notifications">("overview");
  const [usersPage, setUsersPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [notificationsPage, setNotificationsPage] = useState(1);

  // Compose state
  const [targetType, setTargetType] = useState<"global" | "role" | "single">("global");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [channels, setChannels] = useState<string[]>(["in_app"]);

  // Modal control state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Delete User Confirmation Modal State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

  // Edit fields state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [editRoleId, setEditRoleId] = useState("");

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useAdminStats({ enabled: isAdmin });
  const { data: usersData, isLoading: usersLoading } = useAdminUsers(usersPage, 10);
  const { data: activityData, isLoading: activityLoading } = useAdminActivity(activityPage, 20);
  const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useAdminNotifications(notificationsPage, 20);

  // Actions queries & mutations
  const { data: detailsData, isLoading: detailsLoading } = useAdminUser(selectedUserId || "");
  const { data: roles = [] } = useRoles();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const sendNotificationMutation = useSendAdminNotificationMutation();

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Access Denied</h2>
        <p className="text-sm text-ink-muted mt-1 max-w-sm">
          You do not have the required permissions to view the Admin Console. Please contact a system administrator.
        </p>
      </div>
    );
  }

  const handleOpenDetails = (userId: string) => {
    setSelectedUserId(userId);
    setDetailsOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUserId(user.id);
    setEditFirstName(user.first_name || "");
    setEditLastName(user.last_name || "");
    setEditStatus(user.status || "active");
    setEditIsVerified(user.is_verified || false);
    setEditRoleId("");
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      await updateUserMutation.mutateAsync({
        id: selectedUserId,
        first_name: editFirstName,
        last_name: editLastName,
        status: editStatus,
        is_verified: editIsVerified,
        role_id: editRoleId || undefined,
      });
      setEditOpen(false);
      setSelectedUserId(null);
      toast.success("User updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    }
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (userId === currentUser.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    setUserToDelete({ id: userId, email });
    setDeleteConfirmOpen(true);
  };

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

  const providerColors: Record<string, string> = {
    r2: "bg-[#F38020]",
    s3: "bg-[#FF9900]",
    local: "bg-[#5E9DD2]",
  };

  const totalUsers = stats?.total_users || 0;
  const activeUsers = stats?.active_users || 0;
  const verifiedUsers = stats?.verified_users || 0;
  const activeSessions = stats?.active_sessions || 0;
  const totalFiles = stats?.total_files || 0;
  const totalStorage = stats?.total_storage || 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent-bright" /> Admin Console
        </h1>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Monitor and manage ByteVault system health, storage breakdown, users, and audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${
            activeTab === "overview"
              ? "border-accent text-accent-bright"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${
            activeTab === "users"
              ? "border-accent text-accent-bright"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Users ({totalUsers})
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${
            activeTab === "activity"
              ? "border-accent text-accent-bright"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${
            activeTab === "notifications"
              ? "border-accent text-accent-bright"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Notifications
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total Users" value={totalUsers.toLocaleString()} icon={Users} />
              <StatCard label="Total Files" value={totalFiles.toLocaleString()} icon={Files} />
              <StatCard label="Total Storage used" value={formatBytes(totalStorage)} icon={HardDrive} />
              <StatCard label="Active Sessions" value={activeSessions.toLocaleString()} icon={Activity} accent="text-live" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 bg-bg-surface border-border-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Server className="h-4 w-4 text-accent" /> Storage Consumption by Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {statsLoading ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : !stats?.provider_storage || stats.provider_storage.length === 0 ? (
                  <div className="text-sm text-ink-muted py-4 text-center">No storage activity recorded yet.</div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {stats.provider_storage.map((provider) => {
                      const percentage = totalStorage > 0 ? (provider.used_bytes / totalStorage) * 100 : 0;
                      const colorClass = providerColors[provider.provider.toLowerCase()] || "bg-accent";
                      return (
                        <div key={provider.provider} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="font-semibold text-ink capitalize">{provider.provider} Storage</span>
                            <span className="font-mono text-ink-muted">
                              {formatBytes(provider.used_bytes)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                            <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percentage}%` }} />
                          </div>
                          <div className="flex justify-between text-[11px] text-ink-faint">
                            <span>{provider.file_count} files uploaded</span>
                            <span>{provider.provider.toLowerCase() === "r2" ? "Cloudflare R2" : provider.provider.toLowerCase() === "s3" ? "Amazon S3" : "Local Storage"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-bg-surface border-border-strong">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-accent" /> Platform User Health
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {statsLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="flex flex-col gap-4 text-[13px]">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <span className="text-ink-muted">Active Users</span>
                      <span className="font-mono font-semibold text-ink">{activeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <span className="text-ink-muted">Verified Accounts</span>
                      <span className="font-mono font-semibold text-ink">{verifiedUsers}</span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-ink-muted">Verification Rate</span>
                      <span className="font-mono font-semibold text-ink">
                        {totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <Card className="bg-bg-surface border-border-strong">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Registered Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="p-6 flex flex-col gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !usersData?.users || usersData.users.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted text-center">No users registered on the platform.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <div className="flex flex-col min-w-[800px]">
                  <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_1.2fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Joined Date</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {usersData.users.map((u) => {
                    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "No Name Provided";
                    return (
                      <div
                        key={u.id}
                        className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_1.2fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                      >
                        <span className="font-medium text-ink truncate">{name}</span>
                        <span className="text-ink-muted truncate font-mono">{u.email}</span>
                        <span>
                          <Badge variant="muted" className="text-[10px] capitalize px-1.5 py-0.2">
                            {u.role || "user"}
                          </Badge>
                        </span>
                        <span>
                          <Badge variant={u.status === "active" ? "success" : "info"} className="text-[10px] px-1.5 py-0.2">
                            {u.status}
                          </Badge>
                        </span>
                        <span className="text-ink-muted font-mono">{formatRelativeTime(u.created_at)}</span>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenDetails(u.id)} title="View Details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenEdit(u)} title="Edit User">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-danger hover:bg-danger/10 hover:text-danger" onClick={() => handleDeleteUser(u.id, u.email)} title="Delete User">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border mt-auto w-full">
                  <span className="text-xs text-ink-muted">
                    Total {usersData.total} users
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setUsersPage((p) => p + 1)}
                      disabled={usersPage * 10 >= usersData.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Logs Tab */}
      {activeTab === "activity" && (
        <Card className="bg-bg-surface border-border-strong">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-accent" /> System Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityLoading ? (
              <div className="p-6 flex flex-col gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !activityData?.logs || activityData.logs.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted text-center">No system events logged.</div>
            ) : (
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      <span>Timestamp</span>
                      <span>User ID</span>
                      <span>Action</span>
                      <span>Resource</span>
                      <span>IP Address</span>
                      <span>Extra Details</span>
                    </div>
                    {activityData.logs.map((log) => (
                      <div
                        key={log.id}
                        className="grid grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_1.5fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                      >
                        <span className="font-mono text-ink-muted truncate">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <span className="font-mono text-ink-muted truncate" title={log.user_id || "System"}>
                          {log.user_id ? log.user_id.slice(0, 8) : "System"}
                        </span>
                        <span>
                          <Badge variant="info" className="font-mono text-[10px]">
                            {log.action}
                          </Badge>
                        </span>
                        <span className="truncate">
                          {log.resource_type ? `${log.resource_type}:` : ""}
                          <span className="font-mono text-[12px] text-ink-muted">
                            {log.resource_id ? log.resource_id.slice(0, 8) : "—"}
                          </span>
                        </span>
                        <span className="font-mono text-ink-muted">{log.ip_address || "—"}</span>
                        <span className="text-ink-faint truncate max-w-xs font-mono text-[11px]" title={JSON.stringify(log.metadata)}>
                          {log.metadata ? JSON.stringify(log.metadata) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
                  <span className="text-xs text-ink-muted">
                    Total {activityData.total} logs
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActivityPage((p) => p + 1)}
                      disabled={activityPage * 20 >= activityData.total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
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
                      className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
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
                    <label className="text-xs font-semibold text-ink-muted">Target User UUID</label>
                    <Input
                      placeholder="Enter Target User UUID"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-ink-muted">Delivery Channels</label>
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
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
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
                    <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
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
                  <label className="text-xs font-semibold text-ink-muted">Priority Level</label>
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
                  <label className="text-xs font-semibold text-ink-muted">Subject / Title</label>
                  <Input
                    placeholder="Alert heading..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
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
            <CardContent className="p-0">
              {notificationsLoading ? (
                <div className="p-6 flex flex-col gap-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : !notificationsData?.notifications || notificationsData.notifications.length === 0 ? (
                <div className="p-6 text-sm text-ink-muted text-center">No notifications dispatched yet.</div>
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
      )}

      {/* User Details Modal */}
      {detailsOpen && (
        <Dialog open onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
            <DialogHeader>
              <DialogTitle>User Profile Details</DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : detailsData ? (
              <div className="flex flex-col gap-4 py-3 text-[13px]">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">User ID</span>
                  <span className="font-mono font-semibold">{detailsData.user.id}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Full Name</span>
                  <span className="font-semibold">
                    {[detailsData.user.first_name, detailsData.user.last_name].filter(Boolean).join(" ") || "No Name Provided"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Email Address</span>
                  <span className="font-mono font-semibold">{detailsData.user.email}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Assigned Role</span>
                  <span className="capitalize font-semibold">{detailsData.user.role || "user"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Account Status</span>
                  <span>
                    <Badge variant={detailsData.user.status === "active" ? "success" : "info"} className="capitalize">
                      {detailsData.user.status}
                    </Badge>
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Email Verified</span>
                  <Badge variant={detailsData.user.is_verified ? "info" : "muted"}>
                    {detailsData.user.is_verified ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Total Uploaded Files</span>
                  <span className="font-mono font-semibold">{detailsData.total_files.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Total Storage Utilized</span>
                  <span className="font-mono font-semibold">{formatBytes(detailsData.total_storage)}</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-ink-muted">Joined Date</span>
                  <span className="font-mono font-semibold">{new Date(detailsData.user.created_at).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-ink-muted text-center py-4">Failed to fetch user details.</div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setDetailsOpen(false)} size="sm">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      {editOpen && (
        <Dialog open onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editFirstName" className="text-xs font-semibold text-ink-muted">First Name</label>
                  <Input
                    id="editFirstName"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editLastName" className="text-xs font-semibold text-ink-muted">Last Name</label>
                  <Input
                    id="editLastName"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted">Assigned System Role</label>
                <select
                  className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                >
                  <option value="">No Change (Current: {detailsData?.user?.role || "user"})</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.description})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-muted">Account Status</label>
                <select
                  className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="editIsVerified"
                  checked={editIsVerified}
                  onChange={(e) => setEditIsVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-bg-raised text-accent focus:ring-accent"
                />
                <label htmlFor="editIsVerified" className="text-[13px] font-medium text-ink">
                  Verify User Email Address
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} size="sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending} size="sm">
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmOpen && userToDelete && (
        <Dialog open onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md bg-bg-surface border-border-strong text-ink">
            <DialogHeader>
              <DialogTitle className="text-danger flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Delete User Account
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-[13px] text-ink-muted">
              Are you sure you want to delete the user account <span className="font-semibold text-ink">{userToDelete.email}</span>? This action is irreversible.
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setDeleteConfirmOpen(false)} size="sm">
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={async () => {
                  try {
                    await deleteUserMutation.mutateAsync(userToDelete.id);
                    toast.success("User account soft-deleted successfully!");
                    setDeleteConfirmOpen(false);
                    setUserToDelete(null);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to delete user");
                  }
                }}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
