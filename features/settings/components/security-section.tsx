"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store";
import toast from "react-hot-toast";

export function SecuritySection() {
  const user = useAuthStore((s) => s.user);
  const checkSession = useAuthStore((s) => s.checkSession);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // MFA State
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; qr_uri: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);

  useEffect(() => {
    checkSession();
    if (typeof window !== "undefined") {
      setIsGoogleLogin(localStorage.getItem("login_provider") === "google");
    }
  }, [checkSession]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient("/api/v1/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  // Step 1: Request MFA Secret & QR Code
  const handleStartMFASetup = async () => {
    setMfaLoading(true);
    try {
      const data = await apiClient("/api/v1/auth/mfa/setup", {
        method: "POST",
      });
      setMfaSetup(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize 2FA setup");
    } finally {
      setMfaLoading(false);
    }
  };

  // Step 2: Confirm 6-digit TOTP code to Enable 2FA
  const handleEnableMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setMfaLoading(true);
    try {
      await apiClient("/api/v1/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ code: totpCode }),
      });
      toast.success("Two-Factor Authentication enabled successfully!");
      setMfaSetup(null);
      setTotpCode("");
      await checkSession();
    } catch (err: any) {
      toast.error(err.message || "Invalid 2FA code");
    } finally {
      setMfaLoading(false);
    }
  };

  // Step 3: Disable 2FA
  const handleDisableMFA = async () => {
    const code = prompt("Enter your 6-digit Authenticator code to confirm disabling 2FA:");
    if (!code) return;

    setMfaLoading(true);
    try {
      await apiClient("/api/v1/auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      toast.success("Two-Factor Authentication disabled");
      await checkSession();
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA");
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {/* 2FA / MFA Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-medium text-ink">Two-Factor Authentication (2FA)</h3>
                <p className="text-[13px] text-ink-muted mt-0.5">
                  Add an extra layer of security using Google Authenticator or Authy.
                </p>
              </div>
              <span
                className={`text-[12px] px-2 py-0.5 rounded font-medium ${
                  user?.twoFactorEnabled
                    ? "bg-green-500/10 text-green-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {user?.twoFactorEnabled ? (
              <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                <p className="text-[13px] text-ink-muted">
                  Your account is protected with 2FA.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDisableMFA}
                  disabled={mfaLoading}
                >
                  Disable 2FA
                </Button>
              </div>
            ) : mfaSetup ? (
              <form onSubmit={handleEnableMFA} className="flex flex-col gap-4 border-t border-border pt-4 mt-2">
                <div className="flex flex-col gap-2 items-center text-center">
                  <p className="text-[13px] text-ink font-medium">
                    1. Scan this QR Code in Google Authenticator or Authy:
                  </p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      mfaSetup.qr_uri
                    )}`}
                    alt="2FA QR Code"
                    className="w-44 h-44 rounded border border-border p-2 bg-white"
                  />
                  <p className="text-[12px] text-ink-muted">
                    Manual key: <code className="bg-bg-subtle px-1.5 py-0.5 rounded font-mono text-ink">{mfaSetup.secret}</code>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="totp-code">2. Enter 6-digit code from app:</Label>
                  <Input
                    id="totp-code"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="font-mono text-center tracking-widest text-lg"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMfaSetup(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={mfaLoading}>
                    {mfaLoading ? "Verifying..." : "Verify & Enable 2FA"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end border-t border-border pt-4 mt-2">
                <Button
                  size="sm"
                  onClick={handleStartMFASetup}
                  disabled={mfaLoading}
                >
                  {mfaLoading ? "Loading..." : "Enable 2FA"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      {!isGoogleLogin && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <h3 className="text-[14px] font-medium text-ink">Change password</h3>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
