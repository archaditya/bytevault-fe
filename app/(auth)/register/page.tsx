"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box } from "lucide-react";
import toast from "react-hot-toast";
import { PasswordInput } from "@/components/ui/password-input";

import { Suspense } from "react";

function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const register = useAuthStore((s) => s.register);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the Terms of Service and Privacy Policy to register.");
      return;
    }

    if (!isAdult) {
      toast.error("You must confirm you are 18 years or older under DPDP Act requirements.");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName, lastName, {
        termsAccepted,
        isAdult,
        marketingAccepted,
      });
      toast.success(
        "Account created! Please check your email for the verification code.",
      );
      router.push(`/verify-email?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border-strong bg-bg-surface">
      <CardHeader className="flex flex-col items-center gap-2 pb-6">
        <Image src="/PushPostVault-logo-dark.svg" alt="" width={40} height={40} className="mb-2 h-20 w-60 object-contain" />
        <CardTitle className="text-xl font-bold tracking-tight text-ink">
          Create an account
        </CardTitle>
        <p className="text-[13px] text-ink-muted">
          Create an account to send and manage your files
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="pt-2 space-y-3 text-[12px]">
            <label className="flex items-start gap-2.5 cursor-pointer text-ink-muted hover:text-ink">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-strong text-accent focus:ring-accent accent-accent"
                required
              />
              <span className="leading-tight">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-ink underline hover:text-accent">
                  Terms of Service
                </Link>
                ,{" "}
                <Link href="/privacy" target="_blank" className="text-ink underline hover:text-accent">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link href="/subscription-policy" target="_blank" className="text-ink underline hover:text-accent">
                  Subscription Policy
                </Link>
                . <span className="text-danger">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-ink-muted hover:text-ink">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-strong text-accent focus:ring-accent accent-accent"
                required
              />
              <span className="leading-tight">
                I confirm that I am 18 years of age or older (DPDP Act, 2023 requirement). <span className="text-danger">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-ink-muted hover:text-ink">
              <input
                type="checkbox"
                checked={marketingAccepted}
                onChange={(e) => setMarketingAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-strong text-accent focus:ring-accent accent-accent"
              />
              <span className="leading-tight text-ink-faint">
                (Optional) Keep me updated with service announcements and product releases.
              </span>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full text-[13px] mt-2"
            variant="primary"
            size="md"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <div className="mt-4 text-center text-[12px] text-ink-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-accent hover:underline hover:text-accent-bright font-medium"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegisterPageWrapped() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-ink-muted">Loading...</div>}>
      <RegisterPage />
    </Suspense>
  );
}