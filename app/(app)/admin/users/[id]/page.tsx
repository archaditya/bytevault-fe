"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminUser, useUpdateUserMutation, useRoles } from "@/services";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { ArrowLeft, User, Activity, ShieldCheck, HardDrive, Edit2, CreditCard } from "lucide-react";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [activityPage, setActivityPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);

  const { data: userDetail, isLoading: userLoading, refetch } = useAdminUser(userId);
  const { data: roles = [] } = useRoles();
  const updateUserMutation = useUpdateUserMutation();

  // Edit fields state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [editRoleId, setEditRoleId] = useState("");
  const [editStorageLimitGb, setEditStorageLimitGb] = useState<number>(1);
  const [editMaxFileSizeMb, setEditMaxFileSizeMb] = useState<number>(100);

  // Real DB activity logs for this specific user
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["admin", "users", userId, "activity", activityPage],
    queryFn: async () => {
      const data = await apiClient(`/api/v1/admin/users/${userId}/activity?offset=${(activityPage - 1) * 20}&limit=20`);
      return {
        activities: data.activities || [],
        total: data.total || 0,
      };
    },
    enabled: !!userId,
  });

  if (userLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const u = userDetail?.user;

  const handleOpenEdit = () => {
    if (!u) return;
    setEditFirstName(u.first_name || "");
    setEditLastName(u.last_name || "");
    setEditStatus(u.status || "active");
    setEditIsVerified(u.is_verified || false);
    setEditRoleId(u.role_id || "");
    setEditStorageLimitGb((u.storage_limit_bytes || 5368709120) / (1024 * 1024 * 1024));
    setEditMaxFileSizeMb((u.max_file_size_bytes || 2147483648) / (1024 * 1024));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!u) return;
    try {
      await updateUserMutation.mutateAsync({
        id: u.id,
        first_name: editFirstName,
        last_name: editLastName,
        status: editStatus,
        is_verified: editIsVerified,
        role_id: editRoleId || undefined,
        storage_limit_bytes: Math.round(editStorageLimitGb * 1024 * 1024 * 1024),
        max_file_size_bytes: Math.round(editMaxFileSizeMb * 1024 * 1024),
      });
      toast.success("User profile updated");
      setEditOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-bold text-ink">User Profile & Activity Audit Log</h1>
        </div>
        <Button size="sm" onClick={handleOpenEdit}>
          <Edit2 className="h-4 w-4 mr-1.5" /> Edit Profile
        </Button>
      </div>

      {u && (
        <Card className="bg-bg-surface border-border-strong">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-bold">
                  {u.first_name?.[0] || u.email[0]}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || "No Name"}
                  </CardTitle>
                  <p className="text-xs text-ink-muted font-mono">{u.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={u.status === "active" ? "success" : "info"}>{u.status}</Badge>
                <Badge variant="muted">{u.role || "user"}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span>Verified: <strong>{u.is_verified ? "Yes" : "No"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-accent" />
              <span>Files: <strong>{userDetail?.total_files || 0}</strong> ({formatBytes(userDetail?.total_storage || 0)})</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-accent" />
              <span>Joined: <strong>{formatRelativeTime(u.created_at)}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription & Billing Card */}
      {u && (
        <Card className="bg-bg-surface border-border-strong">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent" /> Active Subscription &amp; Billing
            </CardTitle>
            <Badge variant="default" className="text-xs">
              {userDetail?.subscription?.package?.display_name || "Free Tier"}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-ink-muted block mb-0.5">Subscription Status</span>
              <span className="font-semibold capitalize text-emerald-400">
                {userDetail?.subscription?.status || "Active (Free)"}
              </span>
              {userDetail?.subscription?.cancel_at_cycle_end && (
                <span className="block text-[10px] text-amber-400 mt-0.5">Cancelling at cycle end</span>
              )}
            </div>

            <div>
              <span className="text-ink-muted block mb-0.5">Razorpay Gateway ID</span>
              <span className="font-mono text-ink">
                {userDetail?.subscription?.razorpay_subscription_id || "None (Direct/Free)"}
              </span>
            </div>

            <div>
              <span className="text-ink-muted block mb-0.5">Current Cycle End</span>
              <span className="text-ink font-mono">
                {userDetail?.subscription?.current_period_end 
                  ? new Date(userDetail.subscription.current_period_end).toLocaleDateString() 
                  : "Indefinite"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real DB User Activity Audit Log */}
      <Card className="bg-bg-surface border-border-strong">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" /> User Activity History
          </CardTitle>
          <span className="text-xs text-ink-muted">Total {activityData?.total || 0} events</span>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !activityData?.activities || activityData.activities.length === 0 ? (
            <div className="p-6 text-xs text-ink-muted text-center">No recorded activity logs for this user yet.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-bg-raised text-ink-faint uppercase text-[10px] font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Action</th>
                    <th className="p-3">Resource</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activityData.activities.map((act: any) => (
                    <tr key={act.id} className="hover:bg-bg-overlay/20">
                      <td className="p-3 font-semibold text-accent">{act.action}</td>
                      <td className="p-3">{act.resource_type || "N/A"}</td>
                      <td className="p-3">{act.ip_address || "Unknown"}</td>
                      <td className="p-3 text-ink-muted">{formatRelativeTime(act.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-ink-muted">Page {activityPage}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setActivityPage((p) => Math.max(1, p - 1))} disabled={activityPage === 1}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setActivityPage((p) => p + 1)} disabled={activityPage * 20 >= (activityData?.total || 0)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs pt-2">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Account Status</Label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full h-8 rounded border border-border bg-bg-raised text-xs px-2 mt-1">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <select value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)} className="w-full h-8 rounded border border-border bg-bg-raised text-xs px-2 mt-1">
                  <option value="">(Keep Current)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Storage Quota (GB)</Label>
                <Input type="number" value={editStorageLimitGb} onChange={(e) => setEditStorageLimitGb(Number(e.target.value))} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Max File Upload (MB)</Label>
                <Input type="number" value={editMaxFileSizeMb} onChange={(e) => setEditMaxFileSizeMb(Number(e.target.value))} className="h-8 text-xs mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
