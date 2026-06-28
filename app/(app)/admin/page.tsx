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
} from "@/services";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
} from "lucide-react";

export default function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity">("overview");
  const [usersPage, setUsersPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  // Modal control state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Edit fields state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [editRoleId, setEditRoleId] = useState("");

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers(usersPage, 10);
  const { data: activityData, isLoading: activityLoading } = useAdminActivity(activityPage, 20);

  // Actions queries & mutations
  const { data: detailsData, isLoading: detailsLoading } = useAdminUser(selectedUserId || "");
  const { data: roles = [] } = useRoles();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();

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
    setEditRoleId(""); // will be populated from query once selectedUser details load
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
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === currentUser.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (confirm(`Are you sure you want to delete the user account: ${email}? This action is irreversible.`)) {
      try {
        await deleteUserMutation.mutateAsync(userId);
      } catch (err: any) {
        alert(err.message || "Failed to delete user");
      }
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
              <div className="flex flex-col">
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

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
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
    </div>
  );
}
