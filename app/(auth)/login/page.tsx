"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, mapBackendUserToFrontend } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient, setTokens } from "@/lib/api-client";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);

      const currentUser = useAuthStore.getState().user;
      if (currentUser && !currentUser.isVerified) {
        toast.success("Please verify your email address.");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        toast.success("Successfully logged in!");
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
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
          Sign in to ByteVault
        </CardTitle>
        <p className="text-[13px] text-ink-muted">
          Enter your credentials to access your storage
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
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-accent hover:underline hover:text-accent-bright"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          {/* Google OAuth */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-bg-surface px-2 text-ink-faint">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              // Load Google Sign-In dynamically
              const { signInWithPopup, GoogleAuthProvider } =
                await import("firebase/auth");
              const { auth } = await import("../../../lib/firebase");
              try {
                const result = await signInWithPopup(
                  auth,
                  new GoogleAuthProvider(),
                );
                const credential =
                  GoogleAuthProvider.credentialFromResult(result);
                const idToken = credential?.idToken;
                if (!idToken) {
                  throw new Error(
                    "Google ID token not found in authentication credentials.",
                  );
                }

                // Extract profile details from Firebase user info
                const displayName = result.user.displayName || "";
                const parts = displayName.split(" ");
                const firstName = parts[0] || "";
                const lastName = parts.slice(1).join(" ") || "";
                const avatarURL = result.user.photoURL || "";

                const data = await apiClient("/api/v1/auth/google", {
                  method: "POST",
                  body: JSON.stringify({
                    id_token: idToken,
                    first_name: firstName,
                    last_name: lastName,
                    avatar_url: avatarURL,
                  }),
                });

                setTokens(data.tokens);
                if (typeof window !== "undefined") {
                  localStorage.setItem("login_provider", "google");
                }
                const frontendUser = mapBackendUserToFrontend(data.user);
                useAuthStore.getState().setUser(frontendUser);
                router.push("/dashboard");
              } catch (err: any) {
                toast.error(err.message || "Google login failed");
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </form>
        <div className="mt-4 text-center text-[12px] text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-accent hover:underline hover:text-accent-bright"
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
