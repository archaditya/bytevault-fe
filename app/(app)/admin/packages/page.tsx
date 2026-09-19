"use client";

import { useState } from "react";
import { useAuthStore } from "@/store";
import { 
  usePackages, 
  useAdminCreatePackage, 
  useAdminUpdatePackage, 
  useAdminDeletePackage,
  useAdminSubscriptions,
  useAdminCancelSubscription,
  useAdminAssignSubscription,
  useAdminTransactions,
  useAdminSubscriptionLogs,
  useAdminSystemLogs
} from "@/services/subscription.service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  HardDrive, 
  FileUp, 
  Sparkles,
  Users,
  Receipt,
  ScrollText,
  Search,
  FileText,
  Server,
  Cloud,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  UserPlus,
  ExternalLink,
  Code
} from "lucide-react";
import { Package, Subscription, Transaction, SubscriptionAuditLog } from "@/types/subscription";
import toast from "react-hot-toast";

function formatBytes(bytes: number) {
  if (!bytes) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(0)} GB`;
}

interface PackageFormData {
  id?: string;
  name: string;
  display_name: string;
  description: string;
  storage_gb: number;
  max_file_gb: number;
  price_inr: number;
  gst_rate: number;
  billing_period: string;
  sort_order: number;
  is_active: boolean;
}

const defaultFormData: PackageFormData = {
  name: "",
  display_name: "",
  description: "",
  storage_gb: 50,
  max_file_gb: 5,
  price_inr: 149,
  gst_rate: 18,
  billing_period: "monthly",
  sort_order: 2,
  is_active: true,
};

export default function AdminPackagesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"packages" | "subscriptions" | "transactions" | "logs">("packages");

  // Packages state & mutations
  const { data: packages, isLoading: packagesLoading } = usePackages();
  const createMut = useAdminCreatePackage();
  const updateMut = useAdminUpdatePackage();
  const deleteMut = useAdminDeletePackage();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<PackageFormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);

  // Subscriptions management state & mutations
  const [subStatusFilter, setSubStatusFilter] = useState<string>("");
  const [subSearch, setSubSearch] = useState<string>("");
  const { data: subsData, isLoading: subsLoading } = useAdminSubscriptions(subStatusFilter);
  const cancelSubMut = useAdminCancelSubscription();
  const assignSubMut = useAdminAssignSubscription();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignPackageId, setAssignPackageId] = useState("");
  const [assignDays, setAssignDays] = useState(30);
  const [cancellingSub, setCancellingSub] = useState<Subscription | null>(null);

  // Transactions state
  const { data: txnsData, isLoading: txnsLoading } = useAdminTransactions(50, 0);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Audit Logs state
  const { data: logsData, isLoading: logsLoading } = useAdminSubscriptionLogs(50, 0);
  const { data: systemLogsData, isLoading: systemLogsLoading } = useAdminSystemLogs();
  const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Access Denied</h2>
        <p className="text-sm text-ink-muted mt-1 max-w-sm">
          You do not have permission to manage subscriptions and billing.
        </p>
      </div>
    );
  }

  // --- Package Handlers ---
  const handleOpenCreate = () => {
    setFormData(defaultFormData);
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (pkg: Package) => {
    setFormData({
      id: pkg.id,
      name: pkg.name,
      display_name: pkg.display_name,
      description: pkg.description || "",
      storage_gb: Math.round(pkg.storage_limit_bytes / (1024 * 1024 * 1024)),
      max_file_gb: Math.round(pkg.max_file_size_bytes / (1024 * 1024 * 1024)),
      price_inr: Math.round(pkg.price_paise / 100),
      gst_rate: pkg.gst_rate || 18,
      billing_period: pkg.billing_period || "monthly",
      sort_order: pkg.sort_order || 1,
      is_active: pkg.is_active,
    });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.display_name) {
      toast.error("Package name and display name are required");
      return;
    }

    const payload: any = {
      name: formData.name.toLowerCase().trim(),
      display_name: formData.display_name.trim(),
      description: formData.description.trim(),
      price_paise: Math.round(formData.price_inr * 100),
      price_with_gst_paise: Math.round(formData.price_inr * 100),
      gst_rate: Number(formData.gst_rate) || 18,
      currency: "INR",
      billing_period: formData.billing_period,
      storage_limit_bytes: Number(formData.storage_gb) * 1024 * 1024 * 1024,
      max_file_size_bytes: Number(formData.max_file_gb) * 1024 * 1024 * 1024,
      sort_order: Number(formData.sort_order) || 1,
      is_active: formData.is_active,
      features: {
        storage_gb: Number(formData.storage_gb),
        max_file_gb: Number(formData.max_file_gb),
        instant_sharing: true,
        encrypted_transfers: true,
      },
    };

    try {
      if (isEditing && formData.id) {
        await updateMut.mutateAsync({ id: formData.id, ...payload });
        toast.success(`Package "${formData.display_name}" updated successfully`);
      } else {
        await createMut.mutateAsync(payload);
        toast.success(`Package "${formData.display_name}" created and synced with Razorpay!`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save package");
    }
  };

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${pkg.display_name}"?`)) {
      return;
    }
    try {
      await deleteMut.mutateAsync(pkg.id);
      toast.success(`Package "${pkg.display_name}" deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete package");
    }
  };

  const handleCreateDefaultPresets = async () => {
    const presets = [
      {
        name: "free",
        display_name: "Free",
        description: "Essential cloud storage for personal use",
        storage_gb: 5,
        max_file_gb: 2,
        price_inr: 0,
        gst_rate: 18,
        sort_order: 1,
      },
      {
        name: "pro",
        display_name: "Pro",
        description: "Expanded storage for power users and creators",
        storage_gb: 50,
        max_file_gb: 5,
        price_inr: 149,
        gst_rate: 18,
        sort_order: 2,
      },
      {
        name: "premium",
        display_name: "Premium",
        description: "High-capacity storage with massive single-file uploads",
        storage_gb: 200,
        max_file_gb: 20,
        price_inr: 499,
        gst_rate: 18,
        sort_order: 3,
      },
    ];

    let createdCount = 0;
    for (const p of presets) {
      const exists = packages?.some((existing) => existing.name === p.name);
      if (exists) continue;

      try {
        await createMut.mutateAsync({
          name: p.name,
          display_name: p.display_name,
          description: p.description,
          price_paise: p.price_inr * 100,
          price_with_gst_paise: p.price_inr * 100,
          gst_rate: p.gst_rate,
          currency: "INR",
          billing_period: "monthly",
          storage_limit_bytes: p.storage_gb * 1024 * 1024 * 1024,
          max_file_size_bytes: p.max_file_gb * 1024 * 1024 * 1024,
          sort_order: p.sort_order,
          is_active: true,
          features: {
            storage_gb: p.storage_gb,
            max_file_gb: p.max_file_gb,
            instant_sharing: true,
          },
        });
        createdCount++;
      } catch (err: any) {
        console.error("Preset creation error:", err);
      }
    }

    if (createdCount > 0) {
      toast.success(`Created ${createdCount} standard packages with Razorpay plans!`);
    } else {
      toast("Standard packages are already configured.");
    }
  };

  // --- Subscription Action Handlers ---
  const handleForceCancel = async () => {
    if (!cancellingSub) return;
    try {
      await cancelSubMut.mutateAsync(cancellingSub.id);
      toast.success(`Subscription cancelled immediately and user reset to Free tier.`);
      setCancellingSub(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription");
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId.trim() || !assignPackageId) {
      toast.error("User ID and Package are required");
      return;
    }
    try {
      await assignSubMut.mutateAsync({
        userId: assignUserId.trim(),
        packageId: assignPackageId,
        durationDays: Number(assignDays) || 30,
      });
      toast.success("Subscription assigned successfully!");
      setAssignModalOpen(false);
      setAssignUserId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign subscription");
    }
  };

  const filteredSubs = (subsData?.data || []).filter((sub) => {
    if (!subSearch.trim()) return true;
    const query = subSearch.toLowerCase();
    return (
      sub.user_email?.toLowerCase().includes(query) ||
      sub.user_name?.toLowerCase().includes(query) ||
      sub.razorpay_subscription_id?.toLowerCase().includes(query) ||
      sub.package?.name?.toLowerCase().includes(query)
    );
  });

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).replace(/\//g, "-");

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent-bright" />
            Subscription &amp; Billing Command Center
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Administer pricing packages, active subscriber lifecycles, transaction records, and monitoring logs.
          </p>
        </div>

        {/* Tab-specific actions */}
        <div className="flex items-center gap-2">
          {activeTab === "packages" && (
            <>
              {(!packages || packages.length === 0) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCreateDefaultPresets}
                  disabled={createMut.isPending}
                  className="text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  Preset Standard Tiers
                </Button>
              )}
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleOpenCreate}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Package
              </Button>
            </>
          )}

          {activeTab === "subscriptions" && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => {
                if (packages && packages.length > 0) {
                  setAssignPackageId(packages[0].id);
                }
                setAssignModalOpen(true);
              }}
              className="text-xs"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Assign Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 text-xs">
        <button
          onClick={() => setActiveTab("packages")}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "packages"
              ? "border-accent text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Packages &amp; Tiers
          {packages && packages.length > 0 && (
            <span className="ml-1 rounded-full bg-bg-surface border border-border px-1.5 py-0.2 text-[10px] text-ink-muted">
              {packages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "subscriptions"
              ? "border-accent text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Users className="w-4 h-4" />
          User Subscriptions
          {subsData?.meta?.total !== undefined && (
            <span className="ml-1 rounded-full bg-bg-surface border border-border px-1.5 py-0.2 text-[10px] text-ink-muted">
              {subsData.meta.total}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "transactions"
              ? "border-accent text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Transactions &amp; Invoices
          {txnsData?.meta?.total !== undefined && (
            <span className="ml-1 rounded-full bg-bg-surface border border-border px-1.5 py-0.2 text-[10px] text-ink-muted">
              {txnsData.meta.total}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "logs"
              ? "border-accent text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Audit &amp; System Logs
        </button>
      </div>

      {/* TAB 1: PACKAGES & TIERS */}
      {activeTab === "packages" && (
        <>
          {packagesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-md bg-bg-surface border border-border animate-pulse" />
              ))}
            </div>
          ) : !packages || packages.length === 0 ? (
            <Card className="bg-bg-surface border-border-strong text-center py-12">
              <CardContent className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-ink">No Packages Created Yet</h3>
                <p className="text-xs text-ink-muted max-w-md">
                  Create your initial pricing packages or use the preset button to configure standard Free (5 GB), Pro (50 GB @ ₹149), and Premium (200 GB @ ₹499) tiers.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button variant="primary" size="sm" onClick={handleCreateDefaultPresets} disabled={createMut.isPending}>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Initialize Standard Packages
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create Custom
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => {
                const hasRazorpayPlan = !!pkg.razorpay_plan_id;
                const isFree = pkg.price_paise === 0;

                return (
                  <Card 
                    key={pkg.id} 
                    className="bg-bg-surface border-border hover:border-border-strong transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-ink">
                            {pkg.display_name}
                          </CardTitle>
                          <span className="text-[11px] font-mono text-ink-muted">
                            Slug: {pkg.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {pkg.is_active ? (
                            <Badge variant="default" className="text-[10px]">Active</Badge>
                          ) : (
                            <Badge variant="muted" className="text-[10px]">Inactive</Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-ink mono-num">
                            ₹{(pkg.price_paise / 100).toFixed(0)}
                          </span>
                          <span className="text-xs text-ink-muted">/month</span>
                        </div>
                        {!isFree && (
                          <span className="text-[10px] text-ink-muted block mt-0.5">
                            Inclusive of {pkg.gst_rate || 18}% GST
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs text-ink-muted">
                      <p className="text-[12px] leading-relaxed line-clamp-2">
                        {pkg.description || "No description provided."}
                      </p>

                      <div className="space-y-2 border-t border-b border-border/80 py-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-accent" />
                            Storage Quota
                          </span>
                          <strong className="text-ink mono-num">{formatBytes(pkg.storage_limit_bytes)}</strong>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileUp className="w-3.5 h-3.5 text-accent" />
                            Max File Size
                          </span>
                          <strong className="text-ink mono-num">{formatBytes(pkg.max_file_size_bytes)}</strong>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>Sort Priority</span>
                          <strong className="text-ink mono-num">{pkg.sort_order}</strong>
                        </div>
                      </div>

                      <div className="rounded bg-bg/50 p-2 border border-border/50 text-[11px]">
                        <span className="text-ink-muted block mb-0.5">Razorpay Plan Link:</span>
                        {isFree ? (
                          <span className="text-ink-muted">Free Plan (No Razorpay plan required)</span>
                        ) : hasRazorpayPlan ? (
                          <span className="font-mono text-emerald-400 font-semibold break-all">
                            {pkg.razorpay_plan_id}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">
                            Not linked (Will generate on update)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenEdit(pkg)}
                          className="flex-1 text-xs"
                        >
                          <Edit2 className="w-3 h-3 mr-1.5" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(pkg)}
                          className="text-xs text-danger hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: USER SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-bg-surface p-3 rounded-md border border-border">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Search by user email, name, or subscription ID..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label className="text-xs text-ink-muted whitespace-nowrap">Status:</Label>
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="text-xs bg-bg border border-border rounded px-2.5 py-1 text-ink focus:outline-none focus:border-accent"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="authenticated">Authenticated</option>
                <option value="pending">Pending</option>
                <option value="halted">Halted</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          {subsLoading ? (
            <div className="h-64 rounded bg-bg-surface border border-border animate-pulse" />
          ) : filteredSubs.length === 0 ? (
            <div className="text-center py-12 bg-bg-surface border border-border rounded-md">
              <Users className="w-8 h-8 text-ink-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-ink">No subscriptions found</p>
              <p className="text-xs text-ink-muted mt-0.5">Try changing filters or search terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-md bg-bg-surface">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg/60 border-b border-border text-ink-muted font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Subscriber</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Razorpay Sub ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Current Period</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubs.map((sub) => {
                    const isActive = sub.status === "active";
                    const isCancelled = sub.status === "cancelled" || sub.cancel_at_cycle_end;

                    return (
                      <tr key={sub.id} className="hover:bg-bg/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-ink">{sub.user_name || "User"}</div>
                          <div className="text-[11px] text-ink-muted font-mono">{sub.user_email || sub.user_id}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-medium text-ink">{sub.package?.display_name || "Custom"}</div>
                          <div className="text-[11px] text-ink-muted">
                            {formatBytes(sub.package?.storage_limit_bytes || 0)}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-ink-muted">
                          {sub.razorpay_subscription_id ? (
                            <span className="text-accent">{sub.razorpay_subscription_id}</span>
                          ) : (
                            <span className="text-ink-muted italic">Manual / No Gateway</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              sub.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : sub.status === "cancelled" || sub.status === "halted"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {sub.status.toUpperCase()}
                          </span>
                          {sub.cancel_at_cycle_end && (
                            <span className="block text-[10px] text-amber-400 mt-0.5">
                              Cancels at cycle end
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-[11px] text-ink-muted">
                          <div>
                            Start: {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : "—"}
                          </div>
                          <div>
                            End: {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCancellingSub(sub)}
                              className="text-[11px] text-danger hover:bg-danger/10 hover:text-danger h-7"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Force Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRANSACTIONS & INVOICES */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          {txnsLoading ? (
            <div className="h-64 rounded bg-bg-surface border border-border animate-pulse" />
          ) : !txnsData || txnsData.data?.length === 0 ? (
            <div className="text-center py-12 bg-bg-surface border border-border rounded-md">
              <Receipt className="w-8 h-8 text-ink-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-ink">No transactions recorded</p>
              <p className="text-xs text-ink-muted mt-0.5">Charges and recurring payments will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-md bg-bg-surface">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg/60 border-b border-border text-ink-muted font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Subscriber</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Payment Gateway ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {txnsData.data.map((txn) => (
                    <tr key={txn.id} className="hover:bg-bg/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-ink">
                        {txn.invoice_number || "BV-INV-PENDING"}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-ink font-mono text-[11px]">{txn.user_email || txn.user_id}</span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink mono-num">
                          ₹{(txn.total_paise / 100).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          (Base: ₹{(txn.amount_paise / 100).toFixed(2)} + GST: ₹{(txn.tax_paise / 100).toFixed(2)})
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-ink-muted">
                        {txn.razorpay_payment_id || "—"}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            txn.status === "captured"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : txn.status === "failed"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {txn.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-ink-muted whitespace-nowrap">
                        {new Date(txn.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTxn(txn)}
                          className="text-[11px] h-7"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT & SYSTEM LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-5">
          {/* Server Daily Log Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-bg-surface border-border p-4">
              <div className="flex items-center gap-2 mb-2 text-accent">
                <Server className="w-4 h-4" />
                <h4 className="text-xs font-semibold text-ink">Active Daily File Log</h4>
              </div>
              <p className="font-mono text-xs text-emerald-400 font-semibold">{todayStr}.app.log</p>
              <p className="text-[11px] text-ink-muted mt-1">
                Rotates at midnight UTC. Written as structured JSON lines.
              </p>
            </Card>

            <Card className="bg-bg-surface border-border p-4">
              <div className="flex items-center gap-2 mb-2 text-accent">
                <HardDrive className="w-4 h-4" />
                <h4 className="text-xs font-semibold text-ink">Server Retention</h4>
              </div>
              <p className="font-semibold text-xs text-ink">30 Days (1 Month)</p>
              <p className="text-[11px] text-ink-muted mt-1">
                Files from the last 30 days are retained locally on the server filesystem.
              </p>
            </Card>

            <Card className="bg-bg-surface border-border p-4">
              <div className="flex items-center gap-2 mb-2 text-accent">
                <Cloud className="w-4 h-4" />
                <h4 className="text-xs font-semibold text-ink">Cloudflare R2 Archival</h4>
              </div>
              <p className="font-semibold text-xs text-ink">Compressed (.app.log.gz)</p>
              <p className="text-[11px] text-ink-muted mt-1">
                Logs older than 30 days are compressed with gzip and archived to R2 cold storage.
              </p>
            </Card>
          </div>

          {/* Audit Logs Table */}
          {logsLoading ? (
            <div className="h-64 rounded bg-bg-surface border border-border animate-pulse" />
          ) : !logsData || logsData.data?.length === 0 ? (
            <div className="text-center py-12 bg-bg-surface border border-border rounded-md">
              <ScrollText className="w-8 h-8 text-ink-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-ink">No audit logs recorded</p>
              <p className="text-xs text-ink-muted mt-0.5">Webhook events and lifecycle actions will stream here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-md bg-bg-surface">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg/60 border-b border-border text-ink-muted font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">User ID</th>
                    <th className="py-2.5 px-3 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logsData.data.map((logItem) => (
                    <tr key={logItem.id} className="hover:bg-bg/30 transition-colors">
                      <td className="py-2.5 px-3 text-[11px] text-ink-muted whitespace-nowrap">
                        {new Date(logItem.created_at).toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-ink">
                        {logItem.event_type}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="capitalize text-[11px] text-ink-muted">{logItem.event_source}</span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            logItem.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {logItem.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-ink-muted">
                        {logItem.user_id ? logItem.user_id.slice(0, 12) + "..." : "—"}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLogPayload(logItem.payload)}
                          className="text-[11px] h-6 px-2"
                        >
                          <Code className="w-3 h-3 mr-1" />
                          JSON
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* System Log Lifecycle Archives (Daily DD-MM-YYYY.app.log Files) */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-accent" />
                  Unified Daily Log Files (Server &amp; Cloudflare R2)
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  All service logs and subscription audit events write into the unified daily file. Tracks 30-day server retention and R2 cold storage.
                </p>
              </div>
            </div>

            {systemLogsLoading ? (
              <div className="h-32 rounded bg-bg-surface border border-border animate-pulse" />
            ) : !systemLogsData || !systemLogsData.data || systemLogsData.data.length === 0 ? (
              <div className="p-4 bg-bg-surface border border-border rounded text-center text-xs text-ink-muted">
                No archived log records found in database. Today&apos;s active log is currently writing to <span className="font-mono text-ink">{todayStr}.app.log</span>.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-md bg-bg-surface">
                <table className="w-full text-xs text-left">
                  <thead className="bg-bg/60 border-b border-border text-ink-muted font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Log File</th>
                      <th className="py-2.5 px-3">Storage Location</th>
                      <th className="py-2.5 px-3">Raw Size</th>
                      <th className="py-2.5 px-3">Compressed</th>
                      <th className="py-2.5 px-3">Storage Path / Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {systemLogsData.data.map((archive) => (
                      <tr key={archive.id} className="hover:bg-bg/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-ink">
                          {archive.log_date}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-accent">
                          {archive.file_name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              archive.storage_location === "local"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : archive.storage_location === "r2"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                            }`}
                          >
                            {archive.storage_location === "local" ? "Local Server" : archive.storage_location === "r2" ? "Cloudflare R2" : "Purged (>180d)"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-ink-muted">
                          {(archive.file_size_bytes / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-ink-muted">
                          {archive.compressed_size_bytes ? `${(archive.compressed_size_bytes / 1024).toFixed(1)} KB` : "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-ink-faint truncate max-w-xs">
                          {archive.storage_key || archive.local_path || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create / Edit Package */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {isEditing ? "Edit Subscription Package" : "Create New Subscription Package"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Package Identifier (Slug)</Label>
                <Input
                  id="name"
                  placeholder="e.g. pro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isEditing}
                  required
                />
                <span className="text-[10px] text-ink-muted">Lowercase internal ID (e.g. pro, premium)</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="display_name">Display Title</Label>
                <Input
                  id="display_name"
                  placeholder="e.g. Pro Tier"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Plan Description</Label>
              <Input
                id="description"
                placeholder="Short summary of this tier"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="storage_gb">Total Storage Limit (GB)</Label>
                <Input
                  id="storage_gb"
                  type="number"
                  min="1"
                  value={formData.storage_gb}
                  onChange={(e) => setFormData({ ...formData, storage_gb: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max_file_gb">Max Single File Upload (GB)</Label>
                <Input
                  id="max_file_gb"
                  type="number"
                  min="1"
                  value={formData.max_file_gb}
                  onChange={(e) => setFormData({ ...formData, max_file_gb: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price_inr">Price (INR)</Label>
                <Input
                  id="price_inr"
                  type="number"
                  min="0"
                  placeholder="0 for Free"
                  value={formData.price_inr}
                  onChange={(e) => setFormData({ ...formData, price_inr: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gst_rate">GST %</Label>
                <Input
                  id="gst_rate"
                  type="number"
                  value={formData.gst_rate}
                  onChange={(e) => setFormData({ ...formData, gst_rate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="1"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>

            {formData.price_inr > 0 && (
              <div className="rounded-md bg-accent/10 p-3 border border-accent/20 flex items-start gap-2 text-ink-muted">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink text-[11px]">Automatic Razorpay Integration</p>
                  <p className="text-[10px] leading-relaxed">
                    Saving this package will automatically invoke Razorpay's Subscriptions API to register this plan for monthly recurring billing.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                size="sm" 
                disabled={createMut.isPending || updateMut.isPending}
              >
                {createMut.isPending || updateMut.isPending ? "Syncing with Razorpay..." : isEditing ? "Save Changes" : "Create & Sync"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Assign Subscription to User */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-accent" />
              Manual Subscription Assignment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            <p className="text-ink-muted text-[11px]">
              Directly assign a subscription package to a user without requiring gateway payment.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="assign_user_id">User UUID</Label>
              <Input
                id="assign_user_id"
                placeholder="Paste User UUID"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign_pkg">Package</Label>
              <select
                id="assign_pkg"
                value={assignPackageId}
                onChange={(e) => setAssignPackageId(e.target.value)}
                className="w-full text-xs bg-bg border border-border rounded px-2.5 py-2 text-ink focus:outline-none focus:border-accent"
                required
              >
                {packages?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} ({formatBytes(p.storage_limit_bytes)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign_days">Validity Duration (Days)</Label>
              <Input
                id="assign_days"
                type="number"
                min="1"
                value={assignDays}
                onChange={(e) => setAssignDays(Number(e.target.value))}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={assignSubMut.isPending}>
                {assignSubMut.isPending ? "Assigning..." : "Assign Package"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Force Cancel Confirmation */}
      <Dialog open={!!cancellingSub} onOpenChange={() => setCancellingSub(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              Force Cancel Subscription
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs text-ink-muted">
            <p>
              Are you sure you want to force-cancel the subscription for:
            </p>
            <div className="p-3 bg-bg border border-border rounded">
              <p className="font-semibold text-ink">{cancellingSub?.user_name || "User"}</p>
              <p className="font-mono text-[11px]">{cancellingSub?.user_email || cancellingSub?.user_id}</p>
              <p className="text-[11px] mt-1 text-accent">Plan: {cancellingSub?.package?.display_name}</p>
            </div>
            <p className="text-danger font-medium text-[11px]">
              This will immediately cancel recurring billing with Razorpay and revert the user to the Free package.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setCancellingSub(null)}>
              Abort
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceCancel}
              disabled={cancelSubMut.isPending}
              className="bg-danger/10 text-danger hover:bg-danger/20 border-danger/30"
            >
              {cancelSubMut.isPending ? "Cancelling..." : "Confirm Force Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Invoice Preview */}
      <Dialog open={!!selectedTxn} onOpenChange={() => setSelectedTxn(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center justify-between">
              <span>Invoice {selectedTxn?.invoice_number || "Preview"}</span>
              <a
                href={`/api/v1/subscription/invoices/${selectedTxn?.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open / Print
              </a>
            </DialogTitle>
          </DialogHeader>

          {selectedTxn && (
            <div className="border border-border rounded p-4 bg-bg text-xs space-y-4">
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">ByteVault</h2>
                  <p className="text-ink-muted text-[11px]">PushPort Secure Storage Services</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-ink">{selectedTxn.invoice_number}</p>
                  <p className="text-ink-muted text-[11px]">{new Date(selectedTxn.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-ink-muted text-[11px] uppercase font-semibold">Billed To</p>
                  <p className="font-mono text-ink text-[11px]">{selectedTxn.user_email || selectedTxn.user_id}</p>
                </div>
                <div>
                  <p className="text-ink-muted text-[11px] uppercase font-semibold">Payment Reference</p>
                  <p className="font-mono text-ink text-[11px]">{selectedTxn.razorpay_payment_id || "Direct Entry"}</p>
                </div>
              </div>

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-bg-surface border-b border-border">
                    <tr>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="p-2">ByteVault Subscription Tier ({selectedTxn.package_name || "Storage"})</td>
                      <td className="p-2 text-right mono-num">₹{(selectedTxn.amount_paise / 100).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-2">GST (18%)</td>
                      <td className="p-2 text-right mono-num">₹{(selectedTxn.tax_paise / 100).toFixed(2)}</td>
                    </tr>
                    <tr className="font-bold bg-bg-surface">
                      <td className="p-2">Total Paid</td>
                      <td className="p-2 text-right mono-num text-emerald-400">₹{(selectedTxn.total_paise / 100).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: JSON Payload Inspector */}
      <Dialog open={!!selectedLogPayload} onOpenChange={() => setSelectedLogPayload(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Code className="w-4 h-4 text-accent" />
              Event Payload JSON
            </DialogTitle>
          </DialogHeader>

          <pre className="p-3 rounded bg-bg border border-border text-[11px] font-mono text-ink-muted overflow-x-auto max-h-[60vh]">
            {JSON.stringify(selectedLogPayload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
