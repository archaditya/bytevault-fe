import { create } from "zustand";
import { User } from "@/types";
import { apiClient, setTokens, getAccessToken } from "@/lib/api-client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export function mapBackendUserToFrontend(backendUser: any): User {
  const firstName = backendUser.first_name || "";
  const lastName = backendUser.last_name || "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || backendUser.email;

  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() ||
    backendUser.email.slice(0, 2).toUpperCase();

  return {
    id: backendUser.id,
    name: fullName,
    email: backendUser.email,
    avatar: initials,
    avatarUrl: backendUser.avatar_url
      ? backendUser.avatar_url.startsWith("http")
        ? backendUser.avatar_url
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/users/${backendUser.id}/avatar?t=${new Date(backendUser.updated_at || "").getTime()}`
      : null,
    role: backendUser.role || "user",
    plan: "free",
    joinedAt: backendUser.created_at || new Date().toISOString(),
    apiKeysCount: 0,
    twoFactorEnabled: false,
    hasPassword: backendUser.has_password,
    isVerified: backendUser.is_verified,
  };
}

async function registerPushTokenIfAvailable() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Skip if VAPID key is not configured in .env to prevent browser exceptions
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn(
        "FCM token registration skipped: NEXT_PUBLIC_FIREBASE_VAPID_KEY is not defined in .env",
      );
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Load Firebase messaging dynamically
    const { getToken } = await import("firebase/messaging");
    const { messaging } = await import("../lib/firebase");

    if (!messaging) return;

    // Register Service Worker explicitly with matching credentials
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "";
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""; // Fixed name mismatch

    const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(apiKey)}&authDomain=${encodeURIComponent(authDomain)}&projectId=${encodeURIComponent(projectId)}&storageBucket=${encodeURIComponent(storageBucket)}&messagingSenderId=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "")}&appId=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "")}`;

    const registration = await navigator.serviceWorker.register(swUrl);

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey,
    });

    if (token) {
      await apiClient("/api/v1/push-tokens", {
        method: "POST",
        body: JSON.stringify({ token, device_type: "web" }),
      });
    }
  } catch (err) {
    // Silent fail — FCM is optional, don't block auth flow
    console.warn("FCM token registration skipped:", err);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.tokens);
      if (typeof window !== "undefined") {
        localStorage.setItem("login_provider", "email");
      }
      const frontendUser = mapBackendUserToFrontend(data.user);
      set({ user: frontendUser, isAuthenticated: true, isLoading: false });

      // Auto-register FCM push token if available
      registerPushTokenIfAvailable();
    } catch (err: any) {
      set({ error: err.message || "Login failed", isLoading: false });
      throw err;
    }
  },

  register: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });
      setTokens(data.tokens);
      if (typeof window !== "undefined") {
        localStorage.setItem("login_provider", "email");
      }
      const frontendUser = mapBackendUserToFrontend(data.user);
      set({ user: frontendUser, isAuthenticated: true, isLoading: false });

      registerPushTokenIfAvailable();
    } catch (err: any) {
      set({ error: err.message || "Registration failed", isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiClient("/api/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setTokens(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("login_provider");
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },

  checkSession: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const data = await apiClient("/api/v1/me");
      const frontendUser = mapBackendUserToFrontend(data.user);
      set({ user: frontendUser, isAuthenticated: true, isLoading: false });
      registerPushTokenIfAvailable();
    } catch (err) {
      console.error("Session verification failed:", err);
      setTokens(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
