"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store";
import {
  useAdminUsers,
  useAdminUser,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useRoles,
} from "@/services";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";
import {
  Users,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [usersPage, setUsersPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const router = useRouter();

  // Debounce search query to prevent DB query storm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setUsersPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

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
  const [editStorageLimitGb, setEditStorageLimitGb] = useState<number>(1);
  const [editMaxFileSizeMb, setEditMaxFileSizeMb] = useState<number>(100);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const { data: usersData, isLoading: usersLoading } = useAdminUsers({
    page: usersPage,
    limit: 10,
    search: debouncedSearch,
    status: statusFilter,
    role: roleFilter,
  });
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
    setEditStorageLimitGb(
      user.storage_limit_bytes ? Math.round(user.storage_limit_bytes / (1024 * 1024 * 1024)) : 1
    );
    setEditMaxFileSizeMb(
      user.max_file_size_bytes ? Math.round(user.max_file_size_bytes / (1024 * 1024)) : 100
    );
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
        storage_limit_bytes: editStorageLimitGb * 1024 * 1024 * 1024,
        max_file_size_bytes: editMaxFileSizeMb * 1024 * 1024,
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
          <Users className="h-5 w-5 text-accent-bright" /> Platform Users
        </h1>
        <p className="text-[13px] text-ink-muted mt-0.5">
          View, details-check, update roles, verify, suspend or remove registered user profiles.
        </p>
      </div>

      <Card className="bg-bg-surface border-border-strong">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-sm font-semibold font-sans">Registered Users</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-8 text-[13px]"
            />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setUsersPage(1);
              }}
              className="h-8 rounded-md border border-border bg-bg-raised px-2.5 text-[13px] text-ink outline-none focus:border-accent"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setUsersPage(1);
              }}
              className="h-8 rounded-md border border-border bg-bg-raised px-2.5 text-[13px] text-ink outline-none focus:border-accent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
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
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.2fr_1.2fr] gap-4 items-center bg-bg-raised border-y border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Plan</span>
                  <span>Status</span>
                  <span>Joined Date</span>
                  <span className="text-right">Actions</span>
                </div>
                {usersData.users.map((u) => {
                  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "No Name Provided";
                  return (
                    <div
                      key={u.id}
                      className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.2fr_1.2fr] gap-4 items-center border-b border-border px-4 py-3 text-[13px] hover:bg-bg-overlay/20 transition-colors"
                    >
                      <span className="font-medium text-ink truncate">{name}</span>
                      <span className="text-ink-muted truncate font-mono">{u.email}</span>
                      <span>
                        <Badge variant="muted" className="text-[10px] capitalize px-1.5 py-0.2">
                          {u.role || "user"}
                        </Badge>
                      </span>
                      <span>
                        <Badge variant="default" className="text-[10px] font-semibold px-2 py-0.5">
                          {u.package_name || "Free"}
                        </Badge>
                      </span>
                      <span>
                        <Badge variant={u.status === "active" ? "success" : "info"} className="text-[10px] px-1.5 py-0.2">
                          {u.status}
                        </Badge>
                      </span>
                      <span className="text-ink-muted font-mono">{formatRelativeTime(u.created_at)}</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => router.push(`/admin/users/${u.id}`)}
                          title="View User Details & Activity History"
                        >
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
                  <span className="text-ink-muted">Storage Limit</span>
                  <span className="font-mono font-semibold">
                    {detailsData.user.storage_limit_bytes
                      ? `${Math.round(detailsData.user.storage_limit_bytes / (1024 * 1024 * 1024))} GB`
                      : "5 GB"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-ink-muted">Max File Size</span>
                  <span className="font-mono font-semibold">
                    {detailsData.user.max_file_size_bytes
                      ? `${Math.round(detailsData.user.max_file_size_bytes / (1024 * 1024 * 1024))} GB`
                      : "2 GB"}
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="editStorageLimitGb" className="text-xs font-semibold text-ink-muted font-sans">
                  Storage Quota Limit (GB)
                </label>
                <Input
                  id="editStorageLimitGb"
                  type="number"
                  min={1}
                  max={2000}
                  value={editStorageLimitGb}
                  onChange={(e) => setEditStorageLimitGb(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="editMaxFileSizeMb" className="text-xs font-semibold text-ink-muted font-sans">
                  Max File Upload Size (MB)
                </label>
                <Input
                  id="editMaxFileSizeMb"
                  type="number"
                  min={1}
                  max={5120}
                  value={editMaxFileSizeMb}
                  onChange={(e) => setEditMaxFileSizeMb(Number(e.target.value))}
                />
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
