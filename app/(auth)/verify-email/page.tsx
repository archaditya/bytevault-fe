"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store";
import { setTokens } from "@/lib/api-client";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const { checkSession } = useAuthStore();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      toast.error("Invalid verification session");
      router.push("/register");
    }
  }, [email, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input field
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient("/api/v1/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, otp: otpCode }),
      });

      toast.success("Email verified successfully!");
      
      // Save access/refresh tokens to authenticate user session directly
      if (response.tokens) {
        setTokens(response.tokens);
      }
      
      await checkSession();
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await apiClient("/api/v1/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("Verification code resent!");
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md bg-bg-surface border-border-strong text-ink">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold text-center">Verify your email</CardTitle>
          <div className="text-center text-ink-muted">
            We sent a verification code to <span className="text-ink font-medium">{email}</span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-12 w-12 text-center text-lg font-semibold rounded-lg border border-border bg-bg/50 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
                />
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-ink-muted">Didn't receive code? </span>
              {countdown > 0 ? (
                <span className="text-ink-faint">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-accent hover:underline hover:text-accent-bright font-medium"
                >
                  {resending ? "Resending..." : "Resend code"}
                </button>
              )}
            </div>

            <div className="flex justify-center border-t border-border pt-4">
              <Link
                href="/login"
                className="inline-flex items-center text-xs text-ink-muted hover:text-ink transition gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
