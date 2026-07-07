"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import { PasswordInput } from "@/components/ui/password-input";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !otp || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiClient("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          otp,
          password,
        }),
      });
      toast.success("Password reset successfully! Please sign in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(
        err.message ||
          "Failed to reset password. Please verify the code and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border-strong bg-bg-surface">
      <CardHeader className="flex flex-col items-center gap-2 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-accent mb-2">
          <Box className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-ink">
          Choose a new password
        </CardTitle>
        <p className="text-[13px] text-ink-muted text-center max-w-sm">
          Enter the verification code sent to your email and choose a strong new
          password.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || !!searchParams.get("email")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="otp">Verification Code (OTP)</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <PasswordInput
              id="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full text-[13px]"
            variant="primary"
            size="md"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset password"}
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="border border-border-strong bg-bg-surface p-8 text-center text-sm text-ink-muted">
          Loading reset form...
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
