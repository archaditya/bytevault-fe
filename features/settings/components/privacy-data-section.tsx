"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Trash2, Shield, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

export function PrivacyDataSection() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [downloading, setDownloading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Marketing consent state
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [updatingConsent, setUpdatingConsent] = useState(false);

  useEffect(() => {
    // Fetch user consents from backend
    apiClient("/api/v1/me/consents")
      .then((data: any) => {
        const consents = data?.consents || [];
        const m = consents.find((c: any) => c.consent_type === "marketing" && c.status === "granted");
        setMarketingConsent(Boolean(m));
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/v1/me/export", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error("Failed to export personal data");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bytevault-data-export-${user?.id || "me"}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Your data export has downloaded successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to download data");
    } finally {
      setDownloading(false);
    }
  };

  const handleToggleMarketing = async (checked: boolean) => {
    setUpdatingConsent(true);
    try {
      await apiClient("/api/v1/auth/consent", {
        method: "POST",
        body: JSON.stringify({
          consent_type: "marketing",
          version: "2026.1",
          status: checked ? "granted" : "revoked",
        }),
      });
      setMarketingConsent(checked);
      toast.success(checked ? "Subscribed to product updates." : "Revoked marketing communications.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update consent preferences");
    } finally {
      setUpdatingConsent(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmationText.trim().toLowerCase() !== "delete my account") {
      toast.error("Please type 'delete my account' to confirm.");
      return;
    }

    setDeleting(true);
    try {
      await apiClient("/api/v1/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      toast.success("Your account and all files have been permanently erased.");
      await logout();
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Account deletion failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Overview Card */}
      <Card className="bg-bg-surface border-border-strong text-ink">
        <CardHeader>
          <div className="flex items-center gap-2 text-accent">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">Data Protection &amp; Privacy Rights</CardTitle>
          </div>
          <p className="text-xs text-ink-muted">
            Manage your statutory rights under India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act).
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-[13px]">
          <div className="p-3.5 rounded-md bg-bg border border-border flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                Right to Access &amp; Summary (&sect;11)
              </p>
              <p className="text-xs text-ink-muted">
                Download a machine-readable JSON archive containing your account profile, device tokens, active consents, and file manifest.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownloadData}
              disabled={downloading}
              className="shrink-0 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {downloading ? "Exporting..." : "Download My Data"}
            </Button>
          </div>

          <div className="p-3.5 rounded-md bg-bg border border-border flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-ink flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Optional Communications Consent
              </p>
              <p className="text-xs text-ink-muted">
                Receive release notes, feature highlights, and occasional announcements. You can revoke this at any time without affecting storage service.
              </p>
            </div>
            <div className="pt-1">
              <input
                type="checkbox"
                checked={marketingConsent}
                disabled={updatingConsent}
                onChange={(e) => handleToggleMarketing(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-accent focus:ring-accent accent-accent cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone: Account Erasure */}
      <Card className="bg-bg-surface border-danger/40 text-ink">
        <CardHeader>
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base font-semibold text-danger">Danger Zone: Permanent Account Erasure</CardTitle>
          </div>
          <p className="text-xs text-ink-muted">
            Exercise your statutory Right to Erasure (&ldquo;Delete when done&rdquo; under DPDP Act &sect;12).
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-[13px]">
          <p className="text-xs text-ink-muted leading-relaxed">
            Deleting your account will permanently wipe your profile, terminate your active sessions, revoke subscriptions, and <strong className="text-ink">irreversibly delete all files and folders</strong> stored in Cloudflare R2 storage. This action cannot be reversed.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs mt-2"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete Account &amp; Wipe Data
          </Button>
        </CardContent>
      </Card>

      {/* Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="bg-bg-surface border border-danger/40 max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-semibold text-danger flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Account?
            </h3>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              This will permanently purge your user account, revoke active sessions, and immediately delete all your uploaded files from storage servers.
            </p>

            <form onSubmit={handleDeleteAccount} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="delPassword">Account Password</Label>
                <Input
                  id="delPassword"
                  type="password"
                  placeholder="Enter your current password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={deleting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="delConfirm">
                  Type <span className="font-mono text-danger font-bold">&quot;delete my account&quot;</span> to confirm:
                </Label>
                <Input
                  id="delConfirm"
                  placeholder="delete my account"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  disabled={deleting}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={deleting || deleteConfirmationText.toLowerCase() !== "delete my account"}
                  className="text-xs"
                >
                  {deleting ? "Erasing all data..." : "Confirm Permanent Deletion"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
