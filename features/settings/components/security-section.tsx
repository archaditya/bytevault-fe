"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsGoogleLogin(localStorage.getItem("login_provider") === "google");
    }
  }, []);

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

    setSaving(true);
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
      setSaving(false);
    }
  };

  if (isGoogleLogin) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-[14px] font-medium text-ink mb-2">Change password</h3>
            <p className="text-[13px] text-ink-muted leading-relaxed">
              Your account is authenticated via Google. Password changes are managed through Google.
              If you wish to set a local password, please log out and use the "Forgot Password" option on the login page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Card>
        <CardContent>
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
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
